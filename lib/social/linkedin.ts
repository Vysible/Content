/**
 * Slice 18 – LinkedIn UGC Posts Draft
 */
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import { loadCredentials, getIntegration } from '@/lib/integrations/store'
import type { SocialDraftResult } from './meta'

interface LinkedInCredentials {
  accessToken: string
}

async function getLinkedInCredentials(projectId: string): Promise<{
  token: string
  entityId: string
  postAs: 'person' | 'organization'
}> {
  const [creds, status] = await Promise.all([
    loadCredentials<LinkedInCredentials>(projectId, 'LINKEDIN'),
    getIntegration(projectId, 'LINKEDIN'),
  ])
  const entityId = status.config?.entityId
  if (!entityId) throw new Error('Keine LinkedIn Entity-ID konfiguriert')
  const postAs = (status.config?.postAs ?? 'organization') as 'person' | 'organization'
  return { token: creds.accessToken, entityId, postAs }
}

export async function postLinkedInDraft(projectId: string, text: string): Promise<SocialDraftResult> {
  try {
    const { token, entityId, postAs } = await getLinkedInCredentials(projectId)

    const author = postAs === 'organization'
      ? `urn:li:organization:${entityId}`
      : `urn:li:person:${entityId}`

    const res = await withRetry(
      () => fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author,
          lifecycleState: 'DRAFT',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        }),
      }),
      'linkedin.postDraft',
    )

    if (!res.ok) {
      const errText = await res.text()
      logger.error({ projectId, status: res.status, errText }, '[linkedin] postDraft HTTP-Fehler')
      return { platform: 'linkedin', status: 'error', error: errText }
    }

    const id = res.headers.get('x-restli-id') ?? undefined
    return { platform: 'linkedin', draftId: id, status: 'draft' }
  } catch (err) {
    logger.error({ err, projectId }, '[linkedin] postDraft fehlgeschlagen')
    return { platform: 'linkedin', status: 'error', error: err instanceof Error ? err.message : String(err) }
  }
}
