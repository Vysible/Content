import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto/aes'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  model: z.string().optional(),
  active: z.boolean().optional(),
  key: z.string().min(10).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }

  const existing = await prisma.apiKey.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.model !== undefined) updateData.model = parsed.data.model
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active
  if (parsed.data.key !== undefined) updateData.encryptedKey = encrypt(parsed.data.key)

  const updated = await prisma.apiKey.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      provider: true,
      model: true,
      active: true,
      createdAt: true,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.apiKey.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  await prisma.apiKey.delete({ where: { id: params.id } })

  console.log(`[Vysible] API-Key gelöscht: ${existing.provider} / ${existing.name}`)

  return new NextResponse(null, { status: 204 })
}
