'use client'

import { useState, useEffect } from 'react'
import { GenerationProgress } from '@/components/generation/GenerationProgress'

interface Estimate {
  model: string
  estimatedEur: number
  breakdown: { themes: number; plans: number; texts: number }
  channelCount: number
  hasAnthropicKey: boolean
  missingUrl: boolean
}

interface Props {
  projectId: string
}

export function GenerateSection({ projectId }: Props) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/generate/estimate?projectId=${projectId}`)
      .then((r) => r.json())
      .then(setEstimate)
      .catch(() => setEstimate(null))
      .finally(() => setEstimateLoading(false))
  }, [projectId])

  async function startGeneration() {
    setStarting(true)
    setError(null)
    setShowConfirm(false)
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
      setStarting(false)
    }
  }

  if (jobId) {
    return <GenerationProgress jobId={jobId} />
  }

  const canStart = estimate?.hasAnthropicKey && !estimate?.missingUrl

  return (
    <div className="bg-white border border-stone rounded-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-nachtblau mb-1">Content generieren</h3>
          <p className="text-sm text-stahlgrau mb-3">
            Startet die KI-Pipeline: Scraping → Themenplanung → Texte
          </p>

          {estimateLoading && (
            <p className="text-xs text-stahlgrau">Kosten-Voranschlag wird berechnet…</p>
          )}

          {estimate && !estimateLoading && (
            <div className="space-y-1">
              {!estimate.hasAnthropicKey && (
                <p className="text-xs text-red-600 font-medium">
                  ⚠ Kein aktiver Anthropic-API-Key – bitte unter Einstellungen → API-Keys hinterlegen
                </p>
              )}
              {estimate.missingUrl && (
                <p className="text-xs text-red-600 font-medium">⚠ Praxis-URL fehlt im Projekt</p>
              )}
              {canStart && (
                <div className="text-xs text-stahlgrau space-y-0.5">
                  <p className="font-medium text-anthrazit">
                    Geschätzte Kosten:{' '}
                    <span className="text-tiefblau">~{estimate.estimatedEur.toFixed(4)} EUR</span>
                    <span className="ml-1 font-normal">({estimate.model})</span>
                  </p>
                  <p>Themenplanung: {estimate.breakdown.themes.toFixed(4)} EUR</p>
                  <p>Redaktionspläne: {estimate.breakdown.plans.toFixed(4)} EUR</p>
                  <p>
                    Texte ({estimate.channelCount} Kanal
                    {estimate.channelCount !== 1 ? 'e' : ''}): {estimate.breakdown.texts.toFixed(4)} EUR
                  </p>
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-600">Fehler: {error}</p>}
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={!canStart || starting || estimateLoading}
          className="px-5 py-2.5 bg-tiefblau text-white text-sm font-medium rounded-lg hover:bg-nachtblau transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {starting ? 'Startet…' : 'Jetzt generieren'}
        </button>
      </div>

      {/* Bestätigungs-Dialog */}
      {showConfirm && estimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h4 className="font-semibold text-nachtblau mb-2">Generierung bestätigen</h4>
            <p className="text-sm text-anthrazit mb-4">
              Die KI-Pipeline wird gestartet. Geschätzte Kosten:
            </p>
            <div className="bg-stone rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-stahlgrau">Themenplanung</span>
                <span>{estimate.breakdown.themes.toFixed(4)} EUR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stahlgrau">Redaktionspläne</span>
                <span>{estimate.breakdown.plans.toFixed(4)} EUR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stahlgrau">
                  Texte ({estimate.channelCount} Kanal{estimate.channelCount !== 1 ? 'e' : ''})
                </span>
                <span>{estimate.breakdown.texts.toFixed(4)} EUR</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-stone pt-1 mt-1">
                <span>Gesamt (ca.)</span>
                <span className="text-tiefblau">{estimate.estimatedEur.toFixed(4)} EUR</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 text-sm text-stahlgrau border border-stone rounded-lg hover:border-anthrazit transition"
              >
                Abbrechen
              </button>
              <button
                onClick={startGeneration}
                className="flex-1 px-4 py-2 text-sm bg-tiefblau text-white rounded-lg hover:bg-nachtblau transition font-medium"
              >
                Generierung starten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
