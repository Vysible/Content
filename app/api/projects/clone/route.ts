import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await requireAuth()

  const { sourceProjectId, newName } = await req.json()
  if (!sourceProjectId || !newName) {
    return NextResponse.json({ error: 'sourceProjectId und newName erforderlich' }, { status: 400 })
  }

  const source = await prisma.project.findUnique({ where: { id: sourceProjectId } })
  if (!source) return NextResponse.json({ error: 'Quellprojekt nicht gefunden' }, { status: 404 })

  const clone = await prisma.project.create({
    data: {
      name: newName,
      praxisUrl: source.praxisUrl,
      praxisName: source.praxisName,
      fachgebiet: source.fachgebiet,
      planningStart: source.planningStart,
      planningEnd: source.planningEnd,
      channels: source.channels,
      positioningDocument: source.positioningDocument,
      themenPool: source.themenPool,
      keywords: source.keywords,
      wpUrl: source.wpUrl,
      ktListId: source.ktListId,
      status: 'DRAFT',
      createdById: (session as { user?: { id?: string } }).user?.id ?? '',
    },
  })

  return NextResponse.json({ projectId: clone.id })
}
