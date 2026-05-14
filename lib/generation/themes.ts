import { getAnthropicClient } from '@/lib/ai/client'
import { trackCost } from '@/lib/costs/tracker'
import { DEFAULT_MODEL } from '@/config/model-prices'
import { buildContext } from '@/lib/ai/context-builder'
import { loadPrompt } from './prompt-loader'
import { ThemenItemSchema, ThemenListSchema, validateThemenQuality, type ThemenItem } from './themes-schema'
import type { Project } from '@/lib/types/prisma'
import type { ScrapeResult } from '@/lib/scraper/client'

const MAX_RETRIES = 2

interface ThemesInput {
  project: Project
  scrapeResult?: ScrapeResult
}

export async function generateThemes(input: ThemesInput): Promise<ThemenItem[]> {
  const { project, scrapeResult } = input

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

  const prompt = loadPrompt('themes', {
    praxisName: project.praxisName ?? project.praxisUrl,
    standort: extractStandort(scrapeResult),
    fachgebiet: project.fachgebiet ?? 'Allgemeinmedizin',
    zeitraumStart,
    zeitraumEnde,
    kanaele: project.channels.join(', '),
    positionierungsdokument: context.systemContext,
    keywords: project.keywords.join(', '),
  })

  const anthropic = await getAnthropicClient()

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 8_192,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      })

      await trackCost({
        projectId: project.id,
        model: DEFAULT_MODEL,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        step: 'themes',
      })

      const rawText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')

      const items = parseThemesJson(rawText)
      const validation = validateThemenQuality(items)

      if (!validation.ok) {
        if (attempt < MAX_RETRIES) {
          console.log(`[Vysible] Themen-Qualitätsprüfung fehlgeschlagen (Versuch ${attempt + 1}): ${validation.reason}`)
          continue
        }
        console.warn(`[Vysible] Themen-Qualitätskriterien nicht erfüllt nach ${attempt + 1} Versuchen: ${validation.reason}`)
      }

      return items
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_RETRIES) {
        console.warn(`[Vysible] generateThemes Versuch ${attempt + 1} fehlgeschlagen: ${lastError.message}`)
      }
    }
  }

  throw lastError ?? new Error('Themenplanung fehlgeschlagen')
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

function extractStandort(scrapeResult?: ScrapeResult): string {
  if (!scrapeResult) return ''
  const addr = scrapeResult.contact.address
  if (addr) return addr
  return ''
}
