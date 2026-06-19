'use client'

import { useState, useEffect } from 'react'
import { IntegrationCard } from './IntegrationCard'

interface Props {
  projectId: string
}

const PREREQUISITES = [
  { step: 'Aktiver KlickTipp-Account', link: { label: 'klicktipp.com', href: 'https://klicktipp.com' } },
  { step: 'Login-E-Mail und Passwort des KlickTipp-Accounts' },
  { step: 'Optional: Listen-ID', detail: 'In KlickTipp unter Kontakte → Listen → die gewünschte Liste öffnen → ID aus der URL ablesen' },
]

export function KlickTippIntegration({ projectId }: Props) {
  const [connected, setConnected] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [listId, setListId] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/integrations/KLICKTIPP`)
      .then((r) => r.json())
      .then((data: { connected: boolean; config?: Record<string, string> }) => {
        setConnected(data.connected)
        if (data.config?.listId) setListId(data.config.listId)
      })
      .catch((err: unknown) => console.warn('[Vysible] KT-Status Fehler:', err))
  }, [projectId])

  async function handleSave() {
    setSaving(true); setSaveError(null); setTestResult(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations/KLICKTIPP`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: { username, password },
          config: { listId },
        }),
      })
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? `HTTP ${res.status}`)
      setConnected(true); setSaved(true)
      setTimeout(() => setSaved(false), 3_000)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations/KLICKTIPP/test`, { method: 'POST' })
      const data = await res.json() as { ok: boolean; error?: string }
      setTestResult(data)
    } catch (err: unknown) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : 'Fehler' })
    } finally {
      setTesting(false)
    }
  }

  async function handleDisconnect() {
    await fetch(`/api/projects/${projectId}/integrations/KLICKTIPP`, { method: 'DELETE' })
    setConnected(false); setUsername(''); setPassword(''); setListId('')
  }

  return (
    <IntegrationCard
      title="KlickTipp"
      description="Newsletter-Kampagnen direkt aus Vysible in KlickTipp anlegen."
      connected={connected}
      saving={saving} testing={testing} testResult={testResult}
      saved={saved} saveError={saveError}
      onSave={handleSave} onTest={handleTest} onDisconnect={handleDisconnect}
      prerequisites={PREREQUISITES}
    >
      <Field label="E-Mail / Benutzername" value={username} onChange={setUsername} placeholder="deine@email.de" />
      <Field label="Passwort" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
      <Field label="Listen-ID (optional)" value={listId} onChange={setListId} placeholder="z. B. 12345" />
    </IntegrationCard>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-anthrazit mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux"
      />
    </div>
  )
}
