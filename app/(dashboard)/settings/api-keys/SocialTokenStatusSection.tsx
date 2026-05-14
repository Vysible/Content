'use client'

import { useEffect, useState } from 'react'

interface SocialKeyStatus {
  id: string
  name: string
  provider: string
  expiresAt: string | null
  active: boolean
}

const SOCIAL_PROVIDERS = ['CANVA'] as const

function getTokenStatus(expiresAt: string | null): 'ok' | 'expiring' | 'expired' | 'unknown' {
  if (!expiresAt) return 'unknown'
  const now = Date.now()
  const expiry = new Date(expiresAt).getTime()
  if (expiry < now) return 'expired'
  if (expiry - now < 7 * 24 * 60 * 60 * 1000) return 'expiring'
  return 'ok'
}

const STATUS_CONFIG = {
  ok:       { label: 'Gültig',          className: 'bg-green-100 text-green-800' },
  expiring: { label: 'Läuft bald ab',   className: 'bg-amber-100 text-amber-800' },
  expired:  { label: 'Abgelaufen',      className: 'bg-red-100 text-red-800' },
  unknown:  { label: 'Kein Ablaufdatum', className: 'bg-stone text-stahlgrau' },
}

export function SocialTokenStatusSection() {
  const [tokens, setTokens] = useState<SocialKeyStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/api-keys')
      .then((r) => r.json())
      .then((data: { provider: string; id: string; name: string; expiresAt: string | null; active: boolean }[]) => {
        const social = data.filter((k) => SOCIAL_PROVIDERS.includes(k.provider as typeof SOCIAL_PROVIDERS[number]))
        setTokens(social)
      })
      .catch(() => {/* ignoriert — optionale Sektion */})
      .finally(() => setLoading(false))
  }, [])

  if (loading || tokens.length === 0) return null

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-nachtblau mb-3">OAuth-Token-Status</h3>
      <div className="bg-white rounded-xl border border-stone overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-creme border-b border-stone">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Provider</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Ablaufdatum</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone">
            {tokens.map((token) => {
              const status = getTokenStatus(token.expiresAt)
              const cfg = STATUS_CONFIG[status]
              return (
                <tr key={token.id} className="hover:bg-creme/40 transition">
                  <td className="px-4 py-3 font-medium text-anthrazit">{token.name}</td>
                  <td className="px-4 py-3 text-xs text-stahlgrau">{token.provider}</td>
                  <td className="px-4 py-3 text-xs text-stahlgrau">
                    {token.expiresAt
                      ? new Date(token.expiresAt).toLocaleDateString('de-DE')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
                        {cfg.label}
                      </span>
                      {(status === 'expiring' || status === 'expired') && (
                        <span className="text-xs text-amber-700">Bitte Token erneuern</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
