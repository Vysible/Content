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
import { DEFAULT_QUANTITIES, type ChannelQuantities, type SocialQuantity } from '@/lib/types/channel-quantities'

interface ThemesInput {
  project: Project
  scrapeResult?: ScrapeResult
  canvaContext?: string
}

// Returns all months (YYYY-MM) in [start, end] inclusive
function getMonthsInRange(start: Date, end: Date): string[] {
  const months: string[] = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cur <= last) {
    months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

// Split an array into chunks of at most `size`
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
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

  const canvaSection = canvaContext
    ? `\n\nVerfügbare Canva-Assets (für Bildgestaltung berücksichtigen):\n${canvaContext}`
    : ''

  const geplantThemenRaw = (project.geplantThemen as { monat: string; thema: string }[] | null) ?? []
  const geplantThemenSection = geplantThemenRaw.length > 0
    ? '\n\nBEREITS ABGESTIMMTE THEMEN (verbindlich — diese Themen MÜSSEN für den jeweiligen Monat verwendet werden):\n' +
      geplantThemenRaw.map(t => `- ${t.monat}: ${t.thema}`).join('\n')
    : ''

  const sharedContext = context.systemContext + canvaSection + geplantThemenSection
  const anthropic = await getAnthropicClient(project.apiKeyId ?? null)
  const cfg = await getAppConfig()

  // Split the planning period into 2-month chunks to avoid output token limits.
  // A full 7-month × 5-channel project exceeds 16K tokens in a single call.
  const allMonths = getMonthsInRange(new Date(project.planningStart), new Date(project.planningEnd))
  const batches = chunk(allMonths, 2)

  logger.info({ projectId: project.id, totalMonths: allMonths.length, batchCount: batches.length }, '[themes] Batch-Generierung gestartet')

  const allItems: ThemenItem[] = []

  for (const monthBatch of batches) {
    const batchStart = monthBatch[0]
    const batchEnd = monthBatch[monthBatch.length - 1]

    const [startYear, startMonth] = batchStart.split('-').map(Number)
    const [endYear, endMonth] = batchEnd.split('-').map(Number)
    const zeitraumStart = new Date(startYear, startMonth - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    const zeitraumEnde = new Date(endYear, endMonth - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

    // Filter geplantThemen to only those months in this batch
    const batchGeplant = geplantThemenRaw.filter(t => monthBatch.includes(t.monat))
    const batchGeplantSection = batchGeplant.length > 0
      ? '\n\nBEREITS ABGESTIMMTE THEMEN (verbindlich):\n' + batchGeplant.map(t => `- ${t.monat}: ${t.thema}`).join('\n')
      : ''

    const prompt = loadPrompt('themes', {
      praxisName: project.praxisName ?? project.praxisUrl,
      standort: extractStandort(scrapeResult),
      fachgebiet: project.fachgebiet ?? 'Allgemeinmedizin',
      zeitraumStart,
      zeitraumEnde,
      kanaele: project.channels.join(', '),
      positionierungsdokument: sharedContext + batchGeplantSection,
      keywords: project.keywords.join(', '),
      mengenplan: buildMengenplan(project),
    })

    const batchItems = await withRetry(async () => {
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

      return parseThemesJson(rawText).map((item) => ({
        ...item,
        istFrage: computeIstFrage(item.seoTitel, item.keywordPrimaer),
      }))
    }, `anthropic.generateThemes(${project.id})[${batchStart}–${batchEnd}]`)

    logger.info({ projectId: project.id, batch: `${batchStart}–${batchEnd}`, count: batchItems.length }, '[themes] Batch abgeschlossen')
    allItems.push(...batchItems)
  }

  const validation = validateThemenQuality(allItems, { minPraxisQuote: cfg.themesMinPraxisQuote, minSeoQuote: cfg.themesMinSeoQuote })

  if (!validation.ok) {
    logger.warn({ projectId: project.id, reason: validation.reason }, 'Themen-Qualitätskriterien nicht erfüllt')
    // Don't throw — return what we have rather than losing all generated data
    logger.warn({ projectId: project.id }, 'Qualitätscheck nicht bestanden, gebe trotzdem alle Themen zurück')
  }

  if (validation.warning) {
    logger.warn({ projectId: project.id, warning: validation.warning }, 'Themen-SEO-Qualitätshinweis')
  }

  return allItems
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
        } catch (e: unknown) { logger.warn({ err: e, objStart, pos: i }, '[Vysible] salvageTruncatedArray: JSON.parse fehlgeschlagen — Objekt übersprungen') }
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

function buildMengenplan(project: Project): string {
  const q = (project.channelQuantities as ChannelQuantities | null) ?? DEFAULT_QUANTITIES
  return project.channels.map(ch => {
    if (ch === 'SOCIAL_INSTAGRAM' || ch === 'SOCIAL_FACEBOOK' || ch === 'SOCIAL_LINKEDIN') {
      const sq = q[ch as keyof ChannelQuantities] as SocialQuantity | undefined
      const posts = sq?.posts ?? 4
      const stories = sq?.stories ?? 0
      return `${ch}: ${posts} Beiträge${stories > 0 ? ` + ${stories} Storys` : ''} pro Monat`
    }
    const count = (q[ch as keyof ChannelQuantities] as number | undefined) ?? 1
    return `${ch}: ${count} pro Monat`
  }).join('\n')
}

function extractStandort(scrapeResult?: ScrapeResult): string {
  if (!scrapeResult) return ''
  const addr = scrapeResult.contact.address
  if (addr) return addr
  return ''
}
