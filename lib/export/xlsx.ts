import * as XLSX from 'xlsx'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type { StoredTextResult } from '@/lib/generation/results-store'
import { BLOG_STATUS_LABELS, NEWSLETTER_STATUS_LABELS, SOCIAL_STATUS_LABELS } from '@/lib/generation/results-store'

const FUNNEL_LABELS: Record<string, string> = {
  Awareness: 'Awareness',
  Consideration: 'Consideration',
  Decision: 'Decision',
  Retention: 'Retention',
}
const KANAL_LABELS: Record<string, string> = {
  BLOG: 'Blog',
  NEWSLETTER: 'Newsletter',
  SOCIAL_INSTAGRAM: 'Instagram',
  SOCIAL_FACEBOOK: 'Facebook',
  SOCIAL_LINKEDIN: 'LinkedIn',
}

export function buildXlsx(
  themes: ThemenItem[],
  textResults: StoredTextResult[],
  praxisName: string
): Buffer {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Themenplan
  const themenRows = themes.map((t) => ({
    Monat: t.monat,
    Titel: t.seoTitel,
    Kanal: KANAL_LABELS[t.kanal] ?? t.kanal,
    Funnel: FUNNEL_LABELS[t.funnelStufe] ?? t.funnelStufe,
    HWG: t.hwgFlag,
    Keyword: t.keywordPrimaer,
    Praxisspezifisch: t.praxisspezifisch ? 'Ja' : 'Nein',
    'SEO/Frage': t.istFrage ? 'Ja' : 'Nein',
    Kategorie: t.kategorie,
    Priorität: t.prioritaet,
    CTA: t.cta,
  }))
  const wsThemen = XLSX.utils.json_to_sheet(themenRows)
  XLSX.utils.book_append_sheet(wb, wsThemen, 'Themenplan')

  // Sheet 2: Blog
  const blogRows = textResults
    .filter((r) => r.blog)
    .map((r) => ({
      Monat: r.monat,
      Titel: r.titel,
      Keyword: r.blog!.keyword,
      Wörter: r.blog!.wordCount,
      Status: BLOG_STATUS_LABELS[r.blogStatus ?? 'ausstehend'],
    }))
  if (blogRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(blogRows), 'Blog')
  }

  // Sheet 3: Newsletter
  const nlRows = textResults
    .filter((r) => r.newsletter)
    .map((r) => ({
      Monat: r.monat,
      Titel: r.titel,
      'Betreff A': r.newsletter!.betreffA,
      'Betreff B': r.newsletter!.betreffB,
      Preheader: r.newsletter!.preheader,
      Status: NEWSLETTER_STATUS_LABELS[r.newsletterStatus ?? 'ausstehend'],
    }))
  if (nlRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nlRows), 'Newsletter')
  }

  // Sheet 4: Social
  const socialRows = textResults
    .flatMap((r) =>
      (r.socialPosts ?? []).map((p) => ({
        Monat: r.monat,
        Thema: r.titel,
        Kanal: KANAL_LABELS[p.kanal] ?? p.kanal,
        Text: p.text,
        Zeichen: p.text.length,
        Status: SOCIAL_STATUS_LABELS[r.socialStatus ?? 'ausstehend'],
      }))
    )
  if (socialRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(socialRows), 'Social Media')
  }

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
