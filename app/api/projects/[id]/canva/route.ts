import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { listFolderAssets } from '@/lib/canva/client'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAuth()
  const sessionUserId = (session as { user?: { id?: string } }).user?.id

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { canvaFolderId: true, clientId: true, createdById: true },
  })
  if (!project) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  // Ordner: Projekt-Einstellung > Kunden-Einstellung als Fallback
  let folderId = project.canvaFolderId
  if (!folderId && project.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: project.clientId },
      select: { canvaFolderId: true },
    })
    folderId = client?.canvaFolderId ?? null
  }

  if (!folderId) {
    return NextResponse.json({ assets: [], message: 'Kein Canva-Ordner konfiguriert' })
  }

  // Token des eingeloggten Users verwenden; Fallback auf Ersteller des Projekts
  const effectiveUserId = sessionUserId ?? project.createdById

  try {
    const assets = await listFolderAssets(folderId, effectiveUserId)
    return NextResponse.json({ assets })
  } catch (err: unknown) {
    logger.warn({ err, projectId: params.id }, '[Vysible] Canva-Asset-Abruf für Projekt fehlgeschlagen')
    const message = err instanceof Error ? err.message : 'Canva-Fehler'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
