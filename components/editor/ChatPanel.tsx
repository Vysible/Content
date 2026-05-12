'use client'

import { useState } from 'react'
import type { ContentVersion } from '@/lib/generation/results-store'

interface Props {
  projectId: string
  index: number
  versionField: 'blog' | 'newsletter'
  currentContent: string
  versions: ContentVersion[]
  onRevised: (newContent: string, versions: ContentVersion[]) => void
}

const CHIPS = [
  { key: 'kuerzer',     label: 'Kürzer' },
  { key: 'formaler',    label: 'Formaler' },
  { key: 'lockerer',    label: 'Lockerer' },
  { key: 'praxisbezug', label: 'Mehr Praxisbezug' },
  { key: 'cta',         label: 'CTA stärker' },
  { key: 'seo',         label: 'SEO verbessern' },
  { key: 'keyword',     label: 'Keyword integrieren' },
]

export function ChatPanel({ projectId, index, versionField, currentContent, versions, onRevised }: Props) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localVersions, setLocalVersions] = useState<ContentVersion[]>(versions)
  const [showVersions, setShowVersions] = useState(false)

  async function send(msg?: string, chip?: string) {
    if (!msg && !chip) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index, message: msg ?? '', chip, currentContent, versionField }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      const { revised, versions: newVersions } = await res.json()
      setLocalVersions(newVersions)
      onRevised(revised, newVersions)
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  function restoreVersion(v: ContentVersion) {
    onRevised(v.content, localVersions)
    setShowVersions(false)
  }

  return (
    <div className="flex flex-col h-full border-l border-stone bg-stone/10">
      <div className="p-4 border-b border-stone">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm text-nachtblau">KI-Überarbeitung</h4>
          {localVersions.length > 0 && (
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="text-xs text-tiefblau hover:underline"
            >
              {localVersions.length} Version{localVersions.length !== 1 ? 'en' : ''}
            </button>
          )}
        </div>

        {/* Versions-Liste */}
        {showVersions && (
          <div className="mb-3 space-y-1 max-h-40 overflow-y-auto">
            {[...localVersions].reverse().map((v, i) => (
              <button
                key={i}
                onClick={() => restoreVersion(v)}
                className="w-full text-left text-xs p-2 bg-white border border-stone rounded hover:border-tiefblau transition"
              >
                Version {localVersions.length - i} · {new Date(v.savedAt).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </button>
            ))}
          </div>
        )}

        {/* Quick-Action-Chips */}
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              disabled={loading}
              onClick={() => send(undefined, c.key)}
              className="text-xs px-2.5 py-1 bg-white border border-stone rounded-full hover:border-tiefblau hover:text-tiefblau transition disabled:opacity-40"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex-1">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(message)
          }}
          placeholder="Eigene Anweisung… (Cmd+Enter zum Senden)"
          className="w-full text-sm border border-stone rounded-lg p-3 resize-none h-24 focus:outline-none focus:border-tiefblau"
          disabled={loading}
        />

        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

        <button
          onClick={() => send(message)}
          disabled={!message.trim() || loading}
          className="mt-2 w-full px-4 py-2 text-sm bg-tiefblau text-white rounded-lg hover:bg-nachtblau transition disabled:opacity-40"
        >
          {loading ? 'Überarbeite…' : 'Senden'}
        </button>
      </div>
    </div>
  )
}
