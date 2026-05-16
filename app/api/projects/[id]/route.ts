import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit/logger'
import { logger } from '@/lib/utils/logger'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, createdById: true },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  if (project.createdById !== session.user.id) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  await writeAuditLog({
    action: 'project.delete',
    entity: 'Project',
    entityId: project.id,
    projectId: project.id,
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    meta: { name: project.name },
  })

  await prisma.project.delete({ where: { id: params.id } })

  logger.info({ projectId: params.id }, 'Projekt gelöscht (DSGVO-Kaskade)')

  return new NextResponse(null, { status: 204 })
}
