'use client'

import { useState } from 'react'
import type { StoredTextResult } from '@/lib/generation/results-store'

interface Props {
  projectId: string
  monat: string
  missing?: boolean
  onSuccess: (result: StoredTextResult) => void
}

export function RegenerateButton({ projectId, monat, missing = false, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Text für "${monat}" neu generieren? Das überschreibt den aktuellen Inhalt.`)) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/projects/${projectId}/regenerate-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monat }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      // Read SSE stream — server sends heartbeat comments + final data event
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        // Parse completed SSE lines
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = JSON.parse(line.slice(6)) as { ok?: boolean; result?: StoredTextResult; error?: string }
          if (payload.error) throw new Error(payload.error)
          if (payload.ok && payload.result) {
            onSuccess(payload.result)
            return
          }
        }
      }

      throw new Error('Keine Antwort erhalten')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`text-xs px-2.5 py-1 rounded-lg border transition disabled:opacity-50 ${
          missing
            ? 'border-red-300 text-red-600 bg-red-50 hover:bg-red-100'
            : 'border-stone text-stahlgrau hover:bg-stone/40'
        }`}
      >
        {loading ? '⟳ Generiert…' : missing ? '⚠ Text fehlt — Neu generieren' : '↺ Neu generieren'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}
