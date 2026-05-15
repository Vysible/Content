import { withRetry } from '@/lib/utils/retry'
import { trackCost } from '@/lib/costs/tracker'
import { logger } from '@/lib/utils/logger'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'

const DATASEO_BASE = 'https://api.dataforseo.com/v3'
const USD_TO_EUR = 0.92

export interface DataForSeoKeyword {
  keyword: string
  searchVolume: number | null
  cpc: number | null
}

export interface KeywordSuggestion {
  keyword: string
  searchVolume?: number
  cpc?: number
  type: 'autocomplete' | 'paa'
}

interface DataForSeoSerpSubItem {
  title?: string
}

interface DataForSeoResultItem {
  keyword?: string
  search_volume?: number
  cpc?: number
  type?: string
  items?: DataForSeoSerpSubItem[]
}

interface DataForSeoTask {
  cost?: number
  result?: Array<{
    items?: DataForSeoResultItem[]
  }>
}

interface DataForSeoResponse {
  tasks?: DataForSeoTask[]
  status_code?: number
  status_message?: string
}

interface DataForSeoCredentials {
  login: string
  password: string
}

async function getCredentials(createdById?: string): Promise<DataForSeoCredentials> {
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      provider: 'DATASEO',
      active: true,
      ...(createdById ? { createdById } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!apiKey) {
    throw new Error('Kein aktiver DataForSEO-API-Key konfiguriert')
  }

  const decrypted = decrypt(apiKey.encryptedKey)
  const [login, password] = decrypted.split(':')
  if (!login || !password) {
    throw new Error('DataForSEO-Key muss Format login:password haben')
  }

  return { login, password }
}

function getCostUsd(data: DataForSeoResponse): number {
  return data.tasks?.reduce((sum, task) => sum + (task.cost ?? 0), 0) ?? 0
}

function parseKeywordsForKeywords(data: DataForSeoResponse): DataForSeoKeyword[] {
  const items = data.tasks?.[0]?.result?.[0]?.items ?? []
  return items
    .map((item) => ({
      keyword: item.keyword ?? '',
      searchVolume: item.search_volume ?? null,
      cpc: item.cpc ?? null,
    }))
    .filter((item) => Boolean(item.keyword))
}

function parsePaaFromSerp(data: DataForSeoResponse): string[] {
  const items = data.tasks?.[0]?.result?.[0]?.items ?? []
  return items
    .filter((item) => item.type === 'people_also_ask')
    .flatMap((item) => item.items?.map((subItem) => subItem.title?.trim() ?? '') ?? [])
    .filter(Boolean)
    .slice(0, 10)
}

export async function fetchKeywordsForKeywords(
  keywords: string[],
  location: string,
  projectId: string | undefined,
  authHeader: string,
): Promise<DataForSeoKeyword[]> {
  return withRetry(async () => {
    const response = await fetch(`${DATASEO_BASE}/keywords_data/google_ads/keywords_for_keywords/live`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          keywords,
          language_code: 'de',
          location_name: location || 'Germany',
        },
      ]),
    })

    if (!response.ok) {
      throw new Error(`DataForSEO HTTP ${response.status}`)
    }

    const data = await response.json() as DataForSeoResponse
    const costUsd = getCostUsd(data)
    if (costUsd > 0) {
      await trackCost({
        projectId,
        model: 'dataseo',
        inputTokens: 0,
        outputTokens: 0,
        costEur: costUsd * USD_TO_EUR,
        step: 'dataseo',
      })
    }

    return parseKeywordsForKeywords(data)
  }, 'dataseo.keywords_for_keywords')
}

export async function fetchPaaQuestions(
  keyword: string,
  location: string,
  projectId: string | undefined,
  authHeader: string,
): Promise<string[]> {
  return withRetry(async () => {
    const response = await fetch(`${DATASEO_BASE}/serp/google/organic/live/advanced`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          keyword,
          language_code: 'de',
          location_name: location || 'Germany',
          depth: 10,
        },
      ]),
    })

    if (!response.ok) {
      throw new Error(`DataForSEO PAA HTTP ${response.status}`)
    }

    const data = await response.json() as DataForSeoResponse
    const costUsd = getCostUsd(data)
    if (costUsd > 0) {
      await trackCost({
        projectId,
        model: 'dataseo',
        inputTokens: 0,
        outputTokens: 0,
        costEur: costUsd * USD_TO_EUR,
        step: 'dataseo',
      })
    }

    return parsePaaFromSerp(data)
  }, 'dataseo.serp_paa')
}

/** Backward-compatible helper for existing project keywords route */
export async function fetchKeywordSuggestions(
  fachgebiet: string,
  standort: string,
  projectId?: string,
  createdById?: string,
): Promise<KeywordSuggestion[]> {
  const query = `${fachgebiet} ${standort}`.trim()
  const seedKeyword = query || fachgebiet
  if (!seedKeyword) return []

  try {
    const creds = await getCredentials(createdById)
    const authHeader = Buffer.from(`${creds.login}:${creds.password}`).toString('base64')
    const keywords = await fetchKeywordsForKeywords([seedKeyword], standort || 'Germany', projectId, authHeader)
    const paaQuestions = await fetchPaaQuestions(seedKeyword, standort || 'Germany', projectId, authHeader)

    const result: KeywordSuggestion[] = []
    for (const item of keywords) {
      result.push({
        keyword: item.keyword,
        searchVolume: item.searchVolume ?? undefined,
        cpc: item.cpc ?? undefined,
        type: 'autocomplete',
      })
    }
    for (const question of paaQuestions) {
      result.push({ keyword: question, type: 'paa' })
    }
    return result
  } catch (err: unknown) {
    logger.warn({ err }, 'DataForSEO Keyword Suggestions nicht erreichbar — graceful degradation')
    return []
  }
}
