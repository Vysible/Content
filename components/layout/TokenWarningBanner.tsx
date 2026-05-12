'use client'

import { useEffect, useState } from 'react'

interface ExpiringKey {
  id: string
  name: string
  provider: string
  expiresAt: string
}

export function TokenWarningBanner() {
  const [keys, setKeys] = useState<ExpiringKey[]>([])

  useEffect(() => {
    fetch('/api/api-keys/expiring')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setKeys(data)
      })
      .catch(() => {})
  }, [])

  if (keys.length === 0) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <p className="text-xs text-amber-800 font-medium">
        ⚠ {keys.length === 1 ? 'Ein API-Key läuft' : `${keys.length} API-Keys laufen`} bald ab:{' '}
        {keys.map((k) => (
          <span key={k.id} className="mr-2">
            {k.name} ({new Date(k.expiresAt).toLocaleDateString('de-DE')})
          </span>
        ))}
        <a href="/settings/api-keys" className="ml-2 underline text-amber-700 hover:text-amber-900">
          Jetzt erneuern →
        </a>
      </p>
    </div>
  )
}
