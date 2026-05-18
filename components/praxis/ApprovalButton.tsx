'use client'

import { useState } from 'react'

interface ApprovalButtonProps {
  contentIndex: number
  initialStatus?: string
}

export function ApprovalButton({ contentIndex, initialStatus }: ApprovalButtonProps) {
  const [status, setStatus] = useState(initialStatus ?? 'ausstehend')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleApprove() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/praxis/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentIndex }),
      })
      if (res.ok) {
        setStatus('freigegeben')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Freigabe fehlgeschlagen — bitte erneut versuchen.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verbindungsfehler'
      setError(`Freigabe fehlgeschlagen: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'freigegeben') {
    return (
      <span className="inline-flex items-center gap-1 px-4 py-2.5 min-h-[44px] rounded-lg bg-green-100 text-green-700 text-sm font-medium">
        Freigegeben
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="px-4 py-2.5 min-h-[44px] bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Wird freigegeben...' : 'Inhalt freigeben'}
      </button>
      {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
    </div>
  )
}
