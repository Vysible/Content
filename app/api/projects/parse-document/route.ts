import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_CHARS = 16_000

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
])

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf2json exports the class as the module itself (default in CJS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import('pdf2json') as any
  const PDFParser = mod.default ?? mod
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1)
    parser.on('pdfParser_dataError', (err) => {
      const e = err.parserError instanceof Error ? err.parserError : new Error(String(err.parserError))
      reject(e)
    })
    parser.on('pdfParser_dataReady', () => {
      resolve(parser.getRawTextContent())
    })
    parser.parseBuffer(buffer)
  })
}

export async function POST(req: Request) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

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

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Datei zu groß (max. 10 MB)' }, { status: 413 })
  }

  const name = file.name.toLowerCase()
  let mime = file.type
  if (!mime && name.endsWith('.pdf')) mime = 'application/pdf'
  if (!mime && name.endsWith('.docx')) mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (!mime && (name.endsWith('.txt') || name.endsWith('.md'))) mime = 'text/plain'

  if (!ALLOWED_MIMES.has(mime)) {
    return NextResponse.json(
      { error: `Nicht unterstützter Dateityp: ${file.type || name}` },
      { status: 400 }
    )
  }

  try {
    let text: string

    if (mime === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer())
      text = await extractPdfText(buffer)
    } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      text = Buffer.from(await file.arrayBuffer()).toString('utf-8')
    }

    const originalLength = text.length
    const truncated = originalLength > MAX_CHARS
    if (truncated) text = text.slice(0, MAX_CHARS)

    logger.info(
      { mime, originalLength, truncated, fileSize: file.size },
      '[Vysible] parse-document: Extraktion erfolgreich'
    )

    return NextResponse.json({ text, truncated, originalLength })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error({ err, mime }, '[Vysible] parse-document: Extraktion fehlgeschlagen')
    return NextResponse.json({ error: `Extraktion fehlgeschlagen: ${msg}` }, { status: 500 })
  }
}
