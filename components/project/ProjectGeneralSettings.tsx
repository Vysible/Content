'use client'

import { useState } from 'react'

const MONTH_OPTIONS = (() => {
  const opts: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = -12; i < 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const value = d.toISOString().slice(0, 7)
    const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    opts.push({ value, label })
  }
  return opts
})()

function toYearMonth(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString().slice(0, 7)
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().slice(0, 7)
}

interface Props {
  projectId: string
  initialName: string
  initialPraxisUrl: string
  initialPraxisName: string
  initialFachgebiet: string
  initialAnsprache: string
  initialPlanningStart: string // ISO date string
  initialPlanningEnd: string   // ISO date string
}

export function ProjectGeneralSettings({
  projectId,
  initialName,
  initialPraxisUrl,
  initialPraxisName,
  initialFachgebiet,
  initialAnsprache,
  initialPlanningStart,
  initialPlanningEnd,
}: Props) {
  const [name, setName] = useState(initialName)
  const [praxisUrl, setPraxisUrl] = useState(initialPraxisUrl)
  const [praxisName, setPraxisName] = useState(initialPraxisName)
  const [fachgebiet, setFachgebiet] = useState(initialFachgebiet)
  const [ansprache, setAnsprache] = useState<'Du' | 'Sie'>(
    initialAnsprache === 'Du' ? 'Du' : 'Sie'
  )
  const [planningStart, setPlanningStart] = useState(toYearMonth(initialPlanningStart))
  const [planningEnd, setPlanningEnd] = useState(toYearMonth(initialPlanningEnd))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, praxisUrl, praxisName, fachgebiet, ansprache, planningStart, planningEnd }),
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-1">Projektname</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-1">Praxisname</label>
          <input
            type="text"
            value={praxisName}
            onChange={(e) => setPraxisName(e.target.value)}
            placeholder="z. B. Zahnarztpraxis Mustermann"
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-1">Praxis-URL</label>
          <input
            type="text"
            value={praxisUrl}
            onChange={(e) => setPraxisUrl(e.target.value)}
            placeholder="https://praxis-mustermann.de"
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-1">Fachgebiet</label>
          <input
            type="text"
            value={fachgebiet}
            onChange={(e) => setFachgebiet(e.target.value)}
            placeholder="z. B. Allgemeinmedizin, Zahnmedizin …"
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-1">Planungsstart</label>
          <select
            value={planningStart}
            onChange={(e) => setPlanningStart(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-1">Planungsende</label>
          <select
            value={planningEnd}
            onChange={(e) => setPlanningEnd(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-1">Ansprache</label>
          <div className="inline-flex rounded-lg border border-stone overflow-hidden w-full">
            {(['Sie', 'Du'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAnsprache(opt)}
                className={`flex-1 py-2 text-sm font-medium transition ${
                  ansprache === opt
? 'bg-nachtblau text-white'                    : 'bg-white text-stahlgrau hover:text-anthrazit'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
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
