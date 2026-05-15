import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { listFolderAssets } from '@/lib/canva/client'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { canvaFolderId: true, createdById: true },
  })
  if (!project) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (!project.canvaFolderId) {
    return NextResponse.json({ assets: [], message: 'Kein Canva-Ordner konfiguriert' })
  }

  try {
    const assets = await listFolderAssets(project.canvaFolderId, project.createdById)
    return NextResponse.json({ assets })
  } catch (err: unknown) {
    logger.warn({ err, projectId: params.id }, '[Vysible] Canva-Asset-Abruf für Projekt fehlgeschlagen')
    const message = err instanceof Error ? err.message : 'Canva-Fehler'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
