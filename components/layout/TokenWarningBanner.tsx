'use client'

import { useEffect, useState } from 'react'

type ExpiryLevel = 'warning' | 'urgent' | 'critical' | 'expired'

interface TokenStatus {
  id: string
  name: string
  provider: string
  expiresAt: string
  daysLeft: number
  level: ExpiryLevel
  source: 'apiKey' | 'canvaToken'
}

const LEVEL_ORDER: ExpiryLevel[] = ['warning', 'urgent', 'critical', 'expired']

const LEVEL_STYLES: Record<ExpiryLevel, string> = {
  warning:  'bg-amber-50 border-amber-200 text-amber-800',
  urgent:   'bg-orange-50 border-orange-200 text-orange-800',
  critical: 'bg-red-50 border-red-200 text-red-800',
  expired:  'bg-red-100 border-red-300 text-red-900 font-bold',
}

const LEVEL_LINK_STYLES: Record<ExpiryLevel, string> = {
  warning:  'underline text-amber-700 hover:text-amber-900',
  urgent:   'underline text-orange-700 hover:text-orange-900',
  critical: 'underline text-red-700 hover:text-red-900',
  expired:  'underline text-red-800 hover:text-red-950',
}

function reauthHref(status: TokenStatus): string {
  return status.source === 'canvaToken' ? '/settings/canva' : '/settings/api-keys'
}

function expiryLabel(status: TokenStatus): string {
  if (status.level === 'expired') return 'abgelaufen'
  if (status.level === 'critical') return 'läuft morgen ab'
  return `läuft in ${status.daysLeft} Tagen ab`
}

export function TokenWarningBanner() {
  const [statuses, setStatuses] = useState<TokenStatus[]>([])

  useEffect(() => {
    fetch('/api/tokens/status')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStatuses(data as TokenStatus[])
      })
      .catch((err: unknown) => {
        console.warn('[Vysible] Token-Status konnte nicht geladen werden', err)
      })
  }, [])

  if (statuses.length === 0) return null

  const worstLevel = statuses.reduce<ExpiryLevel>(
    (worst, s) =>
      LEVEL_ORDER.indexOf(s.level) > LEVEL_ORDER.indexOf(worst) ? s.level : worst,
    statuses[0].level,
  )

  return (
    <div className={`border-b px-4 py-2 ${LEVEL_STYLES[worstLevel]}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
        <span>[WARN] Token-Ablauf:</span>
        {statuses.map((s) => (
          <span key={s.id} className="flex items-center gap-1">
            <span>{s.name} ({s.provider}) — {expiryLabel(s)}</span>
            <a
              href={reauthHref(s)}
              className={`ml-1 ${LEVEL_LINK_STYLES[s.level]}`}
            >
              Token erneuern →
            </a>
          </span>
        ))}
      </div>
    </div>
  )
}
