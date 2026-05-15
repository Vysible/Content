'use client'

import { useState, useEffect } from 'react'

export default function KlickTippSettingsPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [defaultListId, setDefaultListId] = useState('')
  const [hasCredentials, setHasCredentials] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    fetch('/api/klicktipp/settings')
      .then((r) => r.json())
      .then((data) => {
        setHasCredentials(data.hasCredentials ?? false)
        setDefaultListId(data.defaultListId ?? '')
      })
      .catch((err: unknown) => {
        console.error('[Vysible] KlickTipp-Settings laden fehlgeschlagen', err)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaveResult(null)
    try {
      const res = await fetch('/api/klicktipp/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, defaultListId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setSaveResult({ ok: false, message: data.error ?? `HTTP ${res.status}` })
      } else {
        setSaveResult({ ok: true, message: 'Gespeichert' })
        setHasCredentials(true)
        setPassword('')
      }
    } catch (err: unknown) {
      console.error('[Vysible] KlickTipp-Settings speichern fehlgeschlagen', err)
      setSaveResult({ ok: false, message: 'Netzwerkfehler' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/klicktipp/test', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setTestResult({ ok: true, message: '[OK] Verbunden' })
      } else {
        setTestResult({ ok: false, message: `[FAIL] ${data.error}` })
      }
    } catch (err: unknown) {
      console.error('[Vysible] KlickTipp-Verbindungstest fehlgeschlagen', err)
      setTestResult({ ok: false, message: '[FAIL] Netzwerkfehler' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-nachtblau mb-1">KlickTipp-Verbindung</h2>
      <p className="text-sm text-stahlgrau mb-6">
        Newsletter als Kampagnen-Entwurf in KlickTipp anlegen. Kein Versand aus dem Tool.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-nachtblau mb-1">
            KlickTipp-Benutzername
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="max@musterklinik.de"
            className="w-full px-3 py-2 border border-stone rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cognac/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-nachtblau mb-1">
            KlickTipp-Passwort
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasCredentials ? '••••••••••••••••' : 'Passwort eingeben'}
            className="w-full px-3 py-2 border border-stone rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cognac/50"
          />
          {hasCredentials && (
            <p className="text-xs text-green-700 mt-1">
              [OK] Credentials gespeichert (AES-256 verschlüsselt)
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-nachtblau mb-1">
            Standard-Listen-ID
          </label>
          <input
            type="text"
            value={defaultListId}
            onChange={(e) => setDefaultListId(e.target.value)}
            placeholder="z.B. 12345"
            className="w-full px-3 py-2 border border-stone rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cognac/50"
          />
          <p className="text-xs text-stahlgrau mt-1">
            KlickTipp Empfänger-Listen-ID. Kann pro Projekt in den Projekteinstellungen
            überschrieben werden.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !username || !password}
            className="px-4 py-2 text-sm bg-nachtblau text-white rounded-lg hover:bg-nachtblau/90 disabled:opacity-50 transition"
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </button>

          <button
            onClick={handleTest}
            disabled={testing || !hasCredentials}
            className="px-4 py-2 text-sm border border-stone text-nachtblau rounded-lg hover:bg-stone/30 disabled:opacity-50 transition"
          >
            {testing ? 'Teste...' : 'Verbindung testen'}
          </button>
        </div>

        {saveResult && (
          <p className={`text-sm ${saveResult.ok ? 'text-green-700' : 'text-red-700'}`}>
            {saveResult.message}
          </p>
        )}
        {testResult && (
          <p className={`text-sm ${testResult.ok ? 'text-green-700' : 'text-red-700'}`}>
            {testResult.message}
          </p>
        )}
      </div>
    </div>
  )
}
