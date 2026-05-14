import { chromium, type Page, type BrowserContext } from 'playwright'
import { checkRobots } from './robots'
import type { ScrapeResult, PageData, ScrapeRequest } from './types'

// Rate-Limiting: Min. 2s zwischen Requests an dieselbe Domain
const RATE_LIMIT_MS = 2000
const domainLastScrape = new Map<string, number>()

// Semaphore: max. 3 gleichzeitige Browser-Instanzen
let activeScrapes = 0
const MAX_CONCURRENT = 3
const waitQueue: Array<() => void> = []

function acquireSemaphore(): Promise<void> {
  return new Promise((resolve) => {
    if (activeScrapes < MAX_CONCURRENT) {
      activeScrapes++
      resolve()
    } else {
      waitQueue.push(() => {
        activeScrapes++
        resolve()
      })
    }
  })
}

function releaseSemaphore(): void {
  activeScrapes--
  const next = waitQueue.shift()
  if (next) next()
}

async function enforceRateLimit(domain: string): Promise<void> {
  const last = domainLastScrape.get(domain)
  if (last) {
    const elapsed = Date.now() - last
    if (elapsed < RATE_LIMIT_MS) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed))
    }
  }
  domainLastScrape.set(domain, Date.now())
}

// Extrahiert strukturierte Daten aus einer geladenen Seite (läuft im Browser-Kontext)
async function extractPageData(page: Page, domain: string): Promise<PageData> {
  return page.evaluate((dom: string) => {
    const title = document.title?.trim() ?? ''

    const description =
      (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content?.trim() ?? ''

    const h1 = Array.from(document.querySelectorAll('h1'))
      .map((el) => el.textContent?.trim() ?? '')
      .filter(Boolean)

    const h2 = Array.from(document.querySelectorAll('h2'))
      .map((el) => el.textContent?.trim() ?? '')
      .filter(Boolean)

    const h3 = Array.from(document.querySelectorAll('h3'))
      .map((el) => el.textContent?.trim() ?? '')
      .filter(Boolean)

    // Bereinigter Fließtext (ohne Nav, Header, Footer, Scripts)
    const body = document.body.cloneNode(true) as HTMLElement
    body.querySelectorAll('script, style, nav, header, footer, [aria-hidden="true"]').forEach((el) =>
      el.remove()
    )
    const bodyText = (body.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 5000)

    // Telefonnummern via tel:-Links
    const phones = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]'))
      .map((a) => a.href.replace('tel:', '').trim())
      .filter((v, i, arr) => arr.indexOf(v) === i)

    // E-Mail-Adressen via mailto:-Links
    const emails = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]'))
      .map((a) => a.href.replace('mailto:', '').split('?')[0].trim())
      .filter((v, i, arr) => arr.indexOf(v) === i)

    // Adresse: Schema.org, vCard oder Freitext-Heuristik
    const schemaAddress =
      document.querySelector('[itemprop="streetAddress"], .address, address')?.textContent?.trim() ?? ''

    // Interne Links für Level-1-Crawl
    const internalLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
      .map((a) => a.href)
      .filter((href) => {
        try {
          return new URL(href).hostname === dom && !href.includes('#') && !href.match(/\.(pdf|jpg|png|gif|zip|doc)/)
        } catch {
          return false
        }
      })
      .filter((v, i, arr) => arr.indexOf(v) === i)

    return { title, description, h1, h2, h3, bodyText, phones, emails, address: schemaAddress, internalLinks }
  }, domain)
}

// Bekannte medizinische/zahnmedizinische Fachbegriffe für Service-Extraktion
const MEDICAL_KEYWORDS = [
  'implant', 'aligner', 'invisalign', 'prophylax', 'bleaching', 'veneer',
  'zahnersatz', 'prothese', 'brücke', 'krone', 'wurzelkanal', 'zahnspange',
  'kfo', 'kieferorthopäd', 'parodontitis', 'parodontol',
  'gynäkolog', 'frauenarzt', 'dermatolog', 'hautarzt',
  'internist', 'allgemeinmedizin', 'hausarzt', 'kardiolog',
]

function extractServices(headings: string[]): string[] {
  return headings
    .filter((h) => MEDICAL_KEYWORDS.some((kw) => h.toLowerCase().includes(kw)))
    .map((h) => h.trim())
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 15)
}

export async function scrape(req: ScrapeRequest): Promise<ScrapeResult> {
  const { url, depth = 1 } = req

  let urlObj: URL
  try {
    urlObj = new URL(url)
  } catch {
    throw new Error(`Ungültige URL: ${url}`)
  }

  const domain = urlObj.hostname

  // robots.txt prüfen
  const allowed = await checkRobots(url)
  if (!allowed) {
    throw new Error(`robots.txt verbietet den Zugriff auf ${url} – Fallback: URL manuell eingeben`)
  }

  await acquireSemaphore()

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const context: BrowserContext = await browser.newContext({
      userAgent: 'Vysible-Content-Bot/1.0',
      viewport: { width: 1280, height: 800 },
      locale: 'de-DE',
    })

    // Startseite scrapen
    await enforceRateLimit(domain)
    const homePage = await context.newPage()
    await homePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const homeData = await extractPageData(homePage, domain)
    await homePage.close()

    const allH1: string[] = [...homeData.h1]
    const allH2: string[] = [...homeData.h2]
    const allH3: string[] = [...homeData.h3]
    let allBodyText = homeData.bodyText
    const allPhones: string[] = [...homeData.phones]
    const allEmails: string[] = [...homeData.emails]
    let address = homeData.address
    let pagesScraped = 1

    // Level 1: bis zu 4 interne Unterseiten scrapen (max. 2 Ebenen Tiefe lt. Plan)
    if (depth > 0 && homeData.internalLinks.length > 0) {
      const toVisit = homeData.internalLinks
        .filter((href) => href !== url)
        .slice(0, 4)

      for (const link of toVisit) {
        try {
          await enforceRateLimit(domain)
          const subPage = await context.newPage()
          await subPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 20_000 })
          const subData = await extractPageData(subPage, domain)
          await subPage.close()

          allH1.push(...subData.h1)
          allH2.push(...subData.h2)
          allH3.push(...subData.h3)
          allBodyText += ' ' + subData.bodyText.slice(0, 1500)
          allPhones.push(...subData.phones)
          allEmails.push(...subData.emails)
          if (!address && subData.address) address = subData.address
          pagesScraped++
        } catch (err) {
          console.warn(`[Playwright] Unterseite übersprungen: ${link} – ${(err as Error).message}`)
        }
      }
    }

    await context.close()

    const dedupe = <T>(arr: T[]): T[] => [...new Set(arr)]

    return {
      url,
      domain,
      title: homeData.title,
      description: homeData.description,
      h1: dedupe(allH1).slice(0, 10),
      h2: dedupe(allH2).slice(0, 25),
      h3: dedupe(allH3).slice(0, 25),
      bodyText: allBodyText.trim().slice(0, 8000),
      services: extractServices([...allH2, ...allH3]),
      contact: {
        phones: dedupe(allPhones),
        emails: dedupe(allEmails),
        address: address || undefined,
      },
      scrapedAt: new Date().toISOString(),
      pagesScraped,
    }
  } finally {
    await browser.close()
    releaseSemaphore()
  }
}
