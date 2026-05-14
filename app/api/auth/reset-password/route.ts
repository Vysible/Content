import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
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
    return NextResponse.json(
      { error: 'Token fehlt oder Passwort zu kurz (mind. 8 Zeichen)' },
      { status: 400 },
    )
  }

  const { token, password } = parsed.data

  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
        active: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Token ungültig oder abgelaufen' },
        { status: 400 },
      )
    }

    const hashed = await hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    logger.info({ userId: user.id }, 'Passwort erfolgreich zurückgesetzt')

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    logger.error({ err }, 'Fehler beim Passwort-Reset')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
