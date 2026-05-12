'use client'

import { useState } from 'react'
import { PROVIDER_MODELS } from '@/config/model-prices'

const PROVIDERS = [
  { value: 'ANTHROPIC', label: 'Anthropic', phase: 1 },
  { value: 'OPENAI',    label: 'OpenAI',    phase: 1 },
  { value: 'DATASEO',   label: 'DataForSEO', phase: 3 },
  { value: 'KLICKTIPP', label: 'Klick-Tipp', phase: 3 },
  { value: 'WORDPRESS', label: 'WordPress',  phase: 3 },
  { value: 'HEDY',      label: 'Hedy',       phase: 3 },
  { value: 'CANVA',     label: 'Canva',      phase: 3 },
]

interface ApiKeyFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function ApiKeyForm({ onSuccess, onCancel }: ApiKeyFormProps) {
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('ANTHROPIC')
  const [key, setKey] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const models = PROVIDER_MODELS[provider] ?? []

  function handleProviderChange(p: string) {
    setProvider(p)
    const defaultModels = PROVIDER_MODELS[p]
    if (defaultModels?.length) setModel(defaultModels[0])
    else setModel('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, provider, key, model: model || undefined }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Fehler beim Speichern')
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">Bezeichnung</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Anthropic Produktion"
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">Provider</label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value} disabled={p.phase > 1}>
              {p.label}{p.phase > 1 ? ' (Phase 3)' : ''}
            </option>
          ))}
        </select>
      </div>

      {models.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-1">Standard-Modell</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac"
          >
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">API-Key</label>
        <input
          type="password"
          required
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-... oder sk-..."
          autoComplete="off"
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-cognac"
        />
        <p className="mt-1 text-xs text-stahlgrau">Wird AES-256 verschlüsselt gespeichert und nie im Klartext zurückgegeben.</p>
      </div>

      {error && (
        <p className="text-xs text-bordeaux bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-cognac hover:bg-cognacDark text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-60"
        >
          {loading ? 'Speichern …' : 'Speichern'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-stone hover:bg-gray-200 text-anthrazit text-sm font-medium py-2 rounded-lg transition"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
