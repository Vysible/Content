import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await requireAuth()
  const userId = (session as { user?: { id?: string } }).user?.id ?? ''

  const { sourceProjectId } = await req.json() as { sourceProjectId?: string }
  if (!sourceProjectId) {
    return NextResponse.json({ error: 'sourceProjectId erforderlich' }, { status: 400 })
  }

  const source = await prisma.project.findUnique({ where: { id: sourceProjectId } })
  if (!source) {
    return NextResponse.json({ error: 'Quellprojekt nicht gefunden' }, { status: 404 })
  }
  if (source.createdById !== userId) {
    return NextResponse.json({ error: 'Kein Zugriff auf dieses Projekt' }, { status: 403 })
  }

  const clone = await prisma.project.create({
    data: {
      name: `${source.name} (Klon)`,
      praxisUrl: source.praxisUrl,
      praxisName: source.praxisName,
      fachgebiet: source.fachgebiet,
      planningStart: source.planningStart,
      planningEnd: source.planningEnd,
      channels: source.channels,
      keywords: source.keywords,
      wpUrl: source.wpUrl,
      ktListId: source.ktListId,
      apiKeyId: source.apiKeyId ?? undefined,
      status: 'DRAFT',
      clonedFrom: sourceProjectId,
      hedyImportHighlight: true,
      createdById: userId,
    },
  })

  return NextResponse.json({ newProjectId: clone.id })
}
