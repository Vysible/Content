'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CloneProjectButtonProps {
  projectId: string
  projectName: string
}

export function CloneProjectButton({ projectId, projectName }: CloneProjectButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClone(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Projekt „${projectName}" klonen?`)) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/projects/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceProjectId: projectId }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }
      const { newProjectId } = await res.json() as { newProjectId: string }
      router.push(`/projects/${newProjectId}`)
    } catch (err: unknown) {
      console.error('[Vysible] Projekt klonen fehlgeschlagen', err)
      setError(err instanceof Error ? err.message : '[FAIL] Klonen fehlgeschlagen')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleClone}
        disabled={loading}
        title="Ähnliches Projekt erstellen"
        className="px-2 py-1 text-xs text-stahlgrau hover:text-tiefblau hover:bg-tiefblau/5 rounded transition disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? '[INFO] Klonen…' : 'Klonen'}
      </button>
      {error && <p className="text-xs text-bordeaux mt-0.5">{error}</p>}
    </div>
  )
}
