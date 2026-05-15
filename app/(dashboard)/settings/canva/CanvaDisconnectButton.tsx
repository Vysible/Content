'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CanvaDisconnectButton() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleDisconnect() {
    if (!confirm('Canva-Verbindung wirklich entfernen? Du musst dich danach neu verbinden, um Asset-Namen wieder im Wizard zu sehen.')) {
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/canva/disconnect', { method: 'POST' })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn('[Vysible] Canva-Disconnect fehlgeschlagen', err)
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDisconnect}
        disabled={submitting}
        className="text-sm text-bordeaux hover:underline disabled:opacity-50"
      >
        {submitting ? 'Wird entfernt …' : 'Canva-Verbindung entfernen'}
      </button>
      {error && (
        <p className="mt-2 text-xs text-bordeaux">[FAIL] {error}</p>
      )}
    </div>
  )
}
