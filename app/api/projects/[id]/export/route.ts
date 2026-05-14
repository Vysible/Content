import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { buildExportZip } from '@/lib/export/zip'
import { NextResponse } from 'next/server'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type { StoredTextResult } from '@/lib/generation/results-store'
import { writeAuditLog } from '@/lib/audit/logger'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      name: true,
      praxisName: true,
      praxisUrl: true,
      themeResults: true,
      textResults: true,
      hwgFlag: true,
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  if (project.hwgFlag) {
    await writeAuditLog({
      action:    'export.download',
      entity:    'Project',
      entityId:  params.id,
      projectId: params.id,
      userId:    session.user.id,
      userEmail: session.user.email ?? undefined,
      meta:      { blocked: true, reason: 'hwg_flag' },
    })
    return NextResponse.json(
      { error: 'Export gesperrt: HWG-Compliance-Flag ist gesetzt. Bitte Inhalt prüfen und Flag zurücksetzen.' },
      { status: 403 }
    )
  }

  const themes = (project.themeResults as unknown as ThemenItem[] | null) ?? []
  const textResults = (project.textResults as unknown as StoredTextResult[] | null) ?? []

  if (themes.length === 0 && textResults.length === 0) {
    return NextResponse.json({ error: 'Keine Ergebnisse zum Exportieren' }, { status: 422 })
  }

  // Mindestens ein Artefakt muss einen Status != 'ausstehend' haben
  const hasReviewed =
    textResults.some((r: StoredTextResult) => r.blogStatus && r.blogStatus !== 'ausstehend') ||
    textResults.some((r: StoredTextResult) => r.newsletterStatus && r.newsletterStatus !== 'ausstehend') ||
    textResults.some((r: StoredTextResult) => r.socialStatus && r.socialStatus !== 'ausstehend')

  if (!hasReviewed) {
    return NextResponse.json(
      { error: 'Bitte mindestens einen Status auf „In Bearbeitung" oder höher setzen, bevor der Export gestartet wird.' },
      { status: 422 }
    )
  }

  const praxisName = project.praxisName ?? project.name

  const zipBuffer = await buildExportZip({
    praxisName,
    praxisKuerzel: '',
    themes,
    textResults,
  })

  const safeName = praxisName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
  const filename = `${safeName}_Content.zip`

  await writeAuditLog({
    action:    'export.download',
    entity:    'Project',
    entityId:  params.id,
    projectId: params.id,
    userId:    session.user.id,
    userEmail: session.user.email ?? undefined,
    meta:      { filename },
  })

  return new Response(zipBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(zipBuffer.length),
    },
  })
}
