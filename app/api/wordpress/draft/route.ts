import { requireAuth } from '@/lib/auth/session'
import { createWpDraft } from '@/lib/wordpress/client'
import { blogToGutenbergHtml, htmlToGutenbergFreeform, extractH1Title, extractTitleFromHtml } from '@/lib/wordpress/formatter'
import { sendNotification } from '@/lib/email/mailer'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit/logger'
import { checkHwgGate } from '@/lib/compliance/hwg-gate'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await requireAuth()

  const { projectId, blogMarkdown, blogHtml, hwgDisclaimer, title: explicitTitle } = await req.json()
  if (!projectId || (!blogMarkdown && !blogHtml)) {
    return NextResponse.json({ error: 'projectId und blogMarkdown oder blogHtml erforderlich' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, hwgFlag: true, wpUrl: true },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const gate = checkHwgGate(project.hwgFlag ?? false)
  if (gate.blocked) {
    await writeAuditLog({
      action:    'wordpress.draft_blocked',
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

  let title: string
  let gutenbergHtml: string

  if (blogMarkdown) {
    title = explicitTitle || extractH1Title(blogMarkdown) || 'Neuer Blog-Beitrag'
    gutenbergHtml = blogToGutenbergHtml(blogMarkdown, hwgDisclaimer ?? '')
  } else {
    title = explicitTitle || extractTitleFromHtml(blogHtml) || 'Neuer Blog-Beitrag'
    gutenbergHtml = htmlToGutenbergFreeform(blogHtml, hwgDisclaimer ?? '')
  }

  const draft = await createWpDraft(projectId, title, gutenbergHtml)

  await prisma.project.update({
    where: { id: projectId },
    data: { wpDraftPostId: String(draft.id) },
  })

  await writeAuditLog({
    action:    'wordpress.draft_created',
    entity:    'Project',
    entityId:  projectId,
    projectId: projectId,
    userId:    session.user.id,
    userEmail: session.user.email ?? undefined,
    meta:      { wpPostId: draft.id, wpUrl: project.wpUrl },
  })

  await sendNotification(
    'draft_uploaded',
    project.name ?? projectId,
    `WordPress Draft: "${title}" — ${draft.link}`,
  ).catch((err: unknown) => {
    logger.warn({ err, projectId }, '[Vysible] E-Mail-Benachrichtigung für WordPress-Draft fehlgeschlagen')
  })

  const editUrl = `${project.wpUrl?.replace(/\/$/, '')}/wp-admin/post.php?post=${draft.id}&action=edit`

  return NextResponse.json({ wpPostId: draft.id, editUrl, link: draft.link })
}
