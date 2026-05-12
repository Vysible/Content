import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { scrapeUrl, checkScraperHealth } from '@/lib/scraper/client'

const scrapeSchema = z.object({
  url: z.string().url('Ungültige URL'),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = scrapeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Ungültige Eingabe' }, { status: 400 })
  }

  const { url } = parsed.data

  // Vor dem Scrapen: HTTP-Erreichbarkeit prüfen
  try {
    const headRes = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10_000),
    })
    if (!headRes.ok && headRes.status !== 405) {
      return NextResponse.json({ error: `URL nicht erreichbar: HTTP ${headRes.status}` }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: `URL nicht erreichbar: ${url}` }, { status: 400 })
  }

  try {
    const result = await scrapeUrl(url)
    console.log(`[Vysible] Scrape abgeschlossen: ${url} – ${result.pagesScraped} Seiten (User: ${session.user.id})`)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scraper-Fehler'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// Health-Check: Playwright-Service erreichbar?
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const healthy = await checkScraperHealth()
  return NextResponse.json({
    playwright: healthy ? 'ok' : 'nicht erreichbar',
    url: process.env.PLAYWRIGHT_SERVICE_URL ?? 'http://playwright:3001',
  })
}
