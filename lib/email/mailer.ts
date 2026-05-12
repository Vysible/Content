import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'

export type EmailTrigger =
  | 'generation_complete'
  | 'draft_uploaded'
  | 'published'
  | 'share_approved'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  encryptedPassword: string
  recipients: string[] // bis zu 5
}

async function getEmailConfig(): Promise<EmailConfig | null> {
  // SMTP-Config aus ApiKey-Tabelle (Provider HEDY wird als SMTP-Eintrag zweckentfremdet)
  // Format: host:port:user:encryptedPassword, recipients in name
  const key = await prisma.apiKey.findFirst({
    where: { provider: 'HEDY', active: true, name: { startsWith: 'smtp:' } },
  })
  if (!key) return null

  try {
    const [, host, portStr, user] = key.name.split(':')
    const port = parseInt(portStr ?? '587', 10)
    return {
      host,
      port,
      secure: port === 465,
      user,
      encryptedPassword: key.encryptedKey,
      recipients: (key.model ?? '').split(',').filter(Boolean).slice(0, 5),
    }
  } catch {
    return null
  }
}

const TRIGGER_SUBJECTS: Record<EmailTrigger, string> = {
  generation_complete: 'Vysible: Generierung abgeschlossen',
  draft_uploaded:      'Vysible: Entwurf hochgeladen',
  published:           'Vysible: Content veröffentlicht',
  share_approved:      'Vysible: Freigabe erteilt',
}

export async function sendNotification(
  trigger: EmailTrigger,
  projectName: string,
  details?: string
): Promise<void> {
  const config = await getEmailConfig()
  if (!config || config.recipients.length === 0) return

  let password: string
  try {
    password = decrypt(config.encryptedPassword)
  } catch {
    console.error('[Vysible] SMTP-Passwort konnte nicht entschlüsselt werden')
    return
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: password },
  })

  const subject = TRIGGER_SUBJECTS[trigger]
  const text = `Projekt: ${projectName}\n\n${details ?? ''}\n\nVysible – KI-Content-Plattform`

  try {
    await transporter.sendMail({
      from: config.user,
      to: config.recipients.join(', '),
      subject,
      text,
    })
    console.log(`[Vysible] E-Mail gesendet: ${trigger} für ${projectName}`)
  } catch (err) {
    console.error('[Vysible] E-Mail-Versand fehlgeschlagen:', err)
  }
}
