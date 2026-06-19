'use client'

import { useState, useEffect } from 'react'
import { IntegrationCard } from './IntegrationCard'

interface Props {
  projectId: string
}

const PREREQUISITES = [
  { step: 'LinkedIn-Unternehmensseite oder persönliches Profil' },
  { step: 'LinkedIn Developer App anlegen', detail: 'Produkte: „Share on LinkedIn" + „Sign In with LinkedIn"', link: { label: 'linkedin.com/developers', href: 'https://www.linkedin.com/developers' } },
  { step: 'Access Token generieren', detail: 'OAuth 2.0 Scope: w_member_social (Persönlich) oder w_organization_social (Unternehmensseite). Token läuft nach 60 Tagen ab — muss regelmäßig erneuert werden.' },
  { step: 'Person ID oder Organisation ID', detail: 'Persönlich: GET /v2/me → Feld „id". Unternehmen: GET /v2/organizations → Feld „id"' },
]

export function LinkedInIntegration({ projectId }: Props) {
  const [connected, setConnected] = useState(false)
  const [accessToken, setAccessToken] = useState('')
  const [entityId, setEntityId] = useState('')
  const [postAs, setPostAs] = useState<'person' | 'organization'>('organization')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/integrations/LINKEDIN`)
      .then((r) => r.json())
      .then((data: { connected: boolean; config?: Record<string, string> }) => {
        setConnected(data.connected)
        if (data.config?.entityId) setEntityId(data.config.entityId)
        if (data.config?.postAs) setPostAs(data.config.postAs as 'person' | 'organization')
      })
      .catch((err: unknown) => console.warn('[Vysible] LI-Status Fehler:', err))
  }, [projectId])

  async function handleSave() {
    setSaving(true); setSaveError(null); setTestResult(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations/LINKEDIN`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: { accessToken },
          config: { entityId, postAs },
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
      const res = await fetch(`/api/projects/${projectId}/integrations/LINKEDIN/test`, { method: 'POST' })
      const data = await res.json() as { ok: boolean; error?: string }
      setTestResult(data)
    } catch (err: unknown) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : 'Fehler' })
    } finally {
      setTesting(false)
    }
  }

  async function handleDisconnect() {
    await fetch(`/api/projects/${projectId}/integrations/LINKEDIN`, { method: 'DELETE' })
    setConnected(false); setAccessToken(''); setEntityId('')
  }

  return (
    <IntegrationCard
      title="LinkedIn"
      description="Beiträge direkt auf LinkedIn-Unternehmensseite oder Profil veröffentlichen."
      connected={connected}
      saving={saving} testing={testing} testResult={testResult}
      saved={saved} saveError={saveError}
      onSave={handleSave} onTest={handleTest} onDisconnect={handleDisconnect}
      prerequisites={PREREQUISITES}
    >
      <Field label="Access Token" value={accessToken} onChange={setAccessToken} type="password" placeholder="AQxxxxxxx…" />

      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">Posten als</label>
        <div className="inline-flex rounded-lg border border-stone overflow-hidden">
          {(['organization', 'person'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setPostAs(opt)}
              className={`px-4 py-1.5 text-sm font-medium transition ${
postAs === opt ? 'bg-nachtblau text-white' : 'bg-white text-stahlgrau hover:text-anthrazit'              }`}
            >
              {opt === 'organization' ? 'Unternehmensseite' : 'Persönliches Profil'}
            </button>
          ))}
        </div>
      </div>

      <Field
        label={postAs === 'organization' ? 'Organisations-ID' : 'Person-ID'}
        value={entityId}
        onChange={setEntityId}
        placeholder="123456789"
      />
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
