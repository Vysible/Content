import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto/aes'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireAuth()

  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'KLICKTIPP', active: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, model: true },
  })

  return NextResponse.json({
    hasCredentials: !!apiKey,
    defaultListId: apiKey?.model ?? '',
  })
}

export async function POST(req: Request) {
  const session = await requireAuth()

  const { username, password, defaultListId } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Benutzername und Passwort erforderlich' }, { status: 400 })
  }

  const credentials = `${username}:${password}`
  const encryptedKey = encrypt(credentials)

  const existing = await prisma.apiKey.findFirst({
    where: { provider: 'KLICKTIPP', active: true },
  })

  if (existing) {
    await prisma.apiKey.update({
      where: { id: existing.id },
      data: {
        encryptedKey,
        name: `KT: ${username}`,
        model: defaultListId ?? existing.model,
      },
    })
  } else {
    await prisma.apiKey.create({
      data: {
        provider: 'KLICKTIPP',
        encryptedKey,
        name: `KT: ${username}`,
        model: defaultListId ?? null,
        active: true,
        createdById: session.user.id,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
