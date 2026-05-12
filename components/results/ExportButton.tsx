'use client'

import { useState } from 'react'
import type { StoredTextResult } from '@/lib/generation/results-store'

interface Props {
  projectId: string
  textResults: StoredTextResult[]
}

export function ExportButton({ projectId, textResults }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasReviewed =
    textResults.some((r) => r.blogStatus && r.blogStatus !== 'ausstehend') ||
    textResults.some((r) => r.newsletterStatus && r.newsletterStatus !== 'ausstehend') ||
    textResults.some((r) => r.socialStatus && r.socialStatus !== 'ausstehend')

  async function download() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/export`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      a.download = match?.[1] ?? 'export.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={download}
        disabled={!hasReviewed || loading}
        title={
          !hasReviewed
            ? 'Bitte mindestens einen Inhalt auf einen Status > Ausstehend setzen'
            : 'ZIP herunterladen (XLSX + DOCX + PDF + HTML)'
        }
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-tiefblau text-white rounded-lg hover:bg-nachtblau transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          'Wird erstellt…'
        ) : (
          <>
            <span>↓</span> ZIP exportieren
          </>
        )}
      </button>
      {!hasReviewed && (
        <p className="text-xs text-stahlgrau">Status mindestens eines Inhalts ändern</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
