'use client'

import { useState } from 'react'
import { GenerationProgress } from '@/components/generation/GenerationProgress'

interface Props {
  projectId: string
}

export function GenerateSection({ projectId }: Props) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startGeneration() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const { jobId } = await res.json()
      setJobId(jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  if (jobId) {
    return <GenerationProgress jobId={jobId} />
  }

  return (
    <div className="bg-white border border-stone rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-nachtblau mb-1">Content generieren</h3>
          <p className="text-sm text-stahlgrau">
            Startet die KI-Pipeline: Scraping → Themenplanung → Texte
          </p>
        </div>
        <button
          onClick={startGeneration}
          disabled={loading}
          className="px-5 py-2.5 bg-tiefblau text-white text-sm font-medium rounded-lg hover:bg-nachtblau transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Startet…' : 'Jetzt generieren'}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600">Fehler: {error}</p>
      )}
    </div>
  )
}
