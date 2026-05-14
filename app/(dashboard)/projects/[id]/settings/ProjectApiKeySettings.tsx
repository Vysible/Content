'use client'

import { useState } from 'react'

interface ApiKeyOption {
  id: string
  name: string
  provider: string
}

interface Props {
  projectId: string
  initialApiKeyId: string | null
  apiKeys: ApiKeyOption[]
}

const PROVIDER_LABEL: Record<string, string> = {
  ANTHROPIC: 'Anthropic',
  OPENAI: 'OpenAI',
}

export function ProjectApiKeySettings({ projectId, initialApiKeyId, apiKeys }: Props) {
  const [selectedKeyId, setSelectedKeyId] = useState<string>(initialApiKeyId ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeyId: selectedKeyId || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Fehler beim Speichern')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Netzwerkfehler beim Speichern.')
    } finally {
      setSaving(false)
    }
  }

  const anthropicKeys = apiKeys.filter((k) => k.provider === 'ANTHROPIC')
  const openaiKeys = apiKeys.filter((k) => k.provider === 'OPENAI')

  return (
    <div className="bg-white rounded-xl border border-stone p-6 max-w-2xl">
      <h3 className="text-sm font-semibold text-nachtblau mb-1">KI-API-Key (Pro-Projekt)</h3>
      <p className="text-xs text-stahlgrau mb-4">
        Wählen Sie einen spezifischen API-Key für dieses Projekt. Ohne Auswahl wird der globale
        Standard-Key verwendet.
      </p>

      <div className="space-y-3 mb-6">
        <label className="block text-xs font-medium text-anthrazit mb-1">
          API-Key-Auswahl
        </label>
        <select
          value={selectedKeyId}
          onChange={(e) => setSelectedKeyId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white text-anthrazit focus:outline-none focus:ring-2 focus:ring-cognac focus:border-transparent transition"
        >
          <option value="">— Globaler Standard-Key —</option>

          {anthropicKeys.length > 0 && (
            <optgroup label="Anthropic">
              {anthropicKeys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({PROVIDER_LABEL[k.provider]})
                </option>
              ))}
            </optgroup>
          )}

          {openaiKeys.length > 0 && (
            <optgroup label="OpenAI">
              {openaiKeys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({PROVIDER_LABEL[k.provider]})
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {selectedKeyId === '' && (
          <p className="text-xs text-stahlgrau">
            Kein Key gewählt — globaler Standard-Key wird für die Generierung verwendet.
          </p>
        )}
      </div>

      {error && (
        <p className="mb-3 text-xs text-bordeaux bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {saved && (
        <p className="mb-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Einstellungen gespeichert.
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-cognac hover:bg-cognacDark text-black text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
      >
        {saving ? 'Speichert …' : 'Speichern'}
      </button>
    </div>
  )
}
