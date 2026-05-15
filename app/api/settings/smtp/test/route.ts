import { NextResponse } from 'next/server'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { requireAdmin } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import { normalizeRecipients } from '@/lib/email/smtp-config'

const schema = z.object({
  host: z.string().trim().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().trim().min(1),
  password: z.string(),
  recipients: z.array(z.string()),
  id: z.string().trim().optional(),
})

export async function POST(req: Request) {
  try {
    await requireAdmin()
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingaben', details: parsed.error.flatten() }, { status: 400 })
    }

    const recipients = normalizeRecipients(parsed.data.recipients)
    const firstRecipient = recipients[0]!
    const passwordInput = parsed.data.password.trim()

    let password = passwordInput
    if (!password && parsed.data.id) {
      const existing = await prisma.smtpConfig.findUnique({
        where: { id: parsed.data.id },
        select: { encryptedPassword: true },
      })
      if (!existing) {
        return NextResponse.json({ error: 'SMTP-Config nicht gefunden' }, { status: 404 })
      }
      password = decrypt(existing.encryptedPassword)
    }

    if (!password) {
      return NextResponse.json({ error: 'Passwort erforderlich' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: parsed.data.host.trim(),
      port: parsed.data.port,
      secure: parsed.data.secure,
      auth: {
        user: parsed.data.user.trim(),
        pass: password,
      },
    })

    await withRetry(
      () =>
        transporter.sendMail({
          from: parsed.data.user.trim(),
          to: firstRecipient,
          subject: 'Vysible SMTP-Testmail',
          text: 'Diese Testmail wurde erfolgreich ueber Vysible versendet.',
          html: '<p>Diese Testmail wurde erfolgreich ueber <strong>Vysible</strong> versendet.</p>',
        }),
      'smtp.sendTestMail',
    )

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('Ungültige E-Mail-Adresse')) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof Error && (err.message.includes('Mindestens ein Empfänger') || err.message.includes('Maximal 5'))) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    logger.error({ err }, 'SMTP-Testmail fehlgeschlagen')
    return NextResponse.json({ error: 'SMTP-Testmail konnte nicht gesendet werden' }, { status: 500 })
  }
}
