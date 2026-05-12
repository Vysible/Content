import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { password } = await req.json()

  const link = await prisma.shareLink.findUnique({
    where: { token: params.token },
    select: { passwordHash: true, expiresAt: true },
  })

  if (!link || link.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Link ungültig oder abgelaufen' }, { status: 404 })
  }

  const valid = await bcrypt.compare(password, link.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
