import type { GlobalKpis } from '@/lib/costs/aggregator'

interface Props {
  kpis: GlobalKpis
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-stone rounded-xl p-4">
      <p className="text-xs text-stahlgrau mb-1">{label}</p>
      <p className="text-xl font-bold text-nachtblau">{value}</p>
      {sub && <p className="text-xs text-stahlgrau mt-0.5">{sub}</p>}
    </div>
  )
}

export default function MonthlyOverview({ kpis }: Props) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-nachtblau mb-3">Gesamtübersicht</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-2">
        <KpiCard
          label="Projekte gesamt"
          value={String(kpis.projectsTotal)}
          sub={`${kpis.projectsActive} aktiv · ${kpis.projectsArchived} archiviert`}
        />
        <KpiCard label="Artikel generiert" value={String(kpis.articlesGenerated)} />
        <KpiCard label="Newsletter generiert" value={String(kpis.newslettersGenerated)} />
        <KpiCard label="Social Posts" value={String(kpis.socialPostsGenerated)} />
        <KpiCard
          label="Kosten laufender Monat"
          value={`${kpis.currentMonthEur.toFixed(4)} €`}
          sub={`Vormonat: ${kpis.lastMonthEur.toFixed(4)} €`}
        />
        <KpiCard
          label="Kosten gesamt"
          value={`${kpis.totalCostEur.toFixed(4)} €`}
          sub={`Ø ${kpis.avgCostPerPackage.toFixed(4)} € / Paket`}
        />
        <KpiCard
          label="Ausstehende Freigaben"
          value={String(kpis.pendingApprovals)}
        />
      </div>
    </div>
  )
}
