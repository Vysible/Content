'use client'

import { useEffect, useRef, useState } from 'react'
import type { ContentVersion } from '@/lib/generation/results-store'

interface Props {
  projectId: string
  index: number
  versionField: 'blog' | 'newsletter'
  currentContent: string
  versions: ContentVersion[]
  articleTitle?: string
  onRevised: (newContent: string, versions: ContentVersion[]) => void
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  text: string
  timestamp: string
}

const CHIPS: { key: string; label: string }[] = [
  { key: 'kuerzer',     label: 'Kürzer' },
  { key: 'formaler',    label: 'Formaler' },
  { key: 'lockerer',    label: 'Lockerer' },
  { key: 'praxisbezug', label: 'Mehr Praxisbezug' },
  { key: 'cta',         label: 'CTA stärker' },
  { key: 'seo',         label: 'SEO verbessern' },
  { key: 'keyword',     label: 'Keyword integrieren' },
]

const CHIP_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  CHIPS.map((c) => [c.key, c.label])
)

const MAX_PREVIEW_CHARS = 80

function htmlToPreview(html: string): string {
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return plain.length > MAX_PREVIEW_CHARS ? `${plain.slice(0, MAX_PREVIEW_CHARS)}…` : plain
}

function nowIso(): string {
  return new Date().toISOString()
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export function ChatPanel({
  projectId,
  index,
  versionField,
  currentContent,
  versions,
  articleTitle,
  onRevised,
}: Props) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localVersions, setLocalVersions] = useState<ContentVersion[]>(versions)
  const [showVersions, setShowVersions] = useState(false)
  const [thread, setThread] = useState<ChatMessage[]>([])
  const threadEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [thread])

  async function send(msg?: string, chip?: string) {
    if (!msg && !chip) return
    const userText = chip ? CHIP_LABEL_BY_KEY[chip] ?? chip : msg ?? ''
    const userMessage: ChatMessage = { role: 'user', text: userText, timestamp: nowIso() }
    setThread((prev) => [...prev, userMessage])

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

      const preview =
        versionField === 'blog' ? htmlToPreview(revised as string) : htmlToPreview(revised as string)
      setThread((prev) => [
        ...prev,
        { role: 'assistant', text: preview, timestamp: nowIso() },
      ])
    } catch (err: unknown) {
      console.error('[Vysible] Chat-Überarbeitung fehlgeschlagen:', err)
      setError(err instanceof Error ? err.message : 'Fehler')
      setThread((prev) => [
        ...prev,
        {
          role: 'system',
          text: `Fehler: ${err instanceof Error ? err.message : 'unbekannt'}`,
          timestamp: nowIso(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function restoreVersion(v: ContentVersion) {
    const versionNumber = localVersions.findIndex((lv) => lv.savedAt === v.savedAt) + 1
    onRevised(v.content, localVersions)
    setShowVersions(false)
    setThread((prev) => [
      ...prev,
      {
        role: 'system',
        text: `Version ${versionNumber > 0 ? versionNumber : '?'} wiederhergestellt`,
        timestamp: nowIso(),
      },
    ])
  }

  const headerLabel = articleTitle?.trim()
    ? `KI-Überarbeitung: ${articleTitle}`
    : `KI-Überarbeitung (${versionField === 'blog' ? 'Blog' : 'Newsletter'})`

  return (
    <div className="flex flex-col h-full border-l border-stone bg-stone/10">
      <div className="p-4 border-b border-stone">
        <div className="flex items-start justify-between mb-3 gap-2">
          <h4
            className="font-medium text-sm text-nachtblau truncate"
            title={headerLabel}
          >
            {headerLabel}
          </h4>
          {localVersions.length > 0 && (
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="text-xs text-tiefblau hover:underline whitespace-nowrap flex-shrink-0"
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
                key={`${v.savedAt}-${i}`}
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

      {/* Konversationsverlauf */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {thread.length === 0 && (
          <p className="text-xs text-stahlgrau text-center py-4">
            Noch keine Überarbeitungen. Wähle einen Chip oder schreibe eine Anweisung.
          </p>
        )}
        {thread.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        <div ref={threadEndRef} />
      </div>

      <div className="p-4 border-t border-stone bg-white/40">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(message)
          }}
          placeholder="Eigene Anweisung… (Cmd+Enter zum Senden)"
          className="w-full text-sm border border-stone rounded-lg p-3 resize-none h-20 focus:outline-none focus:border-tiefblau"
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

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'system') {
    return (
      <div className="text-center">
        <span className="inline-block text-[11px] text-stahlgrau bg-stone/40 px-2 py-0.5 rounded-full">
          {message.text} · {formatTime(message.timestamp)}
        </span>
      </div>
    )
  }
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
          isUser
            ? 'bg-tiefblau text-white rounded-br-sm'
            : 'bg-white border border-stone text-anthrazit rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <p
          className={`mt-1 text-[10px] ${isUser ? 'text-white/70' : 'text-stahlgrau'} text-right`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  )
}
