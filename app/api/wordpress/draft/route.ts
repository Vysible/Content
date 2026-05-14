import { requireAuth } from '@/lib/auth/session'
import { createWordPressDraft } from '@/lib/wordpress/client'
import { sendNotification } from '@/lib/email/mailer'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit/logger'
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

  if (project?.hwgFlag) {
    await writeAuditLog({
      action:    'export.download',
      entity:    'Project',
      entityId:  projectId,
      projectId: projectId,
      userId:    session.user.id,
      userEmail: session.user.email ?? undefined,
      meta:      { blocked: true, reason: 'hwg_flag', channel: 'wordpress' },
    })
    return NextResponse.json(
      { error: 'WordPress-Draft gesperrt: HWG-Compliance-Flag ist gesetzt. Bitte Inhalt prüfen und Flag zurücksetzen.' },
      { status: 403 }
    )
  }

  const draft = await createWordPressDraft(projectId, title, html, categories ?? [])

  await sendNotification('draft_uploaded', project?.name ?? projectId, `WordPress Draft: "${title}" — ${draft.link}`).catch(() => {})

  return NextResponse.json(draft)
}
