import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { trackCost } from '@/lib/costs/tracker'

export interface KeywordSuggestion {
  keyword: string
  searchVolume?: number
  cpc?: number
  type: 'autocomplete' | 'paa'
}

interface DataForSeoCredentials {
  login: string
  password: string
}

async function getCredentials(): Promise<DataForSeoCredentials> {
  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'DATASEO', active: true },
  })
  if (!apiKey) throw new Error('Kein aktiver DataForSEO-API-Key konfiguriert')
  // Format: login:password (AES-verschlüsselt)
  const decrypted = decrypt(apiKey.encryptedKey)
  const [login, password] = decrypted.split(':')
  if (!login || !password) throw new Error('DataForSEO-Key muss Format login:password haben')
  return { login, password }
}

function authHeader(creds: DataForSeoCredentials): string {
  return 'Basic ' + Buffer.from(`${creds.login}:${creds.password}`).toString('base64')
}

/** PAA + Autocomplete für Fachgebiet + Standort, max 5 Results je Typ */
export async function fetchKeywordSuggestions(
  fachgebiet: string,
  standort: string,
  projectId?: string
): Promise<KeywordSuggestion[]> {
  const creds = await getCredentials()
  const query = `${fachgebiet} ${standort}`.trim()

  const results: KeywordSuggestion[] = []

  // Autocomplete
  try {
    const res = await fetch('https://api.dataforseo.com/v3/keywords_data/google/search_volume/live', {
      method: 'POST',
      headers: {
        Authorization: authHeader(creds),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ keywords: [query], language_code: 'de', location_code: 2276 }]),
    })

    if (res.ok) {
      const data = await res.json()
      const items = data?.tasks?.[0]?.result ?? []
      for (const item of items.slice(0, 5)) {
        results.push({
          keyword: item.keyword,
          searchVolume: item.search_volume,
          cpc: item.cpc,
          type: 'autocomplete',
        })
      }

      // Kosten tracken
      const cost = data?.tasks?.[0]?.cost ?? 0
      if (cost > 0 && projectId) {
        await trackCost({ projectId, model: 'dataseo', inputTokens: 0, outputTokens: 0, step: 'dataseo' })
      }
    }
  } catch (err: unknown) {
    console.warn('[Vysible] [WARN] DataForSEO Autocomplete nicht erreichbar — graceful degradation:', err)
  }

  // PAA-Fragen via Related Keywords
  try {
    const res = await fetch('https://api.dataforseo.com/v3/keywords_data/google/related_keywords/live', {
      method: 'POST',
      headers: {
        Authorization: authHeader(creds),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ keyword: query, language_code: 'de', location_code: 2276, depth: 1 }]),
    })

    if (res.ok) {
      const data = await res.json()
      const items = data?.tasks?.[0]?.result?.[0]?.items ?? []
      for (const item of items.filter((i: { keyword: string }) => i.keyword?.includes('?')).slice(0, 5)) {
        results.push({ keyword: item.keyword, type: 'paa' })
      }
    }
  } catch (err: unknown) {
    console.warn('[Vysible] [WARN] DataForSEO PAA nicht erreichbar — graceful degradation:', err)
  }

  return results
}
