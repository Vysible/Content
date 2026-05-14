import { getAnthropicClient } from '@/lib/ai/client'
import { trackCost } from '@/lib/costs/tracker'
import { DEFAULT_MODEL } from '@/config/model-prices'
import { buildContext } from '@/lib/ai/context-builder'
import { loadPrompt } from './prompt-loader'
import { ThemenListSchema, validateThemenQuality, type ThemenItem } from './themes-schema'
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
        max_tokens: 4_096,
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
  if (fenced?.[1]) {
    return ThemenListSchema.parse(JSON.parse(fenced[1].trim()))
  }
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end > start) {
    return ThemenListSchema.parse(JSON.parse(text.slice(start, end + 1)))
  }
  return ThemenListSchema.parse(JSON.parse(text.trim()))
}

function extractStandort(scrapeResult?: ScrapeResult): string {
  if (!scrapeResult) return ''
  const addr = scrapeResult.contact.address
  if (addr) return addr
  return ''
}
