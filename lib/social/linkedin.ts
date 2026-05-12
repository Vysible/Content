/**
 * Slice 18 – LinkedIn UGC Posts Draft
 */
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import type { SocialDraftResult } from './meta'

async function getLinkedInToken(): Promise<{ token: string; personId: string }> {
  const key = await prisma.apiKey.findFirst({
    where: { provider: 'KLICKTIPP', active: true, name: { startsWith: 'linkedin:' } },
    // KLICKTIPP als Platzhalter bis LINKEDIN-Provider ergänzt
  })
  if (!key) throw new Error('Kein aktiver LinkedIn-API-Key konfiguriert (Format: linkedin:personId)')

  const token = decrypt(key.encryptedKey)
  const [, personId] = key.name.split(':')
  return { token, personId }
}

export async function postLinkedInDraft(text: string): Promise<SocialDraftResult> {
  try {
    const { token, personId } = await getLinkedInToken()

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
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
    })

    if (!res.ok) {
      const err = await res.text()
      return { platform: 'linkedin', status: 'error', error: err }
    }

    const id = res.headers.get('x-restli-id') ?? undefined
    return { platform: 'linkedin', draftId: id, status: 'draft' }
  } catch (err) {
    return { platform: 'linkedin', status: 'error', error: String(err) }
  }
}
