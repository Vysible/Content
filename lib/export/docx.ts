import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
} from 'docx'
import type { StoredTextResult } from '@/lib/generation/results-store'

/** Generiert ein DOCX mit allen Blog-Beiträgen und Newslettern */
export async function buildDocx(
  textResults: StoredTextResult[],
  praxisName: string
): Promise<Buffer> {
  const children: Paragraph[] = []

  // Titelseite
  children.push(
    new Paragraph({
      text: `${praxisName} – Content-Paket`,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({ text: '' })
  )

  // Blog-Beiträge
  const blogResults = textResults.filter((r) => r.blog)
  if (blogResults.length > 0) {
    children.push(
      new Paragraph({ text: 'Blog-Beiträge', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: '' })
    )

    for (const r of blogResults) {
      children.push(
        new Paragraph({ text: r.titel, heading: HeadingLevel.HEADING_2 }),
        new Paragraph({
          children: [
            new TextRun({ text: `Monat: ${r.monat} · Keyword: ${r.blog!.keyword} · ${r.blog!.wordCount} Wörter`, italics: true, color: '666666' }),
          ],
        }),
        new Paragraph({ text: '' })
      )

      // HTML → Plaintext (grob, ausreichend für DOCX-Export)
      const lines = stripHtml(r.blog!.html)
        .split('\n')
        .filter((l) => l.trim())

      for (const line of lines) {
        children.push(new Paragraph({ text: line }))
      }

      if (r.seo?.aiMetaDescription) {
        children.push(
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Meta-Description (SEO)', heading: HeadingLevel.HEADING_3 }),
          new Paragraph({
            children: [new TextRun({ text: r.seo.aiMetaDescription, italics: true })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Keyword-Dichte: ${r.seo.density}% · Titel-Länge: ${r.seo.titleLength} Zeichen · Score: ${r.seo.score}/100`,
                color: '666666',
                size: 18,
              }),
            ],
          }),
        )
      }

      children.push(new Paragraph({ children: [new PageBreak()] }))
    }
  }

  // Newsletter
  const nlResults = textResults.filter((r) => r.newsletter)
  if (nlResults.length > 0) {
    children.push(
      new Paragraph({ text: 'Newsletter', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: '' })
    )

    for (const r of nlResults) {
      const nl = r.newsletter!
      children.push(
        new Paragraph({ text: r.titel, heading: HeadingLevel.HEADING_2 }),
        new Paragraph({
          children: [new TextRun({ text: `Betreff A: ${nl.betreffA}`, bold: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `Betreff B: ${nl.betreffB}`, bold: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `Preheader: ${nl.preheader}`, italics: true })],
        }),
        new Paragraph({ text: '' })
      )

      for (const line of nl.body.split('\n').filter((l) => l.trim())) {
        children.push(new Paragraph({ text: line }))
      }

      children.push(new Paragraph({ children: [new PageBreak()] }))
    }
  }

  const doc = new Document({
    sections: [{ children }],
  })

  return Packer.toBuffer(doc)
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
