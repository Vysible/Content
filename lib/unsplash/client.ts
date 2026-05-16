import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const UNSPLASH_BASE = 'https://api.unsplash.com'

export async function searchUnsplash(query: string, count = 5): Promise<string[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    logger.warn('[Vysible] UNSPLASH_ACCESS_KEY nicht konfiguriert — keine Links generiert')
    return []
  }

  return withRetry(async () => {
    const res = await fetch(
      `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    )
    if (!res.ok) throw new Error(`Unsplash API ${res.status}`)
    const data = await res.json() as { results: Array<{ urls: { regular: string } }> }
    return data.results.map((r) => r.urls.regular)
  }, 'unsplash.search')
}
