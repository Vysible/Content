'use client'

import { useState } from 'react'

interface ApprovalButtonProps {
  token: string
  projectId: string
  contentIndex: number
  initialStatus?: string
}

export function ApprovalButton({ token, projectId, contentIndex, initialStatus }: ApprovalButtonProps) {
  const [status, setStatus] = useState(initialStatus ?? 'ausstehend')
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    setLoading(true)
    const res = await fetch('/api/praxis/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, projectId, contentIndex }),
    })
    if (res.ok) setStatus('freigegeben')
    setLoading(false)
  }

  if (status === 'freigegeben') {
    return (
      <span className="inline-flex items-center gap-1 px-4 py-2.5 min-h-[44px] rounded-lg bg-green-100 text-green-700 text-sm font-medium">
        ✓ Freigegeben
      </span>
    )
  }

  return (
    <button
      onClick={handleApprove}
      disabled={loading}
      className="px-4 py-2.5 min-h-[44px] bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
    >
      {loading ? 'Wird freigegeben…' : 'Inhalt freigeben'}
    </button>
  )
}
