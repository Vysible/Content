import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto/aes'
import { writeAuditLog } from '@/lib/audit/logger'
import { z } from 'zod'

const saveSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  listId: z.string().optional(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      ktListId: true,
      ktApiKey: { select: { id: true, name: true, active: true, model: true } },
    },
  })

  if (!project) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  return NextResponse.json({
    hasCredentials: !!project.ktApiKey?.active,
    username: project.ktApiKey?.name.replace('KT-Projekt: ', '') ?? '',
    listId: project.ktListId ?? project.ktApiKey?.model ?? '',
  })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAuth()

  const body = await req.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }

  const { username, password, listId } = parsed.data
  const credentials = `${username}:${password}`
  const encryptedKey = encrypt(credentials)

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, ktApiKeyId: true },
  })
  if (!project) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  let ktApiKeyId: string

  if (project.ktApiKeyId) {
    await prisma.apiKey.update({
      where: { id: project.ktApiKeyId },
      data: {
        encryptedKey,
        name: `KT-Projekt: ${username}`,
        model: listId ?? null,
      },
    })
    ktApiKeyId = project.ktApiKeyId
  } else {
    const newKey = await prisma.apiKey.create({
      data: {
        provider: 'KLICKTIPP',
        encryptedKey,
        name: `KT-Projekt: ${username}`,
        model: listId ?? null,
        active: true,
        createdById: session.user.id,
      },
    })
    ktApiKeyId = newKey.id
  }

  await prisma.project.update({
    where: { id: params.id },
    data: {
      ktApiKeyId,
      ktListId: listId ?? undefined,
    },
  })

  await writeAuditLog({
    action: 'klicktipp.credentials_saved',
    entity: 'Project',
    entityId: params.id,
    projectId: params.id,
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    meta: { username },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { ktApiKeyId: true },
  })
  if (!project) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  if (project.ktApiKeyId) {
    await prisma.project.update({
      where: { id: params.id },
      data: { ktApiKeyId: null },
    })
    await prisma.apiKey.delete({ where: { id: project.ktApiKeyId } })
  }

  await writeAuditLog({
    action: 'klicktipp.credentials_removed',
    entity: 'Project',
    entityId: params.id,
    projectId: params.id,
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
