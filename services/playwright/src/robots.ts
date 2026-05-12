interface CacheEntry {
  disallowed: string[]
  allowed: string[]
  cachedAt: number
}

// Domain → parse result (10 Min. TTL)
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 10 * 60 * 1000

function parseRobotsTxt(text: string): { disallowed: string[]; allowed: string[] } {
  const lines = text.split('\n').map((l) => {
    const hash = l.indexOf('#')
    return (hash >= 0 ? l.slice(0, hash) : l).trim()
  })

  const disallowed: string[] = []
  const allowed: string[] = []
  let inRelevantBlock = false

  for (const line of lines) {
    if (line === '') {
      inRelevantBlock = false
      continue
    }

    const colonIdx = line.indexOf(':')
    if (colonIdx < 0) continue

    const field = line.slice(0, colonIdx).trim().toLowerCase()
    const value = line.slice(colonIdx + 1).trim()

    if (field === 'user-agent') {
      inRelevantBlock = value === '*' || value.toLowerCase().includes('vysible')
    } else if (inRelevantBlock) {
      if (field === 'disallow' && value) disallowed.push(value)
      if (field === 'allow' && value) allowed.push(value)
    }
  }

  return { disallowed, allowed }
}

function isPathDisallowed(disallowed: string[], allowed: string[], path: string): boolean {
  for (const rule of disallowed) {
    if (path.startsWith(rule)) {
      // Spezifischeres Allow überschreibt
      const overridden = allowed.some((a) => a.length > rule.length && path.startsWith(a))
      if (!overridden) return true
    }
  }
  return false
}

export async function checkRobots(url: string): Promise<boolean> {
  let urlObj: URL
  try {
    urlObj = new URL(url)
  } catch {
    return false
  }

  const domain = urlObj.hostname
  const robotsUrl = `${urlObj.protocol}//${domain}/robots.txt`
  const cacheKey = domain

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return !isPathDisallowed(cached.disallowed, cached.allowed, urlObj.pathname)
  }

  try {
    const res = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Vysible-Content-Bot/1.0' },
    })

    if (!res.ok) {
      // Kein robots.txt → alles erlaubt
      cache.set(cacheKey, { disallowed: [], allowed: [], cachedAt: Date.now() })
      return true
    }

    const text = await res.text()
    const parsed = parseRobotsTxt(text)
    cache.set(cacheKey, { ...parsed, cachedAt: Date.now() })

    return !isPathDisallowed(parsed.disallowed, parsed.allowed, urlObj.pathname)
  } catch {
    // Fehler beim Abruf → fail open (Scraping erlaubt)
    return true
  }
}
