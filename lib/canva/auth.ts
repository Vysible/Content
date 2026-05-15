import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto/aes'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

export const CANVA_AUTHORIZE_URL = 'https://www.canva.com/api/oauth/authorize'
export const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token'
export const CANVA_SCOPE = 'asset:read design:content:read'

// 5-Minuten-Puffer vor Token-Ablauf → vorzeitiger Refresh, um Race-Conditions zu vermeiden
const REFRESH_BUFFER_MS = 5 * 60 * 1_000

interface CanvaTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type?: string
  scope?: string
}

function requireClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.CANVA_CLIENT_ID
  const clientSecret = process.env.CANVA_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('CANVA_CLIENT_ID / CANVA_CLIENT_SECRET fehlen in der Umgebung')
  }
  return { clientId, clientSecret }
}

function getRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL
  if (!base) {
    throw new Error('NEXTAUTH_URL muss gesetzt sein für Canva-OAuth-Redirect')
  }
  return `${base.replace(/\/$/, '')}/api/canva/oauth/callback`
}

/** Baut die Authorize-URL für den OAuth-Flow (vom /api/canva/oauth Handler genutzt). */
export function buildAuthorizeUrl(state: string): string {
  const { clientId } = requireClientCredentials()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: CANVA_SCOPE,
    state,
  })
  return `${CANVA_AUTHORIZE_URL}?${params.toString()}`
}

/** Tauscht einen Auth-Code gegen Access-/Refresh-Token. Wird vom Callback-Handler verwendet. */
export async function exchangeCodeForToken(code: string): Promise<CanvaTokenResponse> {
  const { clientId, clientSecret } = requireClientCredentials()

  return withRetry(async () => {
    const res = await fetch(CANVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getRedirectUri(),
      }),
    })

    if (!res.ok) {
      const detail = await safeReadError(res)
      throw new Error(`Canva-Token-Exchange fehlgeschlagen: HTTP ${res.status} ${detail}`)
    }

    return (await res.json()) as CanvaTokenResponse
  }, 'canva.token_exchange')
}

/** Speichert (Upsert) das Token-Paar verschlüsselt in der DB. */
export async function persistCanvaToken(
  userId: string,
  token: CanvaTokenResponse,
): Promise<void> {
  if (!token.refresh_token) {
    throw new Error('Canva-Token-Response enthält keinen refresh_token')
  }

  const expiresAt = new Date(Date.now() + token.expires_in * 1_000)
  const encryptedAccessToken = encrypt(token.access_token)
  const encryptedRefreshToken = encrypt(token.refresh_token)
  const scope = token.scope ?? CANVA_SCOPE

  await prisma.canvaToken.upsert({
    where: { userId },
    update: { encryptedAccessToken, encryptedRefreshToken, expiresAt, scope },
    create: { userId, encryptedAccessToken, encryptedRefreshToken, expiresAt, scope },
  })

  logger.info({ userId, expiresAt }, '[Vysible] Canva-Token gespeichert')
}

/**
 * Gibt einen gültigen Access-Token zurück.
 * Refresht automatisch, wenn `expiresAt < now + 5min`.
 * Wirft, wenn der User nicht verbunden ist oder der Refresh fehlschlägt.
 */
export async function getValidCanvaToken(userId: string): Promise<string> {
  const stored = await prisma.canvaToken.findUnique({ where: { userId } })
  if (!stored) throw new Error('Canva nicht verbunden — bitte zuerst /settings/canva aufrufen')

  const needsRefresh = stored.expiresAt.getTime() < Date.now() + REFRESH_BUFFER_MS
  if (!needsRefresh) {
    return decrypt(stored.encryptedAccessToken)
  }

  const { clientId, clientSecret } = requireClientCredentials()
  const refreshToken = decrypt(stored.encryptedRefreshToken)

  const refreshed = await withRetry(async () => {
    const res = await fetch(CANVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!res.ok) {
      const detail = await safeReadError(res)
      throw new Error(`Canva-Token-Refresh fehlgeschlagen: HTTP ${res.status} ${detail}`)
    }

    return (await res.json()) as CanvaTokenResponse
  }, 'canva.token_refresh')

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1_000)
  await prisma.canvaToken.update({
    where: { userId },
    data: {
      encryptedAccessToken: encrypt(refreshed.access_token),
      ...(refreshed.refresh_token
        ? { encryptedRefreshToken: encrypt(refreshed.refresh_token) }
        : {}),
      expiresAt: newExpiresAt,
    },
  })

  logger.info({ userId, expiresAt: newExpiresAt }, '[Vysible] Canva-Token refreshed')
  return refreshed.access_token
}

/** Prüft ob ein User aktuell mit Canva verbunden ist (Existenz, nicht Token-Gültigkeit). */
export async function isCanvaConnected(userId: string): Promise<boolean> {
  const stored = await prisma.canvaToken.findUnique({
    where: { userId },
    select: { id: true },
  })
  return !!stored
}

/** Status für die Settings-Seite — ohne Klartext-Token. */
export async function getCanvaConnectionStatus(
  userId: string,
): Promise<{ connected: false } | { connected: true; expiresAt: Date; scope: string }> {
  const stored = await prisma.canvaToken.findUnique({
    where: { userId },
    select: { expiresAt: true, scope: true },
  })
  if (!stored) return { connected: false }
  return { connected: true, expiresAt: stored.expiresAt, scope: stored.scope }
}

/** Entfernt die Canva-Verbindung. Token-Revoke bei Canva ist optional (out of scope). */
export async function disconnectCanva(userId: string): Promise<void> {
  await prisma.canvaToken.deleteMany({ where: { userId } })
  logger.info({ userId }, '[Vysible] Canva-Verbindung entfernt')
}

/**
 * Liest den Fehlertext aus einer fehlgeschlagenen Response, ohne sensible Daten zu leaken.
 * Beschränkt auf 200 Zeichen, damit Token-Echos in Fehlern nicht im Log landen.
 */
async function safeReadError(res: Response): Promise<string> {
  try {
    const text = await res.text()
    return text.slice(0, 200)
  } catch {
    return '(kein Body)'
  }
}
