import { requireAuth } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { getProjectCosts } from '@/lib/costs/aggregator'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ProjectKpiPage({ params }: { params: { projectId: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, name: true, status: true },
  })
  if (!project) notFound()

  const costs = await getProjectCosts(params.projectId)

  const entries = await prisma.costEntry.findMany({
    where: { projectId: params.projectId },
    orderBy: { timestamp: 'desc' },
    take: 50,
  })

  const reports = await prisma.costReport.findMany({
    where: { projectId: params.projectId },
    orderBy: { month: 'desc' },
  })

  return (
    <div>
      <Header
        title={`KPI: ${project.name}`}
        subtitle="Kosten & Statistiken"
      />

      <div className="mb-4">
        <Link href="/kpi" className="text-sm text-tiefblau hover:underline">← Zurück zur Übersicht</Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Kosten gesamt" value={`${costs.totalEur.toFixed(4)} €`} />
        <KpiCard label="Laufender Monat" value={`${costs.currentMonthEur.toFixed(4)} €`} />
        <KpiCard label="Letzter Monat" value={`${costs.lastMonthEur.toFixed(4)} €`} />
        <KpiCard label="Ø pro Paket" value={`${costs.avgPerPackage.toFixed(4)} €`} />
        <KpiCard label="Pakete generiert" value={String(costs.generationCount)} />
      </div>

      {/* Kosten nach Schritt */}
      <div className="bg-white border border-stone rounded-xl overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-stone flex items-center justify-between">
          <h2 className="font-semibold text-sm text-nachtblau">Kosten nach Schritt</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone bg-stone/30">
              <th className="text-left py-2 px-4 text-xs font-medium text-stahlgrau">Schritt</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-stahlgrau">Kosten (€)</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-stahlgrau">Anteil</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(costs.byStep).map(([step, eur]) => (
              <tr key={step} className="border-b border-stone/50 hover:bg-stone/20">
                <td className="py-2 px-4 font-medium">{step}</td>
                <td className="py-2 px-4 text-right">{(eur as number).toFixed(4)}</td>
                <td className="py-2 px-4 text-right text-stahlgrau">
                  {costs.totalEur > 0 ? `${(((eur as number) / costs.totalEur) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monatsberichte */}
      {reports.length > 0 && (
        <div className="bg-white border border-stone rounded-xl overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-stone">
            <h2 className="font-semibold text-sm text-nachtblau">Monatsberichte</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone bg-stone/30">
                <th className="text-left py-2 px-4 text-xs font-medium text-stahlgrau">Monat</th>
                <th className="text-right py-2 px-4 text-xs font-medium text-stahlgrau">Kosten (€)</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-stone/50 hover:bg-stone/20">
                  <td className="py-2 px-4 font-medium">{r.month}</td>
                  <td className="py-2 px-4 text-right">{r.totalEur.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Letzte Einträge */}
      <div className="bg-white border border-stone rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-stone flex items-center justify-between">
          <h2 className="font-semibold text-sm text-nachtblau">Letzte 50 Einträge</h2>
          <a
            href={`/api/kpi/costs/${params.projectId}?format=csv`}
            className="text-xs text-tiefblau hover:underline"
          >
            CSV exportieren
          </a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone bg-stone/30">
              <th className="text-left py-2 px-4 text-xs font-medium text-stahlgrau">Zeitstempel</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-stahlgrau">Schritt</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-stahlgrau">Modell</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-stahlgrau">In</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-stahlgrau">Out</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-stahlgrau">€</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-stone/50 hover:bg-stone/20">
                <td className="py-2 px-4 text-xs text-stahlgrau">
                  {new Date(e.timestamp).toLocaleString('de-DE')}
                </td>
                <td className="py-2 px-4">{e.step}</td>
                <td className="py-2 px-4 text-xs text-stahlgrau">{e.model}</td>
                <td className="py-2 px-4 text-right text-xs">{e.inputTokens.toLocaleString('de-DE')}</td>
                <td className="py-2 px-4 text-right text-xs">{e.outputTokens.toLocaleString('de-DE')}</td>
                <td className="py-2 px-4 text-right text-xs">{e.costEur.toFixed(6)}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-stahlgrau text-sm">Keine Einträge vorhanden</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-4 border bg-white border-stone">
      <p className="text-xs text-stahlgrau mb-1">{label}</p>
      <p className="text-xl font-bold text-nachtblau">{value}</p>
    </div>
  )
}
