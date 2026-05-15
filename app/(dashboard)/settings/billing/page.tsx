import { requireAuth } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { getGlobalKpis } from '@/lib/costs/aggregator'
import { prisma } from '@/lib/db'
import CostBreakdownTable from '@/components/kpi/CostBreakdownTable'
import MarginCalculator from '@/components/kpi/MarginCalculator'
import CostThresholdConfig from '@/components/kpi/CostThresholdConfig'

export default async function BillingPage() {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const kpis = await getGlobalKpis()
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kosten & Abrechnung</h1>
        <p className="mt-1 text-sm text-gray-500">
          Übersicht aller KI-Kosten, Marge-Kalkulation und Schwellwert-Konfiguration
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Gesamtkosten (kumuliert)</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{kpis.totalCostEur.toFixed(2)} €</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Laufender Monat</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{kpis.currentMonthEur.toFixed(2)} €</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Ø Kosten pro Content-Paket</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{kpis.avgCostPerPackage.toFixed(2)} €</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Kosten pro Projekt</h2>
        <CostBreakdownTable projects={projects} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Marge-Kalkulation</h2>
        <MarginCalculator avgCostPerPackage={kpis.avgCostPerPackage} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Schwellwert-Konfiguration</h2>
        <CostThresholdConfig />
      </div>
    </div>
  )
}
