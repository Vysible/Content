export interface ScrapeResult {
  url: string
  domain: string
  title: string
  description: string
  h1: string[]
  h2: string[]
  h3: string[]
  bodyText: string
  services: string[]
  contact: {
    phones: string[]
    emails: string[]
    address?: string
  }
  scrapedAt: string
  pagesScraped: number
}

function getServiceUrl(): string {
  return process.env.PLAYWRIGHT_SERVICE_URL ?? 'http://playwright:3001'
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const res = await fetch(`${getServiceUrl()}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, depth: 1 }),
    signal: AbortSignal.timeout(90_000),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error ?? `Scraper-Fehler: HTTP ${res.status}`)
  }

  return data as ScrapeResult
}

export async function checkScraperHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getServiceUrl()}/health`, {
      signal: AbortSignal.timeout(5_000),
    })
    return res.ok
  } catch {
    return false
  }
}
