import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { buildExportZip } from '@/lib/export/zip'
import { NextResponse } from 'next/server'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type { StoredTextResult } from '@/lib/generation/results-store'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      name: true,
      praxisName: true,
      praxisUrl: true,
      themeResults: true,
      textResults: true,
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const themes = (project.themeResults as unknown as ThemenItem[] | null) ?? []
  const textResults = (project.textResults as unknown as StoredTextResult[] | null) ?? []

  if (themes.length === 0 && textResults.length === 0) {
    return NextResponse.json({ error: 'Keine Ergebnisse zum Exportieren' }, { status: 422 })
  }

  // Mindestens ein Artefakt muss einen Status != 'ausstehend' haben
  const hasReviewed =
    textResults.some((r) => r.blogStatus && r.blogStatus !== 'ausstehend') ||
    textResults.some((r) => r.newsletterStatus && r.newsletterStatus !== 'ausstehend') ||
    textResults.some((r) => r.socialStatus && r.socialStatus !== 'ausstehend')

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

  return new Response(zipBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(zipBuffer.length),
    },
  })
}
