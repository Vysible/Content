'use client'

import { useState } from 'react'

interface KlickTippButtonProps {
  projectId: string
  subject: string
  body: string
  senderName: string
  senderEmail: string
}

export function KlickTippButton({ projectId, subject, body, senderName, senderEmail }: KlickTippButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [campaignId, setCampaignId] = useState('')

  async function handleCreate() {
    setStatus('loading')
    try {
      const res = await fetch('/api/klicktipp/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, subject, body, senderName, senderEmail }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCampaignId(data.campaignId)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <span className="text-xs text-green-700 font-medium">
        ✓ KT Kampagne #{campaignId} erstellt
      </span>
    )
  }

  return (
    <button
      onClick={handleCreate}
      disabled={status === 'loading'}
      className="px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
    >
      {status === 'error' ? 'Fehler — nochmal' : status === 'loading' ? 'Wird erstellt…' : 'KT-Kampagne (Draft)'}
    </button>
  )
}
