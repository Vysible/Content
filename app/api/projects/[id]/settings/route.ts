import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

const schema = z.object({
  apiKeyId: z.string().nullable().optional(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, apiKeyId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (err: unknown) {
    logger.error({ err }, 'Fehler beim Laden der Projekt-Settings')
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Felder' }, { status: 400 })
  }

  try {
    const updated = await prisma.project.update({
      where: { id: params.id },
      data: { apiKeyId: parsed.data.apiKeyId ?? null },
      select: { id: true, apiKeyId: true },
    })

    logger.info({ projectId: params.id, apiKeyId: parsed.data.apiKeyId }, 'Projekt-API-Key aktualisiert')

    return NextResponse.json(updated)
  } catch (err: unknown) {
    logger.error({ err, projectId: params.id }, 'Fehler beim Speichern der Projekt-Settings')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
