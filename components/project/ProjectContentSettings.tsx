'use client'

import { useState, useRef } from 'react'
import type { KeyboardEvent } from 'react'

interface Props {
  projectId: string
  initialKeywords: string[]
  initialThemenPool: string
}

export function ProjectContentSettings({ projectId, initialKeywords, initialThemenPool }: Props) {
  const [keywords, setKeywords] = useState<string[]>(initialKeywords)
  const [kwInput, setKwInput] = useState('')
  const [themenPool, setThemenPool] = useState(initialThemenPool)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: finalKeywords, themenPool }),
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
          className="flex flex-wrap gap-1.5 px-3 py-2 border border-stone rounded-lg bg-white focus-within:ring-2 focus-within:ring-cognac cursor-text min-h-[42px]"
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

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau disabled:opacity-50 transition"
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
        {saved && <p className="text-sm text-green-600">Gespeichert ✓</p>}
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      </div>
    </div>
  )
}
