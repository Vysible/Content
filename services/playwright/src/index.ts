import express from 'express'
import { scrape } from './scraper'
import { checkRobots } from './robots'
import type { ScrapeRequest } from './types'

const app = express()
app.use(express.json())

// Health-Check für Docker + Coolify
app.get('/health', (_req, res) => {
  res.status(200).send('ok')
})

// POST /scrape – Hauptendpoint
app.post('/scrape', async (req, res) => {
  const { url, depth } = req.body as ScrapeRequest

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url (string) erforderlich' })
    return
  }

  try {
    new URL(url)
  } catch {
    res.status(400).json({ error: 'Ungültige URL' })
    return
  }

  const safeDepth = Math.min(Math.max(Number(depth ?? 1) || 1, 0), 2)

  console.log(`[Playwright] Scrape: ${url} (depth=${safeDepth})`)

  try {
    const result = await scrape({ url, depth: safeDepth })
    console.log(`[Playwright] Fertig: ${url} – ${result.pagesScraped} Seiten`)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    console.error(`[Playwright] Fehler: ${url} – ${message}`)
    const robotsBlocked = message.includes('robots.txt')
    res.status(robotsBlocked ? 403 : 400).json({
      error: message,
      robotsBlocked,
      ...(robotsBlocked && { fallbackHint: 'Bitte Praxistext manuell eingeben (mind. 200 Zeichen)' }),
    })
  }
})

// POST /robots-check – schnelle robots.txt-Prüfung ohne Scraping
app.post('/robots-check', async (req, res) => {
  const { url } = req.body as { url?: string }
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url erforderlich' })
    return
  }
  try {
    const allowed = await checkRobots(url)
    res.json({ allowed })
  } catch {
    res.json({ allowed: true }) // fail open
  }
})

const PORT = Number(process.env.PORT ?? 3001)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Playwright] Service läuft auf Port ${PORT}`)
})
