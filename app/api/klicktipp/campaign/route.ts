import { requireAuth } from '@/lib/auth/session'
import { loadKtCredentials, createKlickTippCampaign } from '@/lib/klicktipp/client'
import { formatForKlickTipp } from '@/lib/klicktipp/newsletter-formatter'
import { sendNotification } from '@/lib/email/mailer'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit/logger'
import { checkHwgGate } from '@/lib/compliance/hwg-gate'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await requireAuth()

  const { projectId, subjectA, subjectB, preheader, newsletterMarkdown, ctaText, ctaUrl } =
    await req.json()

  if (!projectId || !subjectA || !newsletterMarkdown) {
    return NextResponse.json(
      { error: 'projectId, subjectA und newsletterMarkdown sind erforderlich' },
      { status: 400 },
    )
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      name: true,
      praxisName: true,
      praxisUrl: true,
      ktListId: true,
      hwgFlag: true,
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const gate = checkHwgGate(project.hwgFlag ?? false)
  if (gate.blocked) {
    await writeAuditLog({
      action: 'klicktipp.campaign_blocked',
      entity: 'Project',
      entityId: projectId,
      projectId,
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      meta: { blocked: true, reason: gate.reason, channel: 'klicktipp' },
    })
    return NextResponse.json(
      { error: 'KlickTipp-Kampagne gesperrt: HWG-Compliance-Flag ist gesetzt.' },
      { status: 403 },
    )
  }

  let credentials: string
  try {
    credentials = await loadKtCredentials(projectId)
  } catch (exc: unknown) {
    logger.error({ exc, projectId }, '[Vysible] KT-Credentials nicht gefunden')
    return NextResponse.json({ error: 'Kein KlickTipp API-Key konfiguriert' }, { status: 400 })
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'KLICKTIPP', active: true },
    select: { model: true },
    orderBy: { createdAt: 'desc' },
  })

  const listId = project.ktListId ?? apiKey?.model ?? ''
  if (!listId) {
    return NextResponse.json(
      { error: 'Keine KlickTipp Listen-ID konfiguriert (Projekt oder globale Einstellungen)' },
      { status: 400 },
    )
  }

  const htmlBody = formatForKlickTipp({
    subject: subjectA,
    preheader: preheader ?? '',
    bodyText: newsletterMarkdown,
    ctaText: ctaText ?? undefined,
    ctaUrl: ctaUrl ?? undefined,
    praxisName: project.praxisName ?? project.name,
    praxisWebsite: project.praxisUrl,
  })

  const result = await createKlickTippCampaign(credentials, {
    name: `${subjectA} — ${new Date().toLocaleDateString('de-DE')}`,
    subjectA,
    subjectB: subjectB ?? undefined,
    htmlBody,
    listId,
  })

  await prisma.project.update({
    where: { id: projectId },
    data: { ktCampaignId: result.campaignId },
  })

  await writeAuditLog({
    action: 'klicktipp.campaign_created',
    entity: 'Project',
    entityId: projectId,
    projectId,
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    meta: { campaignId: result.campaignId, editUrl: result.editUrl },
  })

  await sendNotification(
    'draft_uploaded',
    project.name,
    `KlickTipp-Kampagne (Draft): "${subjectA}" — ID: ${result.campaignId}`,
  ).catch((err: unknown) => {
    logger.warn({ err, projectId }, '[Vysible] E-Mail-Benachrichtigung für KT-Kampagne fehlgeschlagen')
  })

  return NextResponse.json(result)
}
