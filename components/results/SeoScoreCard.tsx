'use client'

import { useState } from 'react'
import type { StoredSeoResult } from '@/lib/generation/results-store'

interface Props {
  projectId: string
  index: number
  seoData?: StoredSeoResult
  onUpdate: (seo: StoredSeoResult) => void
}

type TrafficLight = 'green' | 'yellow' | 'red'

function densityLight(density: number): TrafficLight {
  if (density >= 1 && density <= 3) return 'green'
  if (density > 5) return 'red'
  return 'yellow'
}

const LIGHT_BG: Record<TrafficLight, string> = {
  green:  'bg-green-50 border-green-200 text-green-800',
  yellow: 'bg-amber-50 border-amber-200 text-amber-800',
  red:    'bg-red-50 border-red-200 text-red-800',
}
const LIGHT_LABEL: Record<TrafficLight, string> = {
  green:  'text-green-600',
  yellow: 'text-amber-600',
  red:    'text-red-600',
}

function ScoreRing({ score }: { score: number }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#e7e2d8" strokeWidth="7" />
      <circle
        cx="40" cy="40" r={r}
        fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x="40" y="40" textAnchor="middle" dominantBaseline="central"
        fontSize="18" fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  )
}

function Metric({ label, value, light, sub }: { label: string; value: string; light: TrafficLight; sub?: string }) {
  return (
    <div className={`rounded-xl border p-3 ${LIGHT_BG[light]}`}>
      <p className="text-xs opacity-70 mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${LIGHT_LABEL[light]}`}>{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

export function SeoScoreCard({ projectId, index, seoData, onUpdate }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const { analysis, aiMetaDescription } = await res.json() as {
        analysis: Omit<StoredSeoResult, 'aiMetaDescription' | 'analyzedAt'>
        aiMetaDescription: string
      }
      onUpdate({ ...analysis, aiMetaDescription, analyzedAt: new Date().toISOString() })
    } catch (err: unknown) {
      console.warn('[Vysible] SEO-Analyse fehlgeschlagen:', err)
      setError(err instanceof Error ? err.message : 'Analyse fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!seoData?.aiMetaDescription) return
    try {
      await navigator.clipboard.writeText(seoData.aiMetaDescription)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    } catch (err: unknown) {
      console.warn('[Vysible] Clipboard-Fehler:', err)
    }
  }

  if (loading) {
    return (
      <div className="p-5 flex items-center gap-3 text-sm text-stahlgrau">
        <span className="animate-spin inline-block">↻</span>
        <span>SEO wird analysiert…</span>
      </div>
    )
  }

  if (!seoData) {
    return (
      <div className="p-5 space-y-2">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={handleAnalyze}
          className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau transition"
        >
          SEO analysieren
        </button>
      </div>
    )
  }

  const dLight      = densityLight(seoData.density)
  const titleLight: TrafficLight  = seoData.titlePresent ? 'green' : 'red'
  const titleLenLight: TrafficLight = seoData.titleLengthOk ? 'green' : 'yellow'
  const metaLight: TrafficLight   = seoData.metaDescriptionOk ? 'green' : 'yellow'

  return (
    <div className="p-5 space-y-5">

      {/* Score + Metriken */}
      <div className="flex items-center gap-5">
        <ScoreRing score={seoData.score} />
        <div className="grid grid-cols-2 gap-2 flex-1">
          <Metric
            label="KW-Dichte"
            value={`${seoData.density}%`}
            sub={`${seoData.occurrences}× gefunden · Ziel 1–3 %`}
            light={dLight}
          />
          <Metric
            label="KW im Titel"
            value={seoData.titlePresent ? 'Vorhanden' : 'Fehlt'}
            light={titleLight}
          />
          <Metric
            label="Titel-Länge"
            value={`${seoData.titleLength} Zeichen`}
            sub={seoData.titleLengthOk ? 'Optimal (50–60)' : 'Ziel: 50–60'}
            light={titleLenLight}
          />
          <Metric
            label="Meta-Beschreibung"
            value={seoData.aiMetaDescription ? `${seoData.aiMetaDescription.length} Z.` : 'Fehlt'}
            sub={seoData.metaDescriptionOk ? 'Länge optimal' : 'Ziel: 120–160'}
            light={metaLight}
          />
        </div>
      </div>

      {/* KI-Meta-Beschreibung */}
      {seoData.aiMetaDescription && (
        <div>
          <p className="text-xs font-semibold text-nachtblau mb-1.5">KI-Meta-Beschreibung</p>
          <div className="flex items-start gap-2">
            <p className="text-sm text-anthrazit flex-1 bg-stone/40 rounded-lg px-3 py-2 leading-relaxed">
              {seoData.aiMetaDescription}
            </p>
            <button
              onClick={handleCopy}
              className="shrink-0 px-3 py-1.5 text-xs bg-tiefblau text-white rounded-lg hover:bg-nachtblau transition"
            >
              {copied ? 'Kopiert ✓' : 'Kopieren'}
            </button>
          </div>
          <p className="text-xs text-stahlgrau mt-1">{seoData.aiMetaDescription.length} Zeichen</p>
        </div>
      )}

      {/* Empfehlungen */}
      {seoData.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-nachtblau mb-1.5">Empfehlungen</p>
          <ul className="space-y-1">
            {seoData.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-amber-700 flex gap-2">
                <span className="shrink-0 mt-0.5">›</span><span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-stone">
        <p className="text-xs text-stahlgrau">
          Analysiert am {new Date(seoData.analyzedAt).toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          })}
        </p>
        <div className="flex items-center gap-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button onClick={handleAnalyze} className="text-xs text-tiefblau hover:underline">
            Erneut analysieren
          </button>
        </div>
      </div>

    </div>
  )
}
