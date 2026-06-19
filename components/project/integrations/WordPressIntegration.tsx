'use client'

import { useState, useEffect } from 'react'
import { IntegrationCard } from './IntegrationCard'

interface Props {
  projectId: string
}

const PREREQUISITES = [
  { step: 'WordPress-Website mit REST-API (Standard ab WP 5.0+)' },
  { step: 'WordPress-Nutzer mit Redakteur- oder Administrator-Rechten' },
  { step: 'Application Password erstellen', detail: 'WP Admin → Benutzer → Profil → ganz unten „Application Passwords" → Name eingeben → Passwort generieren' },
  { step: 'Die URL deiner WordPress-Seite', detail: 'z. B. https://praxis-muster.de' },
]

export function WordPressIntegration({ projectId }: Props) {
  const [connected, setConnected] = useState(false)
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/integrations/WORDPRESS`)
      .then((r) => r.json())
      .then((data: { connected: boolean; config?: Record<string, string> }) => {
        setConnected(data.connected)
        if (data.config?.url) setUrl(data.config.url)
        if (data.config?.username) setUsername(data.config.username)
      })
      .catch((err: unknown) => console.warn('[Vysible] WP-Status Fehler:', err))
  }, [projectId])

  async function handleSave() {
    setSaving(true); setSaveError(null); setTestResult(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations/WORDPRESS`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: { url, username, appPassword },
          config: { url, username },
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
      const res = await fetch(`/api/projects/${projectId}/integrations/WORDPRESS/test`, { method: 'POST' })
      const data = await res.json() as { ok: boolean; error?: string }
      setTestResult(data)
    } catch (err: unknown) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : 'Fehler' })
    } finally {
      setTesting(false)
    }
  }

  async function handleDisconnect() {
    await fetch(`/api/projects/${projectId}/integrations/WORDPRESS`, { method: 'DELETE' })
    setConnected(false); setUrl(''); setUsername(''); setAppPassword('')
  }

  return (
    <IntegrationCard
      title="WordPress"
      description="Blog-Entwürfe direkt in WordPress veröffentlichen."
      connected={connected}
      saving={saving} testing={testing} testResult={testResult}
      saved={saved} saveError={saveError}
      onSave={handleSave} onTest={handleTest} onDisconnect={handleDisconnect}
      prerequisites={PREREQUISITES}
    >
      <Field label="WordPress URL" value={url} onChange={setUrl} placeholder="https://praxis-muster.de" />
      <Field label="Benutzername" value={username} onChange={setUsername} placeholder="redakteur" />
      <Field label="Application Password" value={appPassword} onChange={setAppPassword} type="password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" />
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
