import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type { StoredTextResult } from '@/lib/generation/results-store'

const KANAL_LABELS: Record<string, string> = {
  BLOG: 'Blog',
  NEWSLETTER: 'Newsletter',
  SOCIAL_INSTAGRAM: 'Instagram',
  SOCIAL_FACEBOOK: 'Facebook',
  SOCIAL_LINKEDIN: 'LinkedIn',
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      name: true,
      praxisName: true,
      themeResults: true,
      textResults: true,
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const themes = (project.themeResults as unknown as ThemenItem[] | null) ?? []
  const textResults = (project.textResults as unknown as StoredTextResult[] | null) ?? []

  if (themes.length === 0) {
    return NextResponse.json({ error: 'Keine Pläne vorhanden' }, { status: 422 })
  }

  const wb = XLSX.utils.book_new()

  // Sheet 1: Themenplan
  const themenRows = themes.map((t) => ({
    Monat: t.monat,
    Titel: t.seoTitel,
    Kanal: KANAL_LABELS[t.kanal] ?? t.kanal,
    Funnel: t.funnelStufe,
    HWG: t.hwgFlag,
    'Keyword (primär)': t.keywordPrimaer,
    'Keywords (sekundär)': t.keywordSekundaer.join(', '),
    CTA: t.cta,
    Priorität: t.prioritaet,
    Thema: t.thema,
    Zielgruppe: t.zielgruppe,
    Kategorie: t.kategorie,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(themenRows), 'Themenplan')

  // Sheet 2: Redaktionsplan
  const redaktionsRows = themes.map((t) => ({
    Monat: t.monat,
    Kanal: KANAL_LABELS[t.kanal] ?? t.kanal,
    Titel: t.seoTitel,
    'Keyword (primär)': t.keywordPrimaer,
    CTA: t.cta,
    Funnel: t.funnelStufe,
    'PAA-Fragen': t.paaFragen.join(' | '),
    'Content-Winkel': t.contentWinkel,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(redaktionsRows), 'Redaktionsplan')

  // Sheet 3: Blog-Gliederungen (nur wenn vorhanden)
  const blogWithOutlines = textResults.filter((r) => r.blog?.outline)
  if (blogWithOutlines.length > 0) {
    const outlineRows = blogWithOutlines.map((r) => ({
      Monat: r.monat,
      Titel: r.titel,
      Gliederung: r.blog!.outline ?? '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(outlineRows), 'Blog-Gliederungen')
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const safeName = (project.praxisName ?? project.name).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)

  return new Response(buf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeName}_Plaene.xlsx"`,
      'Content-Length': String(buf.length),
    },
  })
}
