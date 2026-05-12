import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto/aes'
import type { Provider } from '@prisma/client'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.enum(['ANTHROPIC', 'OPENAI', 'DATASEO', 'KLICKTIPP', 'WORDPRESS', 'HEDY', 'CANVA']),
  key: z.string().min(10),
  model: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      provider: true,
      model: true,
      active: true,
      createdAt: true,
      // encryptedKey wird NICHT zurückgegeben
    },
  })

  return NextResponse.json(keys)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, provider, key, model } = parsed.data

  const encryptedKey = encrypt(key)

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      provider: provider as Provider,
      encryptedKey,
      model: model ?? null,
      createdById: session.user.id,
    },
    select: {
      id: true,
      name: true,
      provider: true,
      model: true,
      active: true,
      createdAt: true,
    },
  })

  console.log(`[Vysible] API-Key erstellt: ${provider} / ${name} (User: ${session.user.id})`)

  return NextResponse.json(apiKey, { status: 201 })
}
