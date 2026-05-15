import { writeAuditLog } from '@/lib/audit/logger'
import { prisma } from '@/lib/db'
import { sendNotification } from '@/lib/email/mailer'
import { getPraxisSession } from '@/lib/praxis/session'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await getPraxisSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { contentIndex } = await req.json()
  if (contentIndex == null) {
    return NextResponse.json({ error: 'contentIndex erforderlich' }, { status: 400 })
  }

  const { projectId, praxisUserId } = session

  // Upsert ContentApproval
  await prisma.contentApproval.upsert({
    where: { projectId_contentIndex: { projectId, contentIndex } },
    update: { status: 'freigegeben', approvedAt: new Date(), approvedById: praxisUserId },
    create: { projectId, contentIndex, status: 'freigegeben', approvedAt: new Date(), approvedById: praxisUserId },
  })

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
  const user = await prisma.praxisUser.findUnique({ where: { id: praxisUserId }, select: { name: true } })

  await writeAuditLog({
    action: 'praxis.approve',
    entity: 'ContentApproval',
    entityId: projectId,
    projectId,
    userId: praxisUserId,
    meta: { contentIndex },
  })

  await sendNotification(
    'share_approved',
    project?.name ?? projectId,
    `Praxis-Freigabe erteilt für Inhalt #${contentIndex + 1} durch ${user?.name ?? 'Praxis'}`,
  ).catch((err: unknown) => {
    logger.warn({ err, projectId }, 'E-Mail-Benachrichtigung für Praxis-Freigabe fehlgeschlagen')
  })

  return NextResponse.json({ ok: true, status: 'freigegeben' })
}
