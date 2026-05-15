import { requireAuth } from '@/lib/auth/session'
import { createWordPressDraft } from '@/lib/wordpress/client'
import { sendNotification } from '@/lib/email/mailer'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit/logger'
import { checkHwgGate } from '@/lib/compliance/hwg-gate'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await requireAuth()

  const { projectId, title, html, categories } = await req.json()
  if (!projectId || !title || !html) {
    return NextResponse.json({ error: 'projectId, title und html erforderlich' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, hwgFlag: true },
  })

  const gate = checkHwgGate(project?.hwgFlag ?? false)
  if (gate.blocked) {
    await writeAuditLog({
      action:    'export.download',
      entity:    'Project',
      entityId:  projectId,
      projectId: projectId,
      userId:    session.user.id,
      userEmail: session.user.email ?? undefined,
      meta:      { blocked: true, reason: gate.reason, channel: 'wordpress' },
    })
    return NextResponse.json(
      { error: 'WordPress-Draft gesperrt: HWG-Compliance-Flag ist gesetzt. Bitte Inhalt prüfen und Flag zurücksetzen.' },
      { status: 403 }
    )
  }

  const draft = await createWordPressDraft(projectId, title, html, categories ?? [])

  await sendNotification(
    'draft_uploaded',
    project?.name ?? projectId,
    `WordPress Draft: "${title}" — ${draft.link}`,
  ).catch((err: unknown) => {
    logger.warn({ err, projectId }, 'E-Mail-Benachrichtigung für WordPress-Draft fehlgeschlagen')
  })

  return NextResponse.json(draft)
}
