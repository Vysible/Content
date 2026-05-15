'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HedyImport } from '@/components/wizard/HedyImport'

interface HedyImportHighlightBannerProps {
  projectId: string
}

export function HedyImportHighlightBanner({ projectId }: HedyImportHighlightBannerProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  async function handleImported(positioning: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positioningDocument: positioning, hedyImportHighlight: false }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDismissed(true)
      router.refresh()
    } catch (err: unknown) {
      console.error('[Vysible] Positionierungsdokument speichern fehlgeschlagen', err)
    }
  }

  async function handleDismiss() {
    try {
      await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hedyImportHighlight: false }),
      })
    } catch (err: unknown) {
      console.warn('[Vysible] hedyImportHighlight zurücksetzen fehlgeschlagen', err)
    }
    setDismissed(true)
    router.refresh()
  }

  if (dismissed) return null

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">Neues Projekt geklont — Positionierungsworkshop importieren</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Importiere das Positionierungsdokument aus einem Hedy-Transkript, um den Content praxisspezifisch zu machen.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs text-amber-500 hover:text-amber-700 transition flex-shrink-0"
          title="Banner ausblenden"
        >
          ✕
        </button>
      </div>
      <HedyImport projectId={projectId} onImported={handleImported} />
    </div>
  )
}
