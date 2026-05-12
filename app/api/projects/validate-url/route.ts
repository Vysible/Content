import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { checkRobotsRemote } from '@/lib/scraper/client'

const schema = z.object({
  url: z.string().url('Ungültige URL'),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { valid: false, reachable: false, robotsAllowed: false, error: 'Ungültige URL' },
      { status: 400 }
    )
  }

  const { url } = parsed.data

  // HTTP-Erreichbarkeit prüfen
  let reachable = false
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'Vysible-Content-Bot/1.0' },
    })
    reachable = res.ok || res.status === 405 // 405 = HEAD not supported → trotzdem erreichbar
  } catch {
    return NextResponse.json({ valid: true, reachable: false, robotsAllowed: false, error: 'URL nicht erreichbar' })
  }

  if (!reachable) {
    return NextResponse.json({ valid: true, reachable: false, robotsAllowed: false, error: `URL nicht erreichbar` })
  }

  // robots.txt prüfen via Playwright-Service
  let robotsAllowed = true
  try {
    robotsAllowed = await checkRobotsRemote(url)
  } catch {
    // Playwright-Service nicht verfügbar → Warnung, aber nicht blockieren
    return NextResponse.json({ valid: true, reachable: true, robotsAllowed: true, warning: 'robots.txt konnte nicht geprüft werden (Scraper-Service nicht erreichbar)' })
  }

  if (!robotsAllowed) {
    return NextResponse.json({ valid: true, reachable: true, robotsAllowed: false, error: 'robots.txt verbietet den Zugriff. Bitte URL manuell eingeben oder Fallback nutzen.' })
  }

  return NextResponse.json({ valid: true, reachable: true, robotsAllowed: true })
}
