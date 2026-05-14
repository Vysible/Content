import JSZip from 'jszip'
import { buildBlogHtml, buildNewsletterHtml } from './html'
import { buildXlsx } from './xlsx'
import { buildDocx } from './docx'
import { buildPdf } from './pdf'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type { StoredTextResult } from '@/lib/generation/results-store'

interface ZipInput {
  praxisName: string
  praxisKuerzel: string // Kürzel für Dateinamen
  themes: ThemenItem[]
  textResults: StoredTextResult[]
  praxisAddress?: string
}

const DE_MONTHS: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mrz', 4: 'Apr', 5: 'Mai', 6: 'Jun',
  7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Dez',
}

/**
 * Dateinamen-Konvention: [PraxisKürzel]_[Kanal]_[MonatJahr]_v1.[ext]
 * Beispiel: WAR_Blog_Apr2027_v1.docx
 */
function filename(kuerzel: string, kanal: string, monat: string, ext: string): string {
  // monat = "2027-04" → "Apr2027"
  const [year, month] = monat.split('-')
  const monatLabel = DE_MONTHS[Number(month)] ?? month
  const monatFormatted = `${monatLabel}${year}`
  return `${kuerzel}_${kanal}_${monatFormatted}_v1.${ext}`
}

/**
 * Ableiten des Praxis-Kürzels aus dem Praxisnamen.
 * Regel: erste 3 Großbuchstaben des ersten (signifikanten) Worts.
 * Beispiel: "Zahnzentrum Warendorf" → "WAR" (zweites Wort, da "Zahnzentrum" generisch)
 * Fallback: "PRX" bei leerem oder zeichenlosem Namen.
 * Unit-Test: deriveFilePrefix('Zahnzentrum Warendorf') === 'WAR'
 */
export function deriveFilePrefix(name: string): string {
  const ascii = name
    .replace(/ä/gi, 'ae').replace(/ö/gi, 'oe').replace(/ü/gi, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()

  if (!ascii) return 'PRX'

  const words = ascii.split(/\s+/).filter(Boolean)

  // Generische Präfixe überspringen, wenn möglich
  const GENERIC = new Set(['praxis', 'zahnarzt', 'arzt', 'klinik', 'zentrum', 'zahnzentrum', 'gemeinschaftspraxis', 'dr', 'prof', 'med', 'dent'])
  const significant = words.find((w) => !GENERIC.has(w.toLowerCase())) ?? words[0]

  const prefix = significant!.toUpperCase().slice(0, 3)
  return prefix.length > 0 ? prefix : 'PRX'
}

function praxisKuerzel(name: string): string {
  return deriveFilePrefix(name)
}

export async function buildExportZip(input: ZipInput): Promise<Buffer> {
  const { praxisName, themes, textResults, praxisAddress } = input
  const kuerzel = input.praxisKuerzel || praxisKuerzel(praxisName)

  const zip = new JSZip()

  // ── Blog-HTML (je Artikel eine Datei) ──────────────────────────────────────
  const blogFolder = zip.folder('blog')!
  for (const r of textResults.filter((r) => r.blog)) {
    const html = buildBlogHtml(r, praxisName)
    blogFolder.file(filename(kuerzel, 'BLOG', r.monat, 'html'), html)
  }

  // ── Newsletter-HTML ────────────────────────────────────────────────────────
  const nlFolder = zip.folder('newsletter')!
  for (const r of textResults.filter((r) => r.newsletter)) {
    const html = buildNewsletterHtml(r, praxisName, praxisAddress)
    nlFolder.file(filename(kuerzel, 'NL', r.monat, 'html'), html)
  }

  // ── XLSX: Themenplan + Übersicht ───────────────────────────────────────────
  const xlsxBuffer = buildXlsx(themes, textResults, praxisName)
  zip.file(`${kuerzel}_Themenplan.xlsx`, xlsxBuffer)

  // ── DOCX: Blog + Newsletter ────────────────────────────────────────────────
  const docxBuffer = await buildDocx(textResults, praxisName)
  zip.file(`${kuerzel}_Content.docx`, docxBuffer)

  // ── PDF: Übersicht + Social ────────────────────────────────────────────────
  const pdfBuffer = await buildPdf(textResults, praxisName)
  zip.file(`${kuerzel}_Uebersicht.pdf`, pdfBuffer)

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
