import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { formatNewsletterHtml } from './newsletter-formatter'

async function getKtCredentials(): Promise<{ username: string; password: string }> {
  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'KLICKTIPP', active: true, name: { startsWith: 'kt:' } },
    orderBy: { createdAt: 'desc' },
  })
  if (!apiKey) throw new Error('Kein Klick-Tipp API-Key gefunden')

  // name format: kt:username
  const username = apiKey.name.split(':')[1]
  const password = decrypt(apiKey.encryptedKey)
  return { username, password }
}

async function ktLogin(username: string, password: string): Promise<string> {
  const res = await fetch('https://api.klicktipp.com/account/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error(`Klick-Tipp Login fehlgeschlagen: ${res.status}`)
  const data = await res.json()
  return data.sessid as string
}

async function ktLogout(sessid: string): Promise<void> {
  await fetch('https://api.klicktipp.com/account/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessid }),
  }).catch(() => {})
}

export async function createKlickTippCampaign(opts: {
  projectId: string
  listId: string
  subject: string
  body: string
  senderName: string
  senderEmail: string
}): Promise<{ campaignId: string }> {
  const { username, password } = await getKtCredentials()
  const sessid = await ktLogin(username, password)

  try {
    const html = formatNewsletterHtml(opts.subject, opts.body)

    const res = await fetch('https://api.klicktipp.com/campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessid,
        name: opts.subject,
        subject: opts.subject,
        from_name: opts.senderName,
        from_email: opts.senderEmail,
        reply_to: opts.senderEmail,
        content: html,
        listids: [opts.listId],
        status: '2', // draft
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Klick-Tipp Kampagne Fehler ${res.status}: ${body.slice(0, 200)}`)
    }

    const data = await res.json()
    return { campaignId: String(data.id ?? data.campaignid ?? 'unknown') }
  } finally {
    await ktLogout(sessid)
  }
}
