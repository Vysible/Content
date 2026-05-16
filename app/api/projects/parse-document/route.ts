import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import mammoth from 'mammoth'

// Server-side: disable web worker (use inline fake worker in Node.js)
GlobalWorkerOptions.workerSrc = ''

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_CHARS = 16_000

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
])

export async function POST(req: Request) {
  await requireAuth()

  let formData: FormData
  try {
    formData = await req.formData()
  } catch (err: unknown) {
    logger.error({ err }, '[Vysible] parse-document: FormData-Parsing fehlgeschlagen')
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Keine Datei empfangen' }, { status: 400 })
  }

  // File-Size-Check VOR Buffer-Allokation (DoS-Schutz)
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Datei zu groß (max. 10 MB)' }, { status: 413 })
  }

  const mime = file.type

  // Content-Type-Validierung
  if (!ALLOWED_MIMES.has(mime)) {
    return NextResponse.json(
      { error: `Nicht unterstützter Dateityp: ${mime}` },
      { status: 400 }
    )
  }

  try {
    let text: string

    if (mime === 'application/pdf') {
      const buffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(buffer)
      const pdf = await getDocument({ data: uint8Array }).promise
      const pages: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
        pages.push(pageText)
      }
      text = pages.join('\n\n')
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const buffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
      text = result.value
    } else {
      // TXT / MD
      const buffer = await file.arrayBuffer()
      text = Buffer.from(buffer).toString('utf-8')
    }

    const originalLength = text.length
    const truncated = originalLength > MAX_CHARS
    if (truncated) {
      text = text.slice(0, MAX_CHARS)
    }

    logger.info(
      { mime, originalLength, truncated, fileSize: file.size },
      '[Vysible] parse-document: Extraktion erfolgreich'
    )

    return NextResponse.json({ text, truncated, originalLength })
  } catch (err: unknown) {
    logger.error({ err }, '[Vysible] parse-document: Extraktion fehlgeschlagen')
    return NextResponse.json({ error: 'Extraktion fehlgeschlagen' }, { status: 500 })
  }
}
