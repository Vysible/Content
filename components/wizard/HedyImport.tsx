'use client'

import { useState } from 'react'

interface HedyImportProps {
  projectId?: string
  onImported: (positioning: string) => void
}

export function HedyImport({ projectId, onImported }: HedyImportProps) {
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleImport() {
    if (!transcript.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/hedy/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, transcript }),
      })
      if (!res.ok) throw new Error('Import fehlgeschlagen')
      const { positioning } = await res.json()
      onImported(positioning)
      setTranscript('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stahlgrau">
        Füge das Transkript des Hedy-Positionierungsworkshops ein. Die KI extrahiert daraus automatisch das Positionierungsdokument.
      </p>
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Transkript hier einfügen…"
        rows={10}
        className="w-full border border-stone rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-tiefblau"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={handleImport}
        disabled={loading || !transcript.trim()}
        className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau disabled:opacity-50"
      >
        {loading ? 'Generiere…' : 'Positionierung generieren'}
      </button>
    </div>
  )
}
