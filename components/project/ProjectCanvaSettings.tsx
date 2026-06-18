'use client'

import { useState } from 'react'
import { CanvaFolderSelector } from '@/components/wizard/CanvaFolderSelector'

interface Props {
  projectId: string
  initialCanvaFolderId: string | null
}

export function ProjectCanvaSettings({ projectId, initialCanvaFolderId }: Props) {
  const [folderId, setFolderId] = useState<string | null>(initialCanvaFolderId)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(id: string | null) {
    setFolderId(id)
    setSaved(false)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvaFolderId: folderId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3_000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-nachtblau">Canva-Ordner</h2>
        <p className="text-sm text-stahlgrau mt-0.5">
          Verknüpfe einen Canva-Ordner, damit KI-Bildbriefings passende Asset-Namen enthalten.
        </p>
      </div>

      <CanvaFolderSelector value={folderId} onChange={handleChange} />

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau disabled:opacity-50 transition"
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
        {saved && <p className="text-sm text-green-600">Gespeichert ✓</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
