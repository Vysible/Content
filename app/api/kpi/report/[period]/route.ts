import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { readFile, stat } from 'node:fs/promises'

export async function GET(
  _req: NextRequest,
  { params }: { params: { period: string } },
) {
  try {
    await requireAuth()
    const { period } = params

    const report = await prisma.monthlyReport.findUnique({ where: { period } })
    if (!report) {
      return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 })
    }

    try {
      await stat(report.pdfPath)
    } catch {
      logger.warn({ period, pdfPath: report.pdfPath }, '[Vysible] Report-PDF fehlt auf Disk')
      return NextResponse.json({ error: 'PDF-Datei nicht gefunden' }, { status: 404 })
    }

    const buffer = await readFile(report.pdfPath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Report_${period}.pdf"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err: unknown) {
    logger.error({ err }, '[Vysible] GET /api/kpi/report/[period] error')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
