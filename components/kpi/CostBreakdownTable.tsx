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
    return <p className="text-sm text-stahlgrau">Lade Kosten...</p>
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
      <table className="min-w-full divide-y divide-stone">
        <thead className="bg-stone/30">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-stahlgrau uppercase">Projekt</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-stahlgrau uppercase">Monat aktuell</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-stahlgrau uppercase">Gesamt</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-stahlgrau uppercase">Ø/Paket</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-stahlgrau uppercase">Generierungen</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-stahlgrau uppercase">CSV</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-stone/50">
          {projects.map((p) => {
            const s = summaries[p.id]
            if (!s) return null
            return (
              <tr key={p.id}>
                <td className="px-4 py-3 text-sm font-medium text-nachtblau">{p.name}</td>
                <td className="px-4 py-3 text-sm text-right text-anthrazit">{s.currentMonthEur.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm text-right text-anthrazit">{s.totalEur.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm text-right text-anthrazit">{s.avgPerPackage.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm text-right text-stahlgrau">{s.generationCount}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => void handleDownloadCsv(p.id)}
                    className="text-sm text-nachtblau hover:text-tiefblau underline"
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
