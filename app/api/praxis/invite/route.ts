import { randomUUID } from 'node:crypto'
import { requireAuth } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit/logger'
import { prisma } from '@/lib/db'
import { sendNotification } from '@/lib/email/mailer'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  await requireAuth()

  const { projectId, email, name } = await req.json()
  if (!projectId || !email || !name) {
    return NextResponse.json({ error: 'projectId, email und name erforderlich' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
  if (!project) return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })

  // Upsert PraxisUser (inviteToken/inviteExpires kept for legacy compat)
  const inviteExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h — legacy field
  const praxisUser = await prisma.praxisUser.upsert({
    where: { email_projectId: { email, projectId } },
    update: { name, inviteExpires },
    create: { projectId, email, name, inviteExpires },
  })

  // Create InvitationToken (24h TTL)
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const invitation = await prisma.invitationToken.create({
    data: {
      token,
      projectId,
      praxisUserId: praxisUser.id,
      email,
      expiresAt,
    },
  })

  const inviteUrl = `${process.env.NEXTAUTH_URL}/review/${invitation.token}`

  await sendNotification(
    'share_approved',
    project.name,
    `Einladungslink: ${inviteUrl} — Empfänger: ${name} <${email}>`,
  ).catch((err: unknown) => {
    logger.warn({ err, projectId }, 'E-Mail-Benachrichtigung für Praxis-Einladung fehlgeschlagen')
  })

  await writeAuditLog({
    action: 'praxis.invite',
    entity: 'InvitationToken',
    entityId: invitation.id,
    projectId,
    meta: { email },
  })

  return NextResponse.json({ inviteToken: invitation.token, inviteUrl })
}
