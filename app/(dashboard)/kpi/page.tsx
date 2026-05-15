import { requireAuth } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { getGlobalKpis, getProjectCosts } from '@/lib/costs/aggregator'
import { ResetCostsButton } from '@/components/admin/ResetCostsButton'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import MonthlyOverview from '@/components/kpi/MonthlyOverview'
import ProjectKPICard from '@/components/kpi/ProjectKPICard'

export default async function KpiPage() {
  const session = await requireAuth()
  const isAdmin = (session as { user?: { role?: string } }).user?.role === 'ADMIN'

  const [kpis, projects, topEntries, totalEntries, monthlyReports] = await Promise.all([
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
    prisma.monthlyReport.findMany({ orderBy: { generatedAt: 'desc' }, take: 12 }),
  ])

  const projectsWithCosts = await Promise.all(
    projects.map(async (p) => {
      const costs = await getProjectCosts(p.id)
      const history = await prisma.costReport.findMany({
        where: { projectId: p.id },
        orderBy: { month: 'asc' },
        take: 6,
        select: { month: true, totalEur: true },
      })
      return {
        project: p,
        costs,
        history: history.map((r) => ({ month: r.month, costEur: r.totalEur })),
      }
    })
  )

  return (
    <div>
      <Header title="KPI-Dashboard" subtitle="Kosten, Produktivität & Status" />

      {/* Globale KPIs */}
      <div className="mb-8">
        <MonthlyOverview kpis={kpis} />
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

      {/* Projekt-KPI-Karten mit Sparkline */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-nachtblau mb-3">Kosten pro Projekt</h2>
        {projectsWithCosts.length === 0 ? (
          <p className="text-sm text-stahlgrau">Keine Projekte vorhanden</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsWithCosts.map(({ project, costs, history }) => (
              <ProjectKPICard key={project.id} project={project} costs={costs} history={history} />
            ))}
          </div>
        )}
      </div>

      {/* Monatsreport-Archiv */}
      <div className="bg-white border border-stone rounded-xl overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-stone">
          <h2 className="font-semibold text-sm text-nachtblau">Monatsreport-Archiv</h2>
        </div>
        {monthlyReports.length === 0 ? (
          <p className="p-6 text-sm text-stahlgrau">
            Noch keine Reports vorhanden. Reports werden automatisch am 1. des Monats (06:00 Uhr) generiert.
          </p>
        ) : (
          <ul className="divide-y divide-stone">
            {monthlyReports.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium">Report {r.period}</span>
                <a
                  href={`/api/kpi/report/${r.period}`}
                  className="text-xs text-tiefblau hover:underline"
                >
                  PDF herunterladen
                </a>
              </li>
            ))}
          </ul>
        )}
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
