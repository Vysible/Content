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

  const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const inviteToken = randomUUID()

  const praxisUser = await prisma.praxisUser.upsert({
    where: { email_projectId: { email, projectId } } as never,
    update: { name, inviteExpires, inviteToken },
    create: { projectId, email, name, inviteExpires, inviteToken },
  })

  const inviteUrl = `${process.env.NEXTAUTH_URL}/praxis/review/${praxisUser.inviteToken}`

  await sendNotification(
    'share_approved',
    project.name,
    `Einladungslink: ${inviteUrl} — Empfänger: ${name} <${email}>`,
  ).catch((err: unknown) => {
    logger.warn({ err, projectId }, 'E-Mail-Benachrichtigung für Praxis-Einladung fehlgeschlagen')
  })

  await writeAuditLog({
    action: 'praxis.invite',
    entity: 'PraxisUser',
    entityId: praxisUser.id,
    projectId,
    meta: { email },
  })

  return NextResponse.json({ inviteToken: praxisUser.inviteToken, inviteUrl })
}
