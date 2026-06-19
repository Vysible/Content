'use client'

import { useState, useRef } from 'react'
import type { KeyboardEvent } from 'react'

interface GeplantThema {
  monat: string
  thema: string
}

interface Props {
  projectId: string
  initialKeywords: string[]
  initialThemenPool: string
  initialGeplantThemen: GeplantThema[]
  planningStart: string
  planningEnd: string
}

function generateMonths(start: string, end: string): string[] {
  const months: string[] = []
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  let y = sy, m = sm
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months
}

function formatMonat(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export function ProjectContentSettings({
  projectId,
  initialKeywords,
  initialThemenPool,
  initialGeplantThemen,
  planningStart,
  planningEnd,
}: Props) {
  const [keywords, setKeywords] = useState<string[]>(initialKeywords)
  const [kwInput, setKwInput] = useState('')
  const [themenPool, setThemenPool] = useState(initialThemenPool)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const months = generateMonths(planningStart, planningEnd)
  const [geplantThemen, setGeplantThemen] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const t of initialGeplantThemen) map[t.monat] = t.thema
    return map
  })

  function addKeyword(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed || keywords.includes(trimmed)) return
    setKeywords((prev) => [...prev, trimmed])
    setKwInput('')
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }

  function handleKwKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword(kwInput)
    } else if (e.key === 'Backspace' && kwInput === '' && keywords.length > 0) {
      setKeywords((prev) => prev.slice(0, -1))
    }
  }

  function handleKwBlur() {
    if (kwInput.trim()) addKeyword(kwInput)
  }

  function setThema(monat: string, thema: string) {
    setGeplantThemen(prev => ({ ...prev, [monat]: thema }))
  }

  function clearThema(monat: string) {
    setGeplantThemen(prev => {
      const next = { ...prev }
      delete next[monat]
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const finalKeywords = kwInput.trim()
      ? [...keywords, kwInput.trim()].filter((k, i, a) => a.indexOf(k) === i)
      : keywords
    if (kwInput.trim()) {
      setKeywords(finalKeywords)
      setKwInput('')
    }
    const geplantThemenArr: GeplantThema[] = Object.entries(geplantThemen)
      .filter(([, thema]) => thema.trim())
      .map(([monat, thema]) => ({ monat, thema: thema.trim() }))

    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: finalKeywords, themenPool, geplantThemen: geplantThemenArr }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3_000)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone p-6 space-y-5">
      {/* Keywords */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">
          Keywords <span className="text-stahlgrau font-normal">(optional)</span>
        </label>
        <div
          className="flex flex-wrap gap-1.5 px-3 py-2 border border-stone rounded-lg bg-white focus-within:ring-2 focus-within:ring-bordeaux cursor-text min-h-[42px]"
          onClick={() => inputRef.current?.focus()}
        >
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 text-xs bg-stone px-2 py-0.5 rounded-full text-anthrazit"
            >
              {kw}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeKeyword(kw) }}
                className="text-stahlgrau hover:text-bordeaux leading-none"
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyDown={handleKwKeyDown}
            onBlur={handleKwBlur}
            placeholder={keywords.length === 0 ? 'Keyword eingeben, Enter zum Bestätigen …' : ''}
            className="flex-1 min-w-[140px] text-sm bg-transparent focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-stahlgrau">Enter oder Komma zum Hinzufügen. Backspace entfernt das letzte Keyword.</p>
      </div>

      {/* Themen-Pool */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">
          Themen-Pool <span className="text-stahlgrau font-normal">(optional)</span>
        </label>
        <textarea
          value={themenPool}
          onChange={(e) => setThemenPool(e.target.value)}
          rows={4}
          placeholder="Bevorzugte Themen, Saisonales, Aktionen der Praxis …"
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux resize-none"
        />
      </div>

      {/* Bereits abgestimmte Themen */}
      {months.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-2">
            Bereits abgestimmte Themen <span className="text-stahlgrau font-normal">(verbindlich für die Generierung)</span>
          </label>
          <div className="border border-stone rounded-lg overflow-hidden">
            {months.map((monat, i) => (
              <div
                key={monat}
                className={`flex items-center gap-3 px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-stone/30'}`}
              >
                <span className="text-xs text-stahlgrau w-28 shrink-0">{formatMonat(monat)}</span>
                <input
                  type="text"
                  value={geplantThemen[monat] ?? ''}
                  onChange={(e) => setThema(monat, e.target.value)}
                  placeholder="Thema eintragen …"
                  className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-stone-400"
                />
                {geplantThemen[monat] && (
                  <button
                    type="button"
                    onClick={() => clearThema(monat)}
                    className="text-stahlgrau hover:text-bordeaux text-xs leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-stahlgrau">Eingetragene Themen werden bei der KI-Generierung verbindlich berücksichtigt.</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-nachtblau text-white text-sm rounded-lg hover:bg-black disabled:opacity-50 transition"
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
        {saved && <p className="text-sm text-green-600">Gespeichert ✓</p>}
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      </div>
    </div>
  )
}
