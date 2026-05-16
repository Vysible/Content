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
  green: 'bg-green-50 text-green-700',
  yellow: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
}

export function SeoScoreCard({ projectId, index, seoData, onUpdate }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
      const seoResult: StoredSeoResult = {
        ...analysis,
        aiMetaDescription,
        analyzedAt: new Date().toISOString(),
      }
      onUpdate(seoResult)
    } catch (err: unknown) {
      console.warn('[Vysible] SEO-Analyse fehlgeschlagen:', err)
      setError(err instanceof Error ? err.message : 'Fehler bei SEO-Analyse')
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
      <div className="p-4 flex items-center gap-2 text-sm text-stahlgrau">
        <span className="animate-spin">⟳</span>
        <span>[INFO] SEO wird analysiert…</span>
      </div>
    )
  }

  if (!seoData) {
    return (
      <div className="p-4 space-y-2">
        {error && <p className="text-xs text-red-600">[FAIL] {error}</p>}
        <button
          onClick={handleAnalyze}
          className="px-3 py-1.5 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau"
        >
          SEO + KI analysieren
        </button>
      </div>
    )
  }

  const dLight = densityLight(seoData.density)
  const titleLight: TrafficLight = seoData.titlePresent ? 'green' : 'red'
  const titleLenLight: TrafficLight = seoData.titleLengthOk ? 'green' : 'yellow'
  const metaLight: TrafficLight = seoData.metaDescriptionOk ? 'green' : 'yellow'
  const scoreColor = seoData.score >= 80 ? 'text-green-600' : seoData.score >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-nachtblau">SEO-Analyse</h4>
        <span className={`text-xl font-bold ${scoreColor}`}>{seoData.score}/100</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className={`p-2 rounded-lg ${LIGHT_BG[dLight]}`}>
          <p className="text-current/70">KW-Dichte</p>
          <p className="font-bold">{seoData.density}% ({seoData.occurrences}×)</p>
        </div>
        <div className={`p-2 rounded-lg ${LIGHT_BG[titleLight]}`}>
          <p className="text-current/70">KW im Titel</p>
          <p className="font-bold">{seoData.titlePresent ? 'Ja' : 'Fehlt'}</p>
        </div>
        <div className={`p-2 rounded-lg ${LIGHT_BG[titleLenLight]}`}>
          <p className="text-current/70">Titel-Länge</p>
          <p className="font-bold">{seoData.titleLength} Z. {seoData.titleLengthOk ? '✓' : '(Ziel: 50–60)'}</p>
        </div>
        <div className={`p-2 rounded-lg ${LIGHT_BG[metaLight]}`}>
          <p className="text-current/70">Meta-Desc.</p>
          <p className="font-bold">{seoData.aiMetaDescription ? `${seoData.aiMetaDescription.length} Z.` : 'Fehlt'}</p>
        </div>
      </div>

      {seoData.aiMetaDescription && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-nachtblau">KI-Meta-Description</p>
          <div className="flex items-start gap-2">
            <p className="text-xs text-anthrazit flex-1 bg-stone/30 rounded-lg p-2 leading-relaxed">
              {seoData.aiMetaDescription}
            </p>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 px-2 py-1 text-xs bg-tiefblau text-white rounded-lg hover:bg-nachtblau"
            >
              {copied ? '[OK] Kopiert' : 'Kopieren'}
            </button>
          </div>
          <p className="text-xs text-stahlgrau">{seoData.aiMetaDescription.length} Zeichen</p>
        </div>
      )}

      {seoData.suggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-nachtblau">Empfehlungen</p>
          {seoData.suggestions.map((s, i) => (
            <p key={i} className="text-xs text-amber-700 flex items-start gap-1">
              <span>•</span><span>{s}</span>
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-stahlgrau">
          Analysiert: {new Date(seoData.analyzedAt).toLocaleDateString('de-DE')}
        </p>
        {error && <p className="text-xs text-red-600">[FAIL] {error}</p>}
        <button
          onClick={handleAnalyze}
          className="text-xs text-tiefblau hover:underline"
        >
          Erneut analysieren
        </button>
      </div>
    </div>
  )
}
