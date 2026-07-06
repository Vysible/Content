'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  showAnalytics: boolean
}

export function AnalyticsToggle({ projectId, showAnalytics: initial }: Props) {
  const [active, setActive] = useState(initial)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  async function toggle() {
    const next = !active
    setActive(next)
    try {
      const res = await fetch(`/api/projects/${projectId}/portal`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showAnalytics: next }),
      })
      if (!res.ok) {
        setActive(!next)
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setActive(!next)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={active ? 'Analysen deaktivieren' : 'Analysen aktivieren'}
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full transition cursor-pointer select-none disabled:opacity-50 ${
        active
          ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
          : 'bg-stone/30 text-stahlgrau hover:bg-stone'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-violet-500' : 'bg-stahlgrau/50'}`}
      />
      {active ? 'Analysen an' : 'Analysen aus'}
    </button>
  )
}
