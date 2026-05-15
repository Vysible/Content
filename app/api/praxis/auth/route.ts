import { prisma } from '@/lib/db'
import { setPraxisSession } from '@/lib/praxis/session'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token erforderlich' }, { status: 400 })

  // Lookup in InvitationToken table
  const invitation = await prisma.invitationToken.findUnique({
    where: { token },
    include: {
      praxisUser: true,
      project: { select: { id: true, name: true, textResults: true } },
    },
  })

  if (!invitation || !invitation.praxisUser) {
    return NextResponse.json({ error: 'Ungültiger Token' }, { status: 404 })
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Token abgelaufen' }, { status: 410 })
  }

  const user = invitation.praxisUser

  // Mark token as used (first visit)
  if (!invitation.usedAt) {
    await prisma.invitationToken.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    })
  }

  // Activate PraxisUser if not yet active
  if (!user.active) {
    await prisma.praxisUser.update({ where: { id: user.id }, data: { active: true } })
  }

  // Set httpOnly cookie session (7 days)
  await setPraxisSession(user.id, invitation.projectId)

  logger.info({ userId: user.id, projectId: invitation.projectId }, 'Praxis-Session via InvitationToken erstellt')

  // Load ContentApproval statuses for this project
  const approvals = await prisma.contentApproval.findMany({
    where: { projectId: invitation.projectId },
    select: { contentIndex: true, status: true },
  })

  const approvalMap: Record<number, string> = {}
  for (const a of approvals) {
    approvalMap[a.contentIndex] = a.status
  }

  return NextResponse.json({
    userId: user.id,
    name: user.name,
    projectId: invitation.project.id,
    projectName: invitation.project.name,
    textResults: invitation.project.textResults,
    approvals: approvalMap,
  })
}
