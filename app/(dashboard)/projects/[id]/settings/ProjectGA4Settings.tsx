'use client'

import { useState, useEffect, useCallback } from 'react'
import { GA4SetupGuide } from '@/components/analytics/GA4SetupGuide'

interface Props {
  projectId: string
}

export function ProjectGA4Settings({ projectId }: Props) {
  const [propertyId, setPropertyId] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/settings/ga4`)
      if (res.ok) {
        const data = await res.json()
        setPropertyId(data.ga4PropertyId ?? '')
      }
    } catch (err) {
      console.warn('[Vysible] GA4Settings: Ladefehler', err)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    setSaving(true)
    setResult(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings/ga4`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ga4PropertyId: propertyId }),
      })
      if (res.ok) {
        setResult({ ok: true, message: 'Gespeichert' })
      } else {
        const data = await res.json()
        setResult({ ok: false, message: data.error ?? 'Fehler beim Speichern' })
      }
    } catch (err) {
      console.warn('[Vysible] GA4Settings: Speicherfehler', err)
      setResult({ ok: false, message: 'Verbindungsfehler' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-stone rounded-xl p-6">
      <h2 className="text-sm font-semibold text-nachtblau mb-1">Google Analytics 4</h2>
      <p className="text-xs text-stahlgrau mb-4">
        Property-ID aus der GA4-Oberfläche (Einstellungen → Property → Property-ID).
      </p>

      <div className="flex gap-2 items-start">
        <input
          type="text"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          placeholder="properties/123456789"
          className="flex-1 px-3 py-2 text-sm border border-stone rounded-lg focus:outline-none focus:ring-1 focus:ring-cognac"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm bg-nachtblau text-creme rounded-lg hover:bg-tiefblau transition disabled:opacity-50"
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
      </div>

      {result && (
        <p className={`mt-2 text-xs ${result.ok ? 'text-green-700' : 'text-red-600'}`}>
          {result.message}
        </p>
      )}

      {propertyId && (
        <a
          href={`/projects/${projectId}/analytics`}
          className="inline-block mt-3 text-xs text-tiefblau hover:underline"
        >
          → Analytics ansehen
        </a>
      )}

      <GA4SetupGuide />
    </div>
  )
}
