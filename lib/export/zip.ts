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

/**
 * Dateinamen-Konvention: [PraxisKürzel]_[Kanal]_[MonatJahr]_v1.[ext]
 */
function filename(kuerzel: string, kanal: string, monat: string, ext: string): string {
  const monatFormatted = monat.replace('-', '') // "2026-01" → "202601"
  return `${kuerzel}_${kanal}_${monatFormatted}_v1.${ext}`
}

function praxisKuerzel(name: string): string {
  return name
    .replace(/[^a-zA-ZäöüÄÖÜß\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join('')
    || 'PRAXIS'
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
