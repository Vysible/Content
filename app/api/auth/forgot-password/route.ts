import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db'
import { sendPasswordResetMail } from '@/lib/email/mailer'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'E-Mail-Adresse ungültig' }, { status: 400 })
  }

  const { email } = parsed.data

  // Immer 200 zurückgeben — keine Information ob User existiert
  try {
    const user = await prisma.user.findUnique({ where: { email } })

    if (user && user.active) {
      const token = randomBytes(32).toString('hex')
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 Stunde

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const resetUrl = `${appUrl}/reset-password?token=${token}`

      await sendPasswordResetMail(email, resetUrl)
    }
  } catch (err: unknown) {
    logger.error({ err }, 'Fehler beim Passwort-Vergessen-Flow')
    // Kein Fehler nach außen — Angreifer erfährt nichts
  }

  return NextResponse.json({ ok: true })
}
