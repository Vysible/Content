import { requireAuth } from '@/lib/auth/session'
import { createKlickTippCampaign } from '@/lib/klicktipp/client'
import { sendNotification } from '@/lib/email/mailer'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  await requireAuth()

  const { projectId, subject, body, senderName, senderEmail } = await req.json()
  if (!projectId || !subject || !body || !senderName || !senderEmail) {
    return NextResponse.json({ error: 'Fehlende Felder' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, ktListId: true },
  })
  if (!project?.ktListId) {
    return NextResponse.json({ error: 'Kein Klick-Tipp Listen-ID für dieses Projekt' }, { status: 400 })
  }

  const result = await createKlickTippCampaign({
    projectId,
    listId: project.ktListId,
    subject,
    body,
    senderName,
    senderEmail,
  })

  await sendNotification(
    'draft_uploaded',
    project.name,
    `Klick-Tipp Kampagne (Draft): "${subject}" — ID: ${result.campaignId}`,
  ).catch((err: unknown) => {
    logger.warn({ err, projectId }, 'E-Mail-Benachrichtigung für Klick-Tipp-Kampagne fehlgeschlagen')
  })

  return NextResponse.json(result)
}
