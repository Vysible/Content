import Link from 'next/link'
import type { ProjectCostSummary } from '@/lib/costs/aggregator'
import CostChart from './CostChart'

interface SparkPoint {
  month: string
  costEur: number
}

interface Props {
  project: { id: string; name: string; status: string }
  costs: ProjectCostSummary
  history: SparkPoint[]
}

export default function ProjectKPICard({ project, costs, history }: Props) {
  const statusColor =
    project.status === 'ACTIVE'
      ? 'bg-green-100 text-green-800'
      : project.status === 'ARCHIVED'
        ? 'bg-stone/60 text-stahlgrau'
        : 'bg-yellow-100 text-yellow-800'

  return (
    <div className="bg-white border border-stone rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/kpi/${project.id}`}
            className="text-sm font-semibold text-nachtblau hover:text-tiefblau truncate block"
          >
            {project.name}
          </Link>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColor}`}>
            {project.status}
          </span>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-stahlgrau">Lfd. Monat</p>
          <p className="text-base font-bold text-nachtblau">
            {costs.currentMonthEur.toFixed(4)} €
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-stahlgrau">Gesamt</p>
          <p className="text-sm font-semibold">{costs.totalEur.toFixed(4)} €</p>
        </div>
        <div>
          <p className="text-xs text-stahlgrau">Vormonat</p>
          <p className="text-sm font-semibold">{costs.lastMonthEur.toFixed(4)} €</p>
        </div>
        <div>
          <p className="text-xs text-stahlgrau">Ø / Paket</p>
          <p className="text-sm font-semibold">{costs.avgPerPackage.toFixed(4)} €</p>
        </div>
      </div>

      {history.length >= 2 && (
        <div>
          <p className="text-xs text-stahlgrau mb-1">Verlauf (6 Monate)</p>
          <CostChart data={history} />
        </div>
      )}
    </div>
  )
}
