import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'
import { encrypt } from '@/lib/crypto/aes'

const schema = z.object({
  name: z.string().min(1).optional(),
  praxisUrl: z.string().optional(),
  praxisName: z.string().optional(),
  fachgebiet: z.string().optional(),
  ansprache: z.enum(['Du', 'Sie']).optional(),
  planningStart: z.string().optional(),
  planningEnd: z.string().optional(),
  channelQuantities: z.record(z.unknown()).nullable().optional(),
  positioningDocument: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  themenPool: z.string().optional(),
  geplantThemen: z.array(z.object({ monat: z.string(), thema: z.string() })).optional(),
  canvaFolderId: z.string().nullable().optional(),
  hedyImportHighlight: z.boolean().optional(),
})

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
    const d = parsed.data
    const updateData: Record<string, unknown> = {}

    if (d.name !== undefined) updateData.name = d.name
    if (d.praxisUrl !== undefined) updateData.praxisUrl = d.praxisUrl
    if (d.praxisName !== undefined) updateData.praxisName = d.praxisName
    if (d.fachgebiet !== undefined) updateData.fachgebiet = d.fachgebiet
    if (d.ansprache !== undefined) updateData.ansprache = d.ansprache
    if (d.planningStart !== undefined) updateData.planningStart = new Date(d.planningStart + '-01')
    if (d.planningEnd !== undefined) updateData.planningEnd = (() => {
      const [y, m] = d.planningEnd!.split('-').map(Number)
      return new Date(y, m, 0) // last day of month
    })()
    if (d.channelQuantities !== undefined) updateData.channelQuantities = d.channelQuantities ?? null
    if (d.positioningDocument !== undefined) updateData.positioningDocument = d.positioningDocument ? encrypt(d.positioningDocument) : null
    if (d.keywords !== undefined) updateData.keywords = d.keywords
    if (d.themenPool !== undefined) updateData.themenPool = d.themenPool
    if (d.geplantThemen !== undefined) updateData.geplantThemen = d.geplantThemen
    if ('canvaFolderId' in d) updateData.canvaFolderId = d.canvaFolderId ?? null
    if (d.hedyImportHighlight !== undefined) updateData.hedyImportHighlight = d.hedyImportHighlight

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true },
    })

    logger.info({ projectId: params.id }, 'Projekt-Settings aktualisiert')

    return NextResponse.json(updated)
  } catch (err: unknown) {
    logger.error({ err, projectId: params.id }, 'Fehler beim Speichern der Projekt-Settings')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
