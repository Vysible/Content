'use client'

import { useState } from 'react'
import { PROVIDER_MODELS } from '@/config/model-prices'

const ALL_MODELS = Object.values(PROVIDER_MODELS).flat()

interface AppConfig {
  id: string
  themesMinPraxisQuote: number
  themesMinSeoQuote: number
  modelThemes: string
  modelBlogOutline: string
  modelBlog: string
  modelNewsletter: string
  modelSocial: string
  modelImageBrief: string
}

interface Props {
  initial: AppConfig
}

const MODEL_STEP_LABELS: { field: keyof AppConfig; label: string }[] = [
  { field: 'modelThemes',      label: 'Themenplanung' },
  { field: 'modelBlogOutline', label: 'Blog-Gliederung' },
  { field: 'modelBlog',        label: 'Blog-Artikel' },
  { field: 'modelNewsletter',  label: 'Newsletter' },
  { field: 'modelSocial',      label: 'Social Media' },
  { field: 'modelImageBrief',  label: 'Bild-Briefing' },
]

export default function ParameterSettingsForm({ initial }: Props) {
  const [values, setValues] = useState<AppConfig>(initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function setFloat(field: keyof AppConfig, raw: string) {
    const val = Math.min(1, Math.max(0, parseFloat(raw) / 100))
    setValues((v) => ({ ...v, [field]: isNaN(val) ? v[field as keyof AppConfig] : val }))
  }

  function setModel(field: keyof AppConfig, val: string) {
    setValues((v) => ({ ...v, [field]: val }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/parameters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error ?? 'Unbekannter Fehler')
      }
      setMessage({ type: 'ok', text: 'Einstellungen gespeichert.' })
    } catch (err: unknown) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Fehler beim Speichern' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* Qualitätsschwellwerte */}
      <div className="bg-white rounded-xl border border-stone p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-nachtblau">Themen-Qualitätsschwellwerte</h2>
          <p className="text-xs text-stahlgrau mt-0.5">
            Unterschreitung der Praxis-Quote führt zu einem Abbruch mit Wiederholung.
            SEO-Quote ist ein Hinweis (kein Abbruch).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-stahlgrau mb-1">
              Praxis-Quote (Minimum)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100}
                value={Math.round(values.themesMinPraxisQuote * 100)}
                onChange={(e) => setFloat('themesMinPraxisQuote', e.target.value)}
                className="flex-1 accent-cognac"
              />
              <span className="w-10 text-right text-sm font-medium text-nachtblau">
                {Math.round(values.themesMinPraxisQuote * 100)}%
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stahlgrau mb-1">
              SEO-Titel-Quote (Empfehlung)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100}
                value={Math.round(values.themesMinSeoQuote * 100)}
                onChange={(e) => setFloat('themesMinSeoQuote', e.target.value)}
                className="flex-1 accent-cognac"
              />
              <span className="w-10 text-right text-sm font-medium text-nachtblau">
                {Math.round(values.themesMinSeoQuote * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modell-Auswahl */}
      <div className="bg-white rounded-xl border border-stone p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-nachtblau">KI-Modell pro Aufgabe</h2>
          <p className="text-xs text-stahlgrau mt-0.5">
            Günstigere Modelle (Haiku) für einfache Aufgaben reduzieren die Kosten deutlich.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODEL_STEP_LABELS.map(({ field, label }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-stahlgrau mb-1">{label}</label>
              <select
                value={values[field] as string}
                onChange={(e) => setModel(field, e.target.value)}
                className="w-full rounded-lg border border-stone bg-white px-3 py-2 text-sm text-nachtblau focus:outline-none focus:ring-2 focus:ring-cognac"
              >
                {ALL_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Speichern */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-cognac text-white text-sm font-medium hover:bg-cognac/90 disabled:opacity-50 transition"
        >
          {saving ? 'Wird gespeichert…' : 'Speichern'}
        </button>
        {message && (
          <p className={`text-sm ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}
