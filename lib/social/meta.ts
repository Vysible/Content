/**
 * Slice 18 – Meta Graph API: Instagram + Facebook Draft Posting
 * ⚠️  Meta-Business-Verifizierung erforderlich (Vorlaufzeit Wochen)
 */
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

async function getMetaToken(): Promise<{ token: string; pageId: string; igId?: string }> {
  const key = await prisma.apiKey.findFirst({
    where: { provider: 'META', active: true },
  })
  if (!key) throw new Error('Kein aktiver Meta-API-Key konfiguriert (Format: meta:pageId[:igId])')

  const token = decrypt(key.encryptedKey)
  const [, pageId, igId] = key.name.split(':')
  return { token, pageId, igId }
}

export interface SocialDraftResult {
  platform: string
  draftId?: string
  status: 'draft' | 'error'
  error?: string
}

export async function postFacebookDraft(message: string): Promise<SocialDraftResult> {
  try {
    const { token, pageId } = await getMetaToken()
    const res = await withRetry(
      () => fetch(`${GRAPH_API}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, published: false, access_token: token }),
      }),
      'meta.postFacebookDraft',
    )
    const data = await res.json()
    if (!res.ok) return { platform: 'facebook', status: 'error', error: data.error?.message }
    return { platform: 'facebook', draftId: data.id, status: 'draft' }
  } catch (err) {
    logger.error({ err }, '[meta] postFacebookDraft fehlgeschlagen')
    return { platform: 'facebook', status: 'error', error: String(err) }
  }
}

export async function postInstagramDraft(caption: string, imageUrl?: string): Promise<SocialDraftResult> {
  try {
    const { token, igId } = await getMetaToken()
    if (!igId) return { platform: 'instagram', status: 'error', error: 'Keine Instagram-Business-ID konfiguriert' }

    // Schritt 1: Media-Container erstellen
    const mediaRes = await withRetry(
      () => fetch(`${GRAPH_API}/${igId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          image_url: imageUrl ?? 'https://placehold.co/1080x1080',
          access_token: token,
        }),
      }),
      'meta.postInstagramDraft',
    )
    const mediaData = await mediaRes.json()
    if (!mediaRes.ok) return { platform: 'instagram', status: 'error', error: mediaData.error?.message }

    // Nur Container erstellt, nicht veröffentlicht – entspricht "Draft"
    return { platform: 'instagram', draftId: mediaData.id, status: 'draft' }
  } catch (err) {
    logger.error({ err }, '[meta] postInstagramDraft fehlgeschlagen')
    return { platform: 'instagram', status: 'error', error: String(err) }
  }
}
