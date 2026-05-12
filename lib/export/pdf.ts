import PDFDocument from 'pdfkit'
import type { StoredTextResult } from '@/lib/generation/results-store'

/** Generiert ein PDF mit Themenplan-Übersicht + Social-Media-Posts */
export async function buildPdf(
  textResults: StoredTextResult[],
  praxisName: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Titelseite
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(`${praxisName}`, { align: 'center' })
      .fontSize(14)
      .font('Helvetica')
      .text('Content-Paket – Übersicht', { align: 'center' })
      .moveDown(2)

    // Inhaltszusammenfassung
    const blogs = textResults.filter((r) => r.blog)
    const newsletters = textResults.filter((r) => r.newsletter)
    const socialItems = textResults.filter((r) => r.socialPosts?.length)

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Inhalt dieses Pakets:', { underline: false })
      .font('Helvetica')
      .text(`• ${blogs.length} Blog-Beiträge`)
      .text(`• ${newsletters.length} Newsletter`)
      .text(`• ${socialItems.length} Social-Media-Themen`)
      .text(`• ${textResults.length} Bildbriefings`)
      .moveDown(2)

    // Social-Media-Posts
    if (socialItems.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Social Media Posts').moveDown(0.5)

      for (const r of socialItems) {
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`${r.monat} – ${r.titel}`)
          .font('Helvetica')
          .fontSize(10)

        for (const post of r.socialPosts ?? []) {
          const label = post.kanal.replace('SOCIAL_', '')
          doc
            .font('Helvetica-Bold')
            .text(`${label}:`, { continued: true })
            .font('Helvetica')
            .text(` ${post.text}`)
        }
        doc.moveDown(0.5)
      }
    }

    // Blog-Titel-Übersicht
    if (blogs.length > 0) {
      doc.addPage()
      doc.fontSize(16).font('Helvetica-Bold').text('Blog-Beiträge').moveDown(0.5)

      for (const r of blogs) {
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(r.titel)
          .fontSize(10)
          .font('Helvetica')
          .text(`${r.monat} · ${r.blog!.keyword} · ${r.blog!.wordCount} Wörter`)
          .moveDown(0.3)
      }
    }

    doc.end()
  })
}
