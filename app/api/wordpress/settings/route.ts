import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto/aes'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireAuth()

  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'WORDPRESS', active: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  const projects = await prisma.project.findMany({
    where: { wpUrl: { not: null } },
    select: { wpUrl: true },
    take: 1,
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    wpUrl: projects[0]?.wpUrl ?? '',
    hasCredentials: !!apiKey,
  })
}

export async function POST(req: Request) {
  const session = await requireAuth()

  const { wpUrl, username, appPassword } = await req.json()
  if (!wpUrl || !username || !appPassword) {
    return NextResponse.json({ error: 'Alle Felder erforderlich' }, { status: 400 })
  }

  const credentials = `${username}:${appPassword}`
  const encryptedKey = encrypt(credentials)

  const existing = await prisma.apiKey.findFirst({
    where: { provider: 'WORDPRESS', active: true },
  })

  if (existing) {
    await prisma.apiKey.update({
      where: { id: existing.id },
      data: { encryptedKey, name: `WP: ${username}@${new URL(wpUrl).hostname}` },
    })
  } else {
    await prisma.apiKey.create({
      data: {
        provider: 'WORDPRESS',
        encryptedKey,
        name: `WP: ${username}@${new URL(wpUrl).hostname}`,
        active: true,
        createdById: session.user.id,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
