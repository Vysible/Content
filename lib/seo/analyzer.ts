export interface SeoAnalysis {
  keyword: string
  density: number
  occurrences: number
  wordCount: number
  titlePresent: boolean
  metaDescription: string
  metaDescriptionLength: number
  metaDescriptionOk: boolean
  headingsWithKeyword: number
  score: number
  suggestions: string[]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function analyzeSeo(opts: {
  title: string
  html: string
  keyword: string
  metaDescription?: string
}): SeoAnalysis {
  const { title, html, keyword, metaDescription = '' } = opts
  const kw = keyword.toLowerCase()

  const text = stripHtml(html).toLowerCase()
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  const occurrences = (text.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length
  const density = wordCount > 0 ? (occurrences / wordCount) * 100 : 0

  const titlePresent = title.toLowerCase().includes(kw)

  const metaDescriptionLength = metaDescription.length
  const metaDescriptionOk = metaDescriptionLength >= 120 && metaDescriptionLength <= 160

  const headingMatches = (html.match(/<h[1-6][^>]*>/gi) ?? []).length
  const headingsWithKeyword = (
    html.match(new RegExp(`<h[1-6][^>]*>[^<]*${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*<\/h[1-6]>`, 'gi')) ?? []
  ).length

  const suggestions: string[] = []
  if (!titlePresent) suggestions.push(`Keyword "${keyword}" fehlt im Titel`)
  if (density < 0.5) suggestions.push(`Keyword-Dichte zu gering (${density.toFixed(2)}%) — Ziel: 0,5–2%`)
  if (density > 3) suggestions.push(`Keyword-Dichte zu hoch (${density.toFixed(2)}%) — Risiko Keyword-Stuffing`)
  if (!metaDescriptionOk) {
    if (metaDescriptionLength === 0) suggestions.push('Meta-Description fehlt')
    else if (metaDescriptionLength < 120) suggestions.push(`Meta-Description zu kurz (${metaDescriptionLength} Zeichen) — Ziel: 120–160`)
    else suggestions.push(`Meta-Description zu lang (${metaDescriptionLength} Zeichen) — Ziel: 120–160`)
  }
  if (headingsWithKeyword === 0 && headingMatches > 0) suggestions.push('Keyword fehlt in allen Überschriften')
  if (wordCount < 300) suggestions.push(`Artikel zu kurz (${wordCount} Wörter) — Empfehlung: min. 300`)

  let score = 100
  if (!titlePresent) score -= 20
  if (density < 0.5 || density > 3) score -= 15
  if (!metaDescriptionOk) score -= 15
  if (headingsWithKeyword === 0 && headingMatches > 0) score -= 10
  if (wordCount < 300) score -= 10
  score = Math.max(0, score)

  return {
    keyword,
    density: Math.round(density * 100) / 100,
    occurrences,
    wordCount,
    titlePresent,
    metaDescription,
    metaDescriptionLength,
    metaDescriptionOk,
    headingsWithKeyword,
    score,
    suggestions,
  }
}
