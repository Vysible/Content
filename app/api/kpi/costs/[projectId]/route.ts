import { requireAuth } from '@/lib/auth/session'
import { getProjectCosts } from '@/lib/costs/aggregator'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { stringify } from 'csv-stringify/sync'

export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  await requireAuth()

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  if (format === 'csv') {
    const entries = await prisma.costEntry.findMany({
      where: { projectId: params.projectId },
      orderBy: { timestamp: 'asc' },
    })
    const rows = entries.map((e) => ({
      Timestamp: e.timestamp.toISOString(),
      Modell: e.model,
      Schritt: e.step,
      InputTokens: e.inputTokens,
      OutputTokens: e.outputTokens,
      KostenEUR: e.costEur.toFixed(6),
    }))
    const csv = stringify(rows, { header: true })
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="kosten_${params.projectId}.csv"`,
      },
    })
  }

  const summary = await getProjectCosts(params.projectId)
  return NextResponse.json(summary)
}
