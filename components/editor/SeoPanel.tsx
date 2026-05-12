'use client'

import { useState } from 'react'

interface SeoAnalysis {
  keyword: string
  density: number
  occurrences: number
  wordCount: number
  titlePresent: boolean
  metaDescriptionOk: boolean
  metaDescriptionLength: number
  headingsWithKeyword: number
  score: number
  suggestions: string[]
}

interface SeoPanelProps {
  title: string
  html: string
  defaultKeyword?: string
}

export function SeoPanel({ title, html, defaultKeyword = '' }: SeoPanelProps) {
  const [keyword, setKeyword] = useState(defaultKeyword)
  const [metaDescription, setMetaDescription] = useState('')
  const [analysis, setAnalysis] = useState<SeoAnalysis | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleAnalyze() {
    if (!keyword.trim()) return
    setLoading(true)
    const res = await fetch('/api/seo/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, html, keyword, metaDescription }),
    })
    if (res.ok) setAnalysis(await res.json())
    setLoading(false)
  }

  const scoreColor = analysis
    ? analysis.score >= 80 ? 'text-green-600' : analysis.score >= 50 ? 'text-amber-600' : 'text-red-600'
    : 'text-stahlgrau'

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-sm text-nachtblau">SEO-Analyse</h3>

      <div className="space-y-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Focus-Keyword"
          className="w-full border border-stone rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tiefblau"
        />
        <input
          type="text"
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          placeholder="Meta-Description (optional)"
          className="w-full border border-stone rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tiefblau"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !keyword.trim()}
          className="w-full px-3 py-1.5 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau disabled:opacity-50"
        >
          {loading ? 'Analysiere…' : 'Analysieren'}
        </button>
      </div>

      {analysis && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stahlgrau">SEO-Score</span>
            <span className={`text-2xl font-bold ${scoreColor}`}>{analysis.score}/100</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-stone/30 rounded-lg">
              <p className="text-stahlgrau">Wörter</p>
              <p className="font-bold text-nachtblau">{analysis.wordCount}</p>
            </div>
            <div className="p-2 bg-stone/30 rounded-lg">
              <p className="text-stahlgrau">KW-Dichte</p>
              <p className="font-bold text-nachtblau">{analysis.density}%</p>
            </div>
            <div className={`p-2 rounded-lg ${analysis.titlePresent ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-stahlgrau">Keyword im Titel</p>
              <p className={`font-bold ${analysis.titlePresent ? 'text-green-700' : 'text-red-700'}`}>
                {analysis.titlePresent ? 'Ja' : 'Nein'}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${analysis.metaDescriptionOk ? 'bg-green-50' : 'bg-amber-50'}`}>
              <p className="text-stahlgrau">Meta-Desc.</p>
              <p className={`font-bold ${analysis.metaDescriptionOk ? 'text-green-700' : 'text-amber-700'}`}>
                {analysis.metaDescriptionLength > 0 ? `${analysis.metaDescriptionLength} Z.` : 'Fehlt'}
              </p>
            </div>
          </div>

          {analysis.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-nachtblau">Empfehlungen</p>
              {analysis.suggestions.map((s, i) => (
                <p key={i} className="text-xs text-amber-700 flex items-start gap-1">
                  <span>•</span><span>{s}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
