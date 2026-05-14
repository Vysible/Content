import { requireAuth } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { getGlobalKpis } from '@/lib/costs/aggregator'
import { ResetCostsButton } from '@/components/admin/ResetCostsButton'
import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function KpiPage() {
  const session = await requireAuth()
  const isAdmin = (session as { user?: { role?: string } }).user?.role === 'ADMIN'

  const [kpis, projects, topEntries, totalEntries] = await Promise.all([
    getGlobalKpis(),
    prisma.project.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.costEntry.findMany({
      orderBy: { costEur: 'desc' },
      take: 10,
      select: { id: true, step: true, model: true, inputTokens: true, outputTokens: true, costEur: true, timestamp: true },
    }),
    prisma.costEntry.count(),
  ])

  return (
    <div>
      <Header title="KPI-Dashboard" subtitle="Kosten, Produktivität & Status" />

      {/* Globale KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Projekte aktiv" value={String(kpis.projectsActive)} />
        <KpiCard label="Artikel generiert" value={String(kpis.articlesGenerated)} />
        <KpiCard label="Newsletter" value={String(kpis.newslettersGenerated)} />
        <KpiCard label="Social Posts" value={String(kpis.socialPostsGenerated)} />
        <KpiCard label="Kosten gesamt" value={`${kpis.totalCostEur.toFixed(2)} €`} />
        <KpiCard label="Kosten lfd. Monat" value={`${kpis.currentMonthEur.toFixed(2)} €`} />
        <KpiCard label="Ø pro Paket" value={`${kpis.avgCostPerPackage.toFixed(2)} €`} />
        <KpiCard label="Offene Freigaben" value={String(kpis.pendingApprovals)} highlight={kpis.pendingApprovals > 0} />
      </div>

      {/* Kostendiagnose */}
      <div className="bg-white border border-stone rounded-xl overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-stone flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm text-nachtblau">Kostendiagnose – Top 10 teuerste Einträge</h2>
            <p className="text-xs text-stahlgrau mt-0.5">
              {totalEntries.toLocaleString('de-DE')} Einträge gesamt
              {totalEntries > 0 && ` · Ø ${(kpis.totalCostEur / totalEntries).toFixed(4)} € pro Eintrag`}
            </p>
          </div>
          {isAdmin && <ResetCostsButton />}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone bg-stone/30">
              <th className="text-left py-2 px-4 text-xs font-medium text-stahlgrau">Datum</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-stahlgrau">Schritt</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-stahlgrau">In-Token</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-stahlgrau">Out-Token</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-stahlgrau">Kosten €</th>
            </tr>
          </thead>
          <tbody>
            {topEntries.map((e: { id: string; step: string; model: string; inputTokens: number; outputTokens: number; costEur: number; timestamp: Date }) => (
              <tr key={e.id} className="border-b border-stone/50 hover:bg-stone/20">
                <td className="py-2 px-4 text-xs text-stahlgrau">
                  {new Date(e.timestamp).toLocaleString('de-DE')}
                </td>
                <td className="py-2 px-4 text-xs">{e.step}</td>
                <td className="py-2 px-4 text-right text-xs">{e.inputTokens.toLocaleString('de-DE')}</td>
                <td className="py-2 px-4 text-right text-xs">{e.outputTokens.toLocaleString('de-DE')}</td>
                <td className="py-2 px-4 text-right text-xs font-medium">{e.costEur.toFixed(4)}</td>
              </tr>
            ))}
            {topEntries.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-stahlgrau">Keine Einträge vorhanden</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Projekt-Tabelle */}
      <div className="bg-white border border-stone rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone">
          <h2 className="font-semibold text-sm text-nachtblau">Kosten pro Projekt</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone bg-stone/30">
              <th className="text-left py-2 px-4 text-xs font-medium text-stahlgrau">Projekt</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-stahlgrau">Status</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-stahlgrau">Details</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p: { id: string; name: string; status: string }) => (
              <tr key={p.id} className="border-b border-stone/50 hover:bg-stone/20">
                <td className="py-2 px-4 font-medium">{p.name}</td>
                <td className="py-2 px-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    p.status === 'ARCHIVED' ? 'bg-stone text-stahlgrau' :
                    'bg-amber-100 text-amber-700'
                  }`}>{p.status}</span>
                </td>
                <td className="py-2 px-4 text-right">
                  <Link href={`/kpi/${p.id}`} className="text-xs text-tiefblau hover:underline">
                    Details →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone'}`}>
      <p className="text-xs text-stahlgrau mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-amber-700' : 'text-nachtblau'}`}>{value}</p>
    </div>
  )
}
