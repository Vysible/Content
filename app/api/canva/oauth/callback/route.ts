import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { exchangeCodeForToken, persistCanvaToken } from '@/lib/canva/auth'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'canva_oauth_state'
const VERIFIER_COOKIE = 'canva_oauth_verifier'

/** Gibt die öffentliche Basis-URL zurück (NEXTAUTH_URL bevorzugt, da req.url in Docker intern ist). */
function publicBase(): string {
  return (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
}

/** Canva-OAuth-Callback: prüft State (CSRF), tauscht Code + Verifier gegen Token, persistiert. */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(`${publicBase()}/login`)
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateFromQuery = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  const cookieStore = cookies()
  const stateFromCookie = cookieStore.get(STATE_COOKIE)?.value
  const codeVerifier = cookieStore.get(VERIFIER_COOKIE)?.value
  // Single-use: beide Cookies sofort löschen
  cookieStore.delete(STATE_COOKIE)
  cookieStore.delete(VERIFIER_COOKIE)

  if (oauthError) {
    logger.warn({ userId: session.user.id, oauthError }, '[Vysible] Canva-OAuth vom Benutzer abgebrochen')
    return NextResponse.redirect(`${publicBase()}/settings/canva?error=${encodeURIComponent(oauthError)}`)
  }

  if (!code || !stateFromQuery) {
    return NextResponse.redirect(`${publicBase()}/settings/canva?error=missing_code_or_state`)
  }

  if (!stateFromCookie || stateFromCookie !== stateFromQuery) {
    logger.warn({ userId: session.user.id }, '[Vysible] Canva-OAuth State-Mismatch (CSRF-Verdacht)')
    return NextResponse.redirect(`${publicBase()}/settings/canva?error=state_mismatch`)
  }

  if (!codeVerifier) {
    logger.warn({ userId: session.user.id }, '[Vysible] Canva-OAuth PKCE-Verifier fehlt')
    return NextResponse.redirect(`${publicBase()}/settings/canva?error=pkce_missing`)
  }

  try {
    const token = await exchangeCodeForToken(code, codeVerifier)
    await persistCanvaToken(session.user.id, token)
    return NextResponse.redirect(`${publicBase()}/settings/canva?connected=1`)
  } catch (err: unknown) {
    logger.error({ err, userId: session.user.id }, 'Canva-Code-Exchange oder Token-Speichern fehlgeschlagen')
    return NextResponse.redirect(`${publicBase()}/settings/canva?error=token_exchange_failed`)
  }
}
