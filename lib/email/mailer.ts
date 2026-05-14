import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { withRetry } from '@/lib/utils/retry'

export type EmailTrigger =
  | 'generation_complete'
  | 'draft_uploaded'
  | 'published'
  | 'share_approved'

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
  const config = await prisma.smtpConfig.findFirst({ where: { active: true } })
  if (!config || config.recipients.length === 0) return

  let password: string
  try {
    password = decrypt(config.encryptedPassword)
  } catch (err: unknown) {
    console.error('[Vysible] [FAIL] SMTP-Passwort konnte nicht entschlüsselt werden:', err)
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

  await withRetry(
    () =>
      transporter.sendMail({
        from: config.user,
        to: config.recipients.join(', '),
        subject,
        text,
      }),
    `smtp.sendMail(${trigger})`,
  )

  console.log(`[Vysible] E-Mail gesendet: ${trigger} für ${projectName}`)
}
