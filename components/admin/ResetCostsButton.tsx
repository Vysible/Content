'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ResetCostsButton() {
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function handleReset() {
    if (!confirm('Alle Kosteneinträge löschen? Das kann nicht rückgängig gemacht werden.')) return
    setPending(true)
    try {
      const res = await fetch('/api/admin/costs', { method: 'DELETE' })
      const data = await res.json() as { deleted: number }
      alert(`${data.deleted} Einträge gelöscht.`)
      router.refresh()
    } catch {
      alert('Fehler beim Zurücksetzen.')
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={pending}
      className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? 'Wird gelöscht…' : 'Kosten zurücksetzen'}
    </button>
  )
}
