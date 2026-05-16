'use client'

import { useState, useEffect, useCallback } from 'react'
import { GoogleAdsSetupGuide } from '@/components/google-ads/GoogleAdsSetupGuide'

interface Props {
  projectId: string
}

export function ProjectGoogleAdsSettings({ projectId }: Props) {
  const [customerId, setCustomerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/settings/google-ads`)
      if (res.ok) {
        const data = await res.json()
        setCustomerId(data.googleAdsCustomerId ?? '')
      }
    } catch (err) {
      console.warn('[Vysible] GoogleAdsSettings: Ladefehler', err)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    setSaving(true)
    setResult(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings/google-ads`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleAdsCustomerId: customerId }),
      })
      if (res.ok) {
        setResult({ ok: true, message: 'Gespeichert' })
        await load()
      } else {
        const data = await res.json()
        setResult({ ok: false, message: data.error ?? 'Fehler beim Speichern' })
      }
    } catch (err) {
      console.warn('[Vysible] GoogleAdsSettings: Speicherfehler', err)
      setResult({ ok: false, message: 'Verbindungsfehler' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-stone rounded-xl p-6">
      <h2 className="text-sm font-semibold text-nachtblau mb-1">Google Ads</h2>
      <p className="text-xs text-stahlgrau mb-4">
        Customer-ID aus Google Ads oben rechts (Format: 123-456-7890).
      </p>

      <div className="flex gap-2 items-start">
        <input
          type="text"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder="123-456-7890"
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

      {customerId && (
        <a
          href={`/projects/${projectId}/google-ads`}
          className="inline-block mt-3 text-xs text-tiefblau hover:underline"
        >
          → Google Ads ansehen
        </a>
      )}

      <GoogleAdsSetupGuide />
    </div>
  )
}
