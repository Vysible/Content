'use client'

import { useState, useEffect } from 'react'
import type { ProjectCostSummary } from '@/lib/costs/aggregator'

interface Props {
  projects: Array<{ id: string; name: string }>
}

export default function CostBreakdownTable({ projects }: Props) {
  const [summaries, setSummaries] = useState<Record<string, ProjectCostSummary>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCosts() {
      const results: Record<string, ProjectCostSummary> = {}
      for (const p of projects) {
        const res = await fetch(`/api/kpi/costs/${p.id}`)
        if (res.ok) {
          results[p.id] = (await res.json()) as ProjectCostSummary
        }
      }
      setSummaries(results)
      setLoading(false)
    }
    void loadCosts()
  }, [projects])

  if (loading) {
    return <p className="text-sm text-gray-500">Lade Kosten...</p>
  }

  const handleDownloadCsv = async (projectId: string) => {
    const res = await fetch(`/api/kpi/costs/${projectId}?format=csv`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kosten_${projectId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projekt</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monat aktuell</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gesamt</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ø/Paket</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Generierungen</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">CSV</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {projects.map((p) => {
            const s = summaries[p.id]
            if (!s) return null
            return (
              <tr key={p.id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">{s.currentMonthEur.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">{s.totalEur.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">{s.avgPerPackage.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm text-right text-gray-500">{s.generationCount}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => void handleDownloadCsv(p.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Download
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
