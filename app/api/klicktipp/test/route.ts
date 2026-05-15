import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { testKtConnection } from '@/lib/klicktipp/client'
import { NextResponse } from 'next/server'

export async function POST() {
  await requireAuth()

  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'KLICKTIPP', active: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'Kein KlickTipp API-Key gespeichert' })
  }

  const credentials = decrypt(apiKey.encryptedKey)
  const result = await testKtConnection(credentials)
  return NextResponse.json(result)
}
