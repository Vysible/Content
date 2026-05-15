import { requireAuth } from '@/lib/auth/session'
import { getGlobalKpis } from '@/lib/costs/aggregator'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireAuth()
    const [kpis, monthlyReports] = await Promise.all([
      getGlobalKpis(),
      prisma.monthlyReport.findMany({
        orderBy: { generatedAt: 'desc' },
        take: 12,
      }),
    ])
    return NextResponse.json({ kpis, monthlyReports })
  } catch (err: unknown) {
    logger.error({ err }, '[Vysible] GET /api/kpi error')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
