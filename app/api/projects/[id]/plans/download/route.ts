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

  const SOCIAL_KANAELE = new Set(['SOCIAL_INSTAGRAM', 'SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN'])

  const wb = XLSX.utils.book_new()

  // Sheet 1: Blog
  const blogThemes = themes.filter((t) => t.kanal === 'BLOG')
  if (blogThemes.length > 0) {
    const rows = blogThemes.map((t) => ({
      Monat: t.monat,
      Titel: t.seoTitel,
      Thema: t.thema,
      Kategorie: t.kategorie,
      Funnel: t.funnelStufe,
      'Keyword (primär)': t.keywordPrimaer,
      'Keywords (sekundär)': t.keywordSekundaer.join(', '),
      'PAA-Fragen': t.paaFragen.join(' | '),
      'Content-Winkel': t.contentWinkel,
      CTA: t.cta,
      Priorität: t.prioritaet,
      HWG: t.hwgFlag,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Blog')
  }

  // Sheet 2: Newsletter
  const newsletterThemes = themes.filter((t) => t.kanal === 'NEWSLETTER')
  if (newsletterThemes.length > 0) {
    const rows = newsletterThemes.map((t) => ({
      Monat: t.monat,
      Titel: t.seoTitel,
      Thema: t.thema,
      Funnel: t.funnelStufe,
      'Keyword (primär)': t.keywordPrimaer,
      'Content-Winkel': t.contentWinkel,
      CTA: t.cta,
      Priorität: t.prioritaet,
      HWG: t.hwgFlag,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Newsletter')
  }

  // Sheet 3: Social Media (Instagram + Facebook + LinkedIn)
  const socialThemes = themes.filter((t) => SOCIAL_KANAELE.has(t.kanal))
  if (socialThemes.length > 0) {
    const rows = socialThemes.map((t) => ({
      Monat: t.monat,
      Kanal: KANAL_LABELS[t.kanal] ?? t.kanal,
      Titel: t.seoTitel,
      Thema: t.thema,
      Zielgruppe: t.zielgruppe,
      Funnel: t.funnelStufe,
      'Keyword (primär)': t.keywordPrimaer,
      'Content-Winkel': t.contentWinkel,
      CTA: t.cta,
      HWG: t.hwgFlag,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Social Media')
  }

  // Sheet 4: Blog-Gliederungen (nur wenn vorhanden)
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
