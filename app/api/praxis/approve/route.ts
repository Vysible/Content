import { writeAuditLog } from '@/lib/audit/logger'
import { prisma } from '@/lib/db'
import { sendNotification } from '@/lib/email/mailer'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token, projectId, contentIndex } = await req.json()
  if (!token || !projectId || contentIndex == null) {
    return NextResponse.json({ error: 'Fehlende Felder' }, { status: 400 })
  }

  const user = await prisma.praxisUser.findUnique({ where: { inviteToken: token } })
  if (!user || !user.active || user.projectId !== projectId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { textResults: true },
  })
  if (!project) return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })

  const results = (project.textResults as Array<Record<string, unknown>> | null) ?? []
  if (results[contentIndex]) {
    results[contentIndex] = { ...results[contentIndex], blogStatus: 'freigegeben' }
    await prisma.project.update({
      where: { id: projectId },
      data: { textResults: results as any },
    })
  }

  const projectName = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })

  await writeAuditLog({
    action: 'praxis.approve',
    entity: 'Project',
    entityId: projectId,
    projectId,
    userId: user.id,
    meta: { contentIndex },
  })

  await sendNotification(
    'share_approved',
    projectName?.name ?? projectId,
    `Praxis-Freigabe erteilt für Inhalt #${contentIndex + 1} durch ${user.name}`,
  ).catch((err: unknown) => {
    logger.warn({ err, projectId }, 'E-Mail-Benachrichtigung für Praxis-Freigabe fehlgeschlagen')
  })

  return NextResponse.json({ ok: true })
}
