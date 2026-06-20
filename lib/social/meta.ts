/**
 * Slice 18 – Meta Graph API: Instagram + Facebook Draft Posting
 * ⚠️  Meta-Business-Verifizierung erforderlich (Vorlaufzeit Wochen)
 */
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import { loadCredentials, getIntegration } from '@/lib/integrations/store'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

interface MetaCredentials {
  pageAccessToken: string
}

async function getMetaCredentials(projectId: string): Promise<{
  token: string
  pageId: string
  igId?: string
}> {
  const [creds, status] = await Promise.all([
    loadCredentials<MetaCredentials>(projectId, 'META'),
    getIntegration(projectId, 'META'),
  ])
  const pageId = status.config?.pageId
  if (!pageId) throw new Error('Keine Page-ID für Meta konfiguriert')
  return {
    token: creds.pageAccessToken,
    pageId,
    igId: status.config?.igAccountId || undefined,
  }
}

export interface SocialDraftResult {
  platform: string
  draftId?: string
  status: 'draft' | 'error'
  error?: string
}

export async function postFacebookDraft(projectId: string, message: string): Promise<SocialDraftResult> {
  try {
    const { token, pageId } = await getMetaCredentials(projectId)
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
    logger.error({ err, projectId }, '[meta] postFacebookDraft fehlgeschlagen')
    return { platform: 'facebook', status: 'error', error: err instanceof Error ? err.message : String(err) }
  }
}

export async function postInstagramDraft(projectId: string, caption: string, imageUrl?: string): Promise<SocialDraftResult> {
  try {
    const { token, igId } = await getMetaCredentials(projectId)
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
    logger.error({ err, projectId }, '[meta] postInstagramDraft fehlgeschlagen')
    return { platform: 'instagram', status: 'error', error: err instanceof Error ? err.message : String(err) }
  }
}
