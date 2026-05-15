import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { testWpConnection } from '@/lib/wordpress/client'
import { NextResponse } from 'next/server'

export async function POST() {
  await requireAuth()

  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'WORDPRESS', active: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'Kein WordPress API-Key gespeichert' })
  }

  const credentials = decrypt(apiKey.encryptedKey)

  const projects = await prisma.project.findMany({
    where: { wpUrl: { not: null } },
    select: { wpUrl: true },
    take: 1,
    orderBy: { updatedAt: 'desc' },
  })

  const wpUrl = projects[0]?.wpUrl
  if (!wpUrl) {
    return NextResponse.json({ ok: false, error: 'Keine WordPress-URL konfiguriert' })
  }

  const result = await testWpConnection(wpUrl, credentials)
  return NextResponse.json(result)
}
