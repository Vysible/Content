import { requireAdmin } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Diagnose – zeigt Anzahl Einträge, Top-Kostentreiber und Gesamtsumme
export async function GET() {
  await requireAdmin()

  const entries = await prisma.costEntry.findMany({
    select: { step: true, model: true, costEur: true, inputTokens: true, outputTokens: true, timestamp: true },
    orderBy: { costEur: 'desc' },
    take: 20,
  })

  const total = await prisma.costEntry.aggregate({ _sum: { costEur: true }, _count: { id: true } })

  return NextResponse.json({
    totalEntries: total._count.id,
    totalCostEur: total._sum.costEur ?? 0,
    top20ByCost: entries,
  })
}

// DELETE: Löscht ALLE Kosteneinträge (nur für Admin, nicht rückgängig machbar)
export async function DELETE() {
  await requireAdmin()

  const { count } = await prisma.costEntry.deleteMany({})

  return NextResponse.json({ deleted: count, message: `${count} Einträge gelöscht` })
}
