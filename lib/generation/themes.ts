import { getAnthropicClient } from '@/lib/ai/client'
import { logger } from '@/lib/utils/logger'
import { trackCost } from '@/lib/costs/tracker'
import { getAppConfig } from './app-config'
import { buildContext } from '@/lib/ai/context-builder'
import { loadPrompt } from './prompt-loader'
import { ThemenItemSchema, ThemenListSchema, validateThemenQuality, type ThemenItem } from './themes-schema'
import { withRetry } from '@/lib/utils/retry'
import type { Project } from '@/lib/types/prisma'
import type { ScrapeResult } from '@/lib/scraper/client'

interface ThemesInput {
  project: Project
  scrapeResult?: ScrapeResult
  canvaContext?: string
}

export async function generateThemes(input: ThemesInput): Promise<ThemenItem[]> {
  const { project, scrapeResult, canvaContext } = input

  const context = buildContext({
    positioningDocument: project.positioningDocument ?? undefined,
    keywords: project.keywords,
    themenPool: project.themenPool ?? undefined,
    scrapeResult: scrapeResult
      ? {
          title: scrapeResult.title,
          h1: scrapeResult.h1,
          h2: scrapeResult.h2,
          services: scrapeResult.services,
          bodyText: scrapeResult.bodyText,
          contact: scrapeResult.contact,
        }
      : undefined,
  })

  const start = new Date(project.planningStart)
  const end = new Date(project.planningEnd)
  const zeitraumStart = start.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const zeitraumEnde = end.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  const canvaSection = canvaContext
    ? `\n\nVerfügbare Canva-Assets (für Bildgestaltung berücksichtigen):\n${canvaContext}`
    : ''

  const prompt = loadPrompt('themes', {
    praxisName: project.praxisName ?? project.praxisUrl,
    standort: extractStandort(scrapeResult),
    fachgebiet: project.fachgebiet ?? 'Allgemeinmedizin',
    zeitraumStart,
    zeitraumEnde,
    kanaele: project.channels.join(', '),
    positionierungsdokument: context.systemContext + canvaSection,
    keywords: project.keywords.join(', '),
  })

  const anthropic = await getAnthropicClient(project.apiKeyId ?? null)
  const cfg = await getAppConfig()

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: cfg.modelThemes,
      max_tokens: 8_192,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    }, { timeout: 120_000 })

    await trackCost({
      projectId: project.id,
      model: cfg.modelThemes,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      step: 'themes',
    })

    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const items = parseThemesJson(rawText).map((item) => ({
      ...item,
      istFrage: computeIstFrage(item.seoTitel, item.keywordPrimaer),
    }))
    const validation = validateThemenQuality(items, { minPraxisQuote: cfg.themesMinPraxisQuote, minSeoQuote: cfg.themesMinSeoQuote })

    if (!validation.ok) {
      logger.warn({ projectId: project.id, reason: validation.reason }, 'Themen-Qualitätskriterien nicht erfüllt — wird wiederholt')
      throw new Error(`Qualitätsprüfung fehlgeschlagen: ${validation.reason}`)
    }

    if (validation.warning) {
      logger.warn({ projectId: project.id, warning: validation.warning }, 'Themen-SEO-Qualitätshinweis (kein Abbruch)')
    }

    return items
  }, `anthropic.generateThemes(${project.id})`)
}

function parseThemesJson(text: string): ThemenItem[] {
  const fenced = text.match(/```(?:json)?[ \t]*\r?\n?([\s\S]*?)\r?\n?```/)
  const jsonText = fenced?.[1]?.trim() ?? extractJsonText(text)

  try {
    return ThemenListSchema.parse(JSON.parse(jsonText))
  } catch (_e) {
    // JSON abgeschnitten (max_tokens) → vollständige Objekte salvagen
    return salvageTruncatedArray(jsonText)
  }
}

function extractJsonText(text: string): string {
  const start = text.indexOf('[')
  if (start === -1) return text.trim()
  const end = text.lastIndexOf(']')
  return end > start ? text.slice(start, end + 1) : text.slice(start)
}

function salvageTruncatedArray(text: string): ThemenItem[] {
  const items: ThemenItem[] = []
  let depth = 0
  let objStart = -1

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') {
      if (depth === 0) objStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && objStart !== -1) {
        try {
          const result = ThemenItemSchema.safeParse(JSON.parse(text.slice(objStart, i + 1)))
          if (result.success) items.push(result.data)
        } catch (_e) { /* ungültiges Objekt überspringen */ }
        objStart = -1
      }
    }
  }

  if (items.length === 0) throw new Error('Keine gültigen Themen-Objekte in der Antwort gefunden')
  return items
}

/**
 * Berechnet deterministisch ob ein SEO-Titel als Frage formuliert ist
 * oder das Primärkeyword enthält. Ersetzt LLM-Self-Assessment für istFrage.
 *
 * Kriterien:
 *   (a) seoTitel endet mit '?' → Frage-Format
 *   (b) seoTitel enthält keywordPrimaer (case-insensitive) → Keyword-Präsenz
 */
export function computeIstFrage(seoTitel: string, keywordPrimaer: string): boolean {
  const t = seoTitel.trim()
  return t.endsWith('?') || t.toLowerCase().includes(keywordPrimaer.toLowerCase())
}

function extractStandort(scrapeResult?: ScrapeResult): string {
  if (!scrapeResult) return ''
  const addr = scrapeResult.contact.address
  if (addr) return addr
  return ''
}
