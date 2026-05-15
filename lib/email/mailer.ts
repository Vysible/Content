import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import { buildNotificationHtml, getNotificationSubject } from './templates/notification'

export type EmailTrigger =
  | 'generation_complete'
  | 'draft_uploaded'
  | 'published'
  | 'share_approved'
  | 'cost_threshold_exceeded'
  | 'monthly_report'

export async function sendPasswordResetMail(toEmail: string, resetUrl: string): Promise<void> {
  const config = await prisma.smtpConfig.findFirst({ where: { active: true } })
  if (!config) {
    logger.warn('Kein aktiver SMTP-Config — Passwort-Reset-Mail kann nicht gesendet werden')
    return
  }

  let password: string
  try {
    password = decrypt(config.encryptedPassword)
  } catch (err: unknown) {
    logger.error({ err }, 'SMTP-Passwort konnte nicht entschlüsselt werden (Password-Reset)')
    return
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: password },
  })

  const subject = 'Vysible: Passwort zurücksetzen'
  const text = [
    'Sie haben eine Passwort-Zurücksetzen-Anfrage gestellt.',
    '',
    `Bitte klicken Sie auf folgenden Link (gültig für 1 Stunde):`,
    resetUrl,
    '',
    'Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.',
    '',
    'Vysible – KI-Content-Plattform',
  ].join('\n')

  await withRetry(
    () =>
      transporter.sendMail({
        from: config.user,
        to: toEmail,
        subject,
        text,
      }),
    'smtp.sendPasswordResetMail',
  )

  logger.info('Passwort-Reset-Mail gesendet')
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
    logger.error({ err }, 'SMTP-Passwort konnte nicht entschlüsselt werden')
    return
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: password },
  })

  const subject = getNotificationSubject(trigger)
  const text = `Projekt: ${projectName}\n\n${details ?? ''}\n\nVysible – KI-Content-Plattform`
  const html = buildNotificationHtml(trigger, projectName, details)

  await withRetry(
    () =>
      transporter.sendMail({
        from: config.user,
        to: config.recipients.join(', '),
        subject,
        text,
        html,
      }),
    `smtp.sendMail(${trigger})`,
  )

  logger.info({ trigger }, 'E-Mail gesendet')
}
