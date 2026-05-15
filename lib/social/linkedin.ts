/**
 * Slice 18 – LinkedIn UGC Posts Draft
 */
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import type { SocialDraftResult } from './meta'

async function getLinkedInToken(): Promise<{ token: string; personId: string }> {
  const key = await prisma.apiKey.findFirst({
    where: { provider: 'LINKEDIN', active: true },
  })
  if (!key) throw new Error('Kein aktiver LinkedIn-API-Key konfiguriert (Format: linkedin:personId)')

  const token = decrypt(key.encryptedKey)
  const [, personId] = key.name.split(':')
  return { token, personId }
}

export async function postLinkedInDraft(text: string): Promise<SocialDraftResult> {
  try {
    const { token, personId } = await getLinkedInToken()

    const res = await withRetry(
      () => fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: `urn:li:person:${personId}`,
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
      return { platform: 'linkedin', status: 'error', error: errText }
    }

    const id = res.headers.get('x-restli-id') ?? undefined
    return { platform: 'linkedin', draftId: id, status: 'draft' }
  } catch (err) {
    logger.error({ err }, '[linkedin] postDraft fehlgeschlagen')
    return { platform: 'linkedin', status: 'error', error: String(err) }
  }
}
