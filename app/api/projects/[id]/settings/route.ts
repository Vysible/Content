import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

const schema = z.object({
  apiKeyId: z.string().nullable().optional(),
  positioningDocument: z.string().optional(),
  hedyImportHighlight: z.boolean().optional(),
  socialExamples: z.string().optional(),
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
    const updateData: Record<string, unknown> = {}
    if ('apiKeyId' in parsed.data) updateData.apiKeyId = parsed.data.apiKeyId ?? null
    if (parsed.data.positioningDocument !== undefined) updateData.positioningDocument = parsed.data.positioningDocument
    if (parsed.data.hedyImportHighlight !== undefined) updateData.hedyImportHighlight = parsed.data.hedyImportHighlight
    if (parsed.data.socialExamples !== undefined) updateData.socialExamples = parsed.data.socialExamples

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, apiKeyId: true },
    })

    logger.info({ projectId: params.id }, 'Projekt-Settings aktualisiert')

    return NextResponse.json(updated)
  } catch (err: unknown) {
    logger.error({ err, projectId: params.id }, 'Fehler beim Speichern der Projekt-Settings')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
