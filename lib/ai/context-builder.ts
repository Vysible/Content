import type { ScrapeResult } from '@/lib/scraper/client'

// Approximation: 1 Token ≈ 4 Zeichen (Deutsch)
const CHARS_PER_TOKEN = 4
const MAX_POSITIONING_TOKENS = 4_000
const MAX_POSITIONING_CHARS = MAX_POSITIONING_TOKENS * CHARS_PER_TOKEN

export interface ContextInput {
  positioningDocument?: string
  keywords?: string[]
  themenPool?: string
  scrapeResult?: Pick<ScrapeResult, 'title' | 'h1' | 'h2' | 'services' | 'bodyText' | 'contact'>
  canvaContext?: string // Slice 17 – noch nicht aktiv
}

export interface BuiltContext {
  systemContext: string
  positioningTruncated: boolean
  estimatedTokens: number
  sections: string[] // welche Abschnitte enthalten sind (für UI-Anzeige)
}

/**
 * Baut den KI-Kontext nach Priorität (laut plan.md):
 * 1. Positionierungsdokument  (max. 4.000 Tokens)
 * 2. Canva-Asset-Kontext      (Slice 17, noch nicht aktiv)
 * 3. Keyword/PAA-Input
 * 4. Themen-Pool
 * 5. Homepage-Analyse
 */
export function buildContext(input: ContextInput): BuiltContext {
  const parts: string[] = []
  const sections: string[] = []
  let positioningTruncated = false

  // 1. Positionierungsdokument
  if (input.positioningDocument?.trim()) {
    let doc = input.positioningDocument.trim()
    if (doc.length > MAX_POSITIONING_CHARS) {
      doc = doc.slice(0, MAX_POSITIONING_CHARS) + '\n\n[... Dokument auf 4.000 Tokens gekürzt ...]'
      positioningTruncated = true
    }
    parts.push(`## Positionierungsdokument\n${doc}`)
    sections.push('Positionierungsdokument')
  }

  // 2. Canva-Asset-Kontext (Slice 17 – Platzhalter)
  if (input.canvaContext?.trim()) {
    parts.push(`## Canva-Assets\n${input.canvaContext.trim()}`)
    sections.push('Canva-Assets')
  }

  // 3. Keywords
  if (input.keywords?.length) {
    parts.push(`## Keywords\n${input.keywords.join(', ')}`)
    sections.push('Keywords')
  }

  // 4. Themen-Pool
  if (input.themenPool?.trim()) {
    parts.push(`## Bevorzugte Themen\n${input.themenPool.trim()}`)
    sections.push('Themen-Pool')
  }

  // 5. Homepage-Analyse
  if (input.scrapeResult) {
    const { title, h1, h2, services, bodyText, contact } = input.scrapeResult
    const lines: string[] = []
    if (title) lines.push(`Seitentitel: ${title}`)
    if (h1.length) lines.push(`H1: ${h1.join(' | ')}`)
    if (h2.length) lines.push(`H2: ${h2.slice(0, 10).join(' | ')}`)
    if (services.length) lines.push(`Erkannte Leistungen: ${services.join(', ')}`)
    if (contact.phones.length) lines.push(`Telefon: ${contact.phones.join(', ')}`)
    if (bodyText) lines.push(`\nInhalt (Auszug):\n${bodyText.slice(0, 2_000)}`)

    parts.push(`## Homepage-Analyse\n${lines.join('\n')}`)
    sections.push('Homepage-Analyse')
  }

  const systemContext = parts.join('\n\n')
  const estimatedTokens = Math.round(systemContext.length / CHARS_PER_TOKEN)

  return { systemContext, positioningTruncated, estimatedTokens, sections }
}

export function estimatePositioningTokens(text: string): number {
  return Math.round(text.length / CHARS_PER_TOKEN)
}
