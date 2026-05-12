export interface ScrapeRequest {
  url: string
  depth?: number // 0 = nur diese Seite, 1 = eine Ebene tiefer
}

export interface ContactInfo {
  phones: string[]
  emails: string[]
  address?: string
}

export interface ScrapeResult {
  url: string
  domain: string
  title: string
  description: string
  h1: string[]
  h2: string[]
  h3: string[]
  bodyText: string       // max. 8.000 Zeichen, bereinigt
  services: string[]     // Erkannte Leistungen/Fachgebiete
  contact: ContactInfo
  scrapedAt: string      // ISO 8601
  pagesScraped: number
}

export interface PageData {
  title: string
  description: string
  h1: string[]
  h2: string[]
  h3: string[]
  bodyText: string
  phones: string[]
  emails: string[]
  address: string
  internalLinks: string[]
}
