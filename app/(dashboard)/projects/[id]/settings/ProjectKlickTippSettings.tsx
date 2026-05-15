'use client'

import { useState, useEffect, useCallback } from 'react'

interface Props {
  projectId: string
}

export function ProjectKlickTippSettings({ projectId }: Props) {
  const [hasCredentials, setHasCredentials] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [listId, setListId] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/klicktipp`)
    if (res.ok) {
      const data = await res.json()
      setHasCredentials(data.hasCredentials)
      setListId(data.listId ?? '')
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!username || !password) return
    setSaving(true)
    setResult(null)
    const res = await fetch(`/api/projects/${projectId}/klicktipp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, listId }),
    })
    if (res.ok) {
      setResult({ ok: true, message: 'Gespeichert' })
      setPassword('')
      setUsername('')
      await load()
    } else {
      const data = await res.json()
      setResult({ ok: false, message: data.error ?? 'Fehler' })
    }
    setSaving(false)
  }

  async function handleRemove() {
    if (!confirm('KlickTipp-Zugangsdaten für dieses Projekt entfernen?')) return
    setRemoving(true)
    await fetch(`/api/projects/${projectId}/klicktipp`, { method: 'DELETE' })
    setHasCredentials(false)
    setListId('')
    setRemoving(false)
  }

  return (
    <div className="bg-white border border-stone rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-nachtblau">KlickTipp-Zugangsdaten</p>
          <p className="text-xs text-stahlgrau mt-0.5">Projekt-spezifisches Konto (überschreibt globale Einstellung)</p>
        </div>
        {hasCredentials && (
          <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-1 rounded-full">✓ Konfiguriert</span>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-stahlgrau mb-1">Benutzername</label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder={hasCredentials ? 'Neuen Benutzernamen eingeben' : 'z.B. vkohnert4'}
          className="w-full border border-stone rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cognac/50"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stahlgrau mb-1">Passwort</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={hasCredentials ? '••••••••' : 'Passwort eingeben'}
          className="w-full border border-stone rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cognac/50"
        />
        <p className="text-xs text-stahlgrau mt-1">AES-256 verschlüsselt gespeichert.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-stahlgrau mb-1">Listen-ID</label>
        <input
          type="text"
          value={listId}
          onChange={e => setListId(e.target.value)}
          placeholder="z.B. 123456"
          className="w-full border border-stone rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cognac/50"
        />
        <p className="text-xs text-stahlgrau mt-1">KlickTipp Empfänger-Listen-ID für dieses Projekt.</p>
      </div>

      {result && (
        <p className={`text-sm ${result.ok ? 'text-green-700' : 'text-red-700'}`}>{result.message}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={!username || !password || saving}
          className="px-4 py-2 text-sm bg-cognac hover:bg-cognacDark text-black font-semibold rounded-lg disabled:opacity-40 transition"
        >
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
        {hasCredentials && (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="px-4 py-2 text-sm border border-stone rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 transition"
          >
            {removing ? 'Entfernt…' : 'Entfernen'}
          </button>
        )}
      </div>
    </div>
  )
}
