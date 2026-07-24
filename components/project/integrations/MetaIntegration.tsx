'use client'

import { useState, useEffect } from 'react'
import { IntegrationCard } from './IntegrationCard'

interface Props {
  projectId: string
}

const PREREQUISITES = [
  { step: 'Facebook-Seite (Business oder Creator)', link: { label: 'Meta Business Suite', href: 'https://business.facebook.com' } },
  { step: 'Verknüpftes Instagram Business- oder Creator-Konto (optional)', detail: 'Instagram-Konto muss auf „Professional" umgestellt und mit der Facebook-Seite verbunden sein' },
  { step: 'Meta Developer App — Permissions', detail: 'Benötigte Scopes: pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish, instagram_manage_insights', link: { label: 'developers.facebook.com', href: 'https://developers.facebook.com' } },
  { step: 'Dauerhaften Page Access Token generieren', detail: 'Graph API Explorer → Benutzertoken generieren (mit obigen Scopes) → In Access Token Tool gegen langlebigen Token tauschen → /me/accounts aufrufen → Page Access Token kopieren. Dieser läuft nie ab.' },
  { step: 'Seiten-ID (Page ID)', detail: 'Aus /me/accounts-Antwort kopieren (Feld „id")' },
  { step: 'Instagram Business Account ID (optional, für Instagram-Analytics)', detail: 'Graph API: /{page-id}?fields=instagram_business_account → Feld „id"' },
]

export function MetaIntegration({ projectId }: Props) {
  const [connected, setConnected] = useState(false)
  const [pageToken, setPageToken] = useState('')
  const [pageId, setPageId] = useState('')
  const [igAccountId, setIgAccountId] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/integrations/META`)
      .then((r) => r.json())
      .then((data: { connected: boolean; config?: Record<string, string> }) => {
        setConnected(data.connected)
        if (data.config?.pageId) setPageId(data.config.pageId)
        if (data.config?.igAccountId) setIgAccountId(data.config.igAccountId)
      })
      .catch((err: unknown) => console.warn('[Vysible] Meta-Status Fehler:', err))
  }, [projectId])

  async function handleSave() {
    setSaving(true); setSaveError(null); setTestResult(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations/META`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: { pageAccessToken: pageToken },
          config: { pageId, igAccountId },
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
      const res = await fetch(`/api/projects/${projectId}/integrations/META/test`, { method: 'POST' })
      const data = await res.json() as { ok: boolean; error?: string }
      setTestResult(data)
    } catch (err: unknown) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : 'Fehler' })
    } finally {
      setTesting(false)
    }
  }

  async function handleDisconnect() {
    await fetch(`/api/projects/${projectId}/integrations/META`, { method: 'DELETE' })
    setConnected(false); setPageToken(''); setPageId(''); setIgAccountId('')
  }

  return (
    <IntegrationCard
      title="Facebook & Instagram"
      description="Posts direkt auf Facebook-Seite und Instagram Business veröffentlichen."
      connected={connected}
      saving={saving} testing={testing} testResult={testResult}
      saved={saved} saveError={saveError}
      onSave={handleSave} onTest={handleTest} onDisconnect={handleDisconnect}
      prerequisites={PREREQUISITES}
    >
      <Field label="Page Access Token" value={pageToken} onChange={setPageToken} type="password" placeholder="EAAxxxxxxx…" />
      <Field label="Seiten-ID (Page ID)" value={pageId} onChange={setPageId} placeholder="123456789012345" />
      <Field label="Instagram Business Account ID (optional)" value={igAccountId} onChange={setIgAccountId} placeholder="987654321098765" />
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
