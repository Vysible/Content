'use client'

import { useState } from 'react'

interface WordPressDraftButtonProps {
  projectId: string
  title: string
  html: string
}

export function WordPressDraftButton({ projectId, title, html }: WordPressDraftButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [link, setLink] = useState('')

  async function handleDraft() {
    setStatus('loading')
    try {
      const res = await fetch('/api/wordpress/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title, html }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLink(data.link)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-tiefblau hover:underline">
        WP Draft öffnen →
      </a>
    )
  }

  return (
    <button
      onClick={handleDraft}
      disabled={status === 'loading'}
      className="px-3 py-1.5 text-xs bg-[#21759b] text-white rounded-lg hover:bg-[#1a5e7a] disabled:opacity-50"
    >
      {status === 'error' ? 'Fehler — nochmal' : status === 'loading' ? 'Wird erstellt…' : 'WP Draft erstellen'}
    </button>
  )
}
