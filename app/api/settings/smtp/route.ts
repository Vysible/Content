import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto/aes'
import { logger } from '@/lib/utils/logger'
import { normalizeRecipients } from '@/lib/email/smtp-config'

const smtpSchema = z.object({
  host: z.string().trim().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().trim().min(1),
  password: z.string(),
  recipients: z.array(z.string()),
  active: z.boolean(),
})

const smtpUpdateSchema = smtpSchema.extend({
  id: z.string().trim().min(1),
})

type SmtpPublicResponse = {
  id: string
  host: string
  port: number
  secure: boolean
  user: string
  recipients: string[]
  active: boolean
  hasPassword: boolean
}

function mapConfigToPublicResponse(config: {
  id: string
  host: string
  port: number
  secure: boolean
  user: string
  recipients: string[]
  active: boolean
  encryptedPassword: string
}): SmtpPublicResponse {
  return {
    id: config.id,
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    recipients: config.recipients,
    active: config.active,
    hasPassword: config.encryptedPassword.length > 0,
  }
}

export async function GET() {
  try {
    await requireAdmin()
    const config = await prisma.smtpConfig.findFirst({
      where: { active: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        host: true,
        port: true,
        secure: true,
        user: true,
        recipients: true,
        active: true,
        encryptedPassword: true,
      },
    })

    if (!config) return NextResponse.json({ config: null })
    return NextResponse.json({ config: mapConfigToPublicResponse(config) })
  } catch (err: unknown) {
    logger.error({ err }, 'SMTP-Settings konnten nicht geladen werden')
    return NextResponse.json({ error: 'Nicht autorisiert oder interner Fehler' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
    const body = await req.json()
    const parsed = smtpSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingaben', details: parsed.error.flatten() }, { status: 400 })
    }

    const recipients = normalizeRecipients(parsed.data.recipients)
    const encryptedPassword = encrypt(parsed.data.password.trim())

    const created = await prisma.$transaction(async (tx) => {
      if (parsed.data.active) {
        await tx.smtpConfig.updateMany({ where: { active: true }, data: { active: false } })
      }

      return tx.smtpConfig.create({
        data: {
          host: parsed.data.host.trim(),
          port: parsed.data.port,
          secure: parsed.data.secure,
          user: parsed.data.user.trim(),
          encryptedPassword,
          recipients,
          active: parsed.data.active,
        },
        select: {
          id: true,
          host: true,
          port: true,
          secure: true,
          user: true,
          recipients: true,
          active: true,
          encryptedPassword: true,
        },
      })
    })

    return NextResponse.json({ config: mapConfigToPublicResponse(created) }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('Ungültige E-Mail-Adresse')) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof Error && (err.message.includes('Mindestens ein Empfänger') || err.message.includes('Maximal 5'))) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    logger.error({ err }, 'SMTP-Settings konnten nicht erstellt werden')
    return NextResponse.json({ error: 'SMTP-Settings konnten nicht gespeichert werden' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin()
    const body = await req.json()
    const parsed = smtpUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingaben', details: parsed.error.flatten() }, { status: 400 })
    }

    const recipients = normalizeRecipients(parsed.data.recipients)
    const password = parsed.data.password.trim()

    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.active) {
        await tx.smtpConfig.updateMany({
          where: { active: true, id: { not: parsed.data.id } },
          data: { active: false },
        })
      }

      return tx.smtpConfig.update({
        where: { id: parsed.data.id },
        data: {
          host: parsed.data.host.trim(),
          port: parsed.data.port,
          secure: parsed.data.secure,
          user: parsed.data.user.trim(),
          recipients,
          active: parsed.data.active,
          ...(password.length > 0 ? { encryptedPassword: encrypt(password) } : {}),
        },
        select: {
          id: true,
          host: true,
          port: true,
          secure: true,
          user: true,
          recipients: true,
          active: true,
          encryptedPassword: true,
        },
      })
    })

    return NextResponse.json({ config: mapConfigToPublicResponse(updated) })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'No record was found for an update.') {
      return NextResponse.json({ error: 'SMTP-Config nicht gefunden' }, { status: 404 })
    }
    if (err instanceof Error && err.message.startsWith('Ungültige E-Mail-Adresse')) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof Error && (err.message.includes('Mindestens ein Empfänger') || err.message.includes('Maximal 5'))) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    logger.error({ err }, 'SMTP-Settings konnten nicht aktualisiert werden')
    return NextResponse.json({ error: 'SMTP-Settings konnten nicht gespeichert werden' }, { status: 500 })
  }
}
