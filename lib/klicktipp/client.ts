import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const KT_BASE = 'https://api.klicktipp.com'

export interface KtCampaignInput {
  name: string
  subjectA: string
  subjectB?: string
  htmlBody: string
  listId: string
  senderName?: string
  senderEmail?: string
}

export interface KtCampaignResult {
  campaignId: string
  editUrl: string
}

export async function loadKtCredentials(projectId?: string): Promise<string> {
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ktApiKey: { select: { encryptedKey: true, active: true } } },
    })
    if (project?.ktApiKey?.active) {
      return decrypt(project.ktApiKey.encryptedKey)
    }
  }
  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'KLICKTIPP', active: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!apiKey) throw new Error('Kein KlickTipp API-Key gefunden')
  return decrypt(apiKey.encryptedKey)
}

async function ktLogin(username: string, password: string): Promise<string> {
  const res = await fetch(`${KT_BASE}/account/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error(`KlickTipp Login fehlgeschlagen: ${res.status}`)
  const data = await res.json() as { sessid?: string }
  if (!data.sessid) throw new Error('KlickTipp Login: kein sessid in Antwort')
  return data.sessid
}

async function ktLogout(sessid: string): Promise<void> {
  await fetch(`${KT_BASE}/account/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessid }),
  }).catch((exc: unknown) => {
    logger.warn({ exc }, '[Vysible] KlickTipp-Logout fehlgeschlagen (ignoriert)')
  })
}

export async function createKlickTippCampaign(
  credentials: string,
  input: KtCampaignInput,
): Promise<KtCampaignResult> {
  if (!input.htmlBody.includes('{{unsubscribe_link}}')) {
    throw new Error('KT-HTML muss {{unsubscribe_link}} enthalten — KT API lehnt sonst ab')
  }

  return withRetry(async () => {
    const [username, password] = credentials.split(':')
    const sessid = await ktLogin(username, password)

    try {
      const res = await fetch(`${KT_BASE}/campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessid,
          name: input.name,
          subject: input.subjectA,
          ...(input.subjectB ? { subject_b: input.subjectB } : {}),
          ...(input.senderName ? { from_name: input.senderName } : {}),
          ...(input.senderEmail
            ? { from_email: input.senderEmail, reply_to: input.senderEmail }
            : {}),
          content: input.htmlBody,
          listids: [input.listId],
          status: '2',
        }),
      })

      if (res.status === 401) {
        throw new Error('KlickTipp-Credentials ungültig')
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`KT API HTTP ${res.status}: ${body.slice(0, 200)}`)
      }

      const data = await res.json() as { id?: string | number; campaignid?: string | number }
      const campaignId = String(data.id ?? data.campaignid ?? '')
      logger.info({ campaignId }, '[Vysible] KlickTipp-Kampagne erstellt')

      return {
        campaignId,
        editUrl: `https://app.klicktipp.com/campaigns/${campaignId}/edit`,
      }
    } finally {
      await ktLogout(sessid)
    }
  }, 'klicktipp.create_campaign')
}

export async function testKtConnection(
  credentials: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const [username, password] = credentials.split(':')
    const sessid = await ktLogin(username, password)
    await ktLogout(sessid)
    return { ok: true }
  } catch (exc: unknown) {
    logger.warn({ exc }, '[Vysible] KlickTipp-Verbindungstest fehlgeschlagen')
    return { ok: false, error: exc instanceof Error ? exc.message : String(exc) }
  }
}
