import { requireAuth } from '@/lib/auth/session'
import { createWordPressDraft } from '@/lib/wordpress/client'
import { sendNotification } from '@/lib/email/mailer'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  await requireAuth()

  const { projectId, title, html, categories } = await req.json()
  if (!projectId || !title || !html) {
    return NextResponse.json({ error: 'projectId, title und html erforderlich' }, { status: 400 })
  }

  const draft = await createWordPressDraft(projectId, title, html, categories ?? [])

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
  await sendNotification('draft_uploaded', project?.name ?? projectId, `WordPress Draft: "${title}" — ${draft.link}`).catch(() => {})

  return NextResponse.json(draft)
}
