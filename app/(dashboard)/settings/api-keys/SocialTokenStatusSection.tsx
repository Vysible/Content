'use client'

import { useEffect, useState } from 'react'

interface SocialKeyStatus {
  id: string
  name: string
  provider: string
  expiresAt: string | null
  active: boolean
}

const SOCIAL_API_PROVIDERS = ['META', 'LINKEDIN'] as const

function getTokenStatus(key: SocialKeyStatus | undefined): 'ok' | 'expiring' | 'expired' | 'missing' {
  if (!key) return 'missing'
  if (!key.expiresAt) return 'ok'
  const now = Date.now()
  const expiry = new Date(key.expiresAt).getTime()
  if (expiry < now) return 'expired'
  if (expiry - now < 7 * 24 * 60 * 60 * 1000) return 'expiring'
  return 'ok'
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ok:       { label: 'Verbunden',      dot: 'bg-green-500',  badge: 'bg-green-100 text-green-800' },
  expiring: { label: 'Läuft bald ab',  dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-800' },
  expired:  { label: 'Abgelaufen',     dot: 'bg-red-500',    badge: 'bg-red-100 text-red-800' },
  missing:  { label: 'Nicht verbunden', dot: 'bg-gray-300',  badge: 'bg-gray-100 text-gray-500' },
}

interface PlatformDef {
  id: typeof SOCIAL_API_PROVIDERS[number]
  name: string
  sub: string
  channels: string[]
  logoChar: string
  logoBg: string
  logoText: string
  note?: string
}

const PLATFORMS: PlatformDef[] = [
  {
    id: 'META',
    name: 'Meta Business',
    sub: 'Facebook & Instagram',
    channels: ['Facebook', 'Instagram'],
    logoChar: 'f',
    logoBg: 'bg-[#1877F2]',
    logoText: 'text-white',
    note: 'Ein API-Key deckt Facebook + Instagram über die Meta Graph API ab.',
  },
  {
    id: 'LINKEDIN',
    name: 'LinkedIn',
    sub: 'Direktpublishing',
    channels: ['LinkedIn'],
    logoChar: 'in',
    logoBg: 'bg-[#0A66C2]',
    logoText: 'text-white',
    note: 'Erfordert LinkedIn Developer App mit w_member_social-Scope.',
  },
]

export function SocialTokenStatusSection() {
  const [tokens, setTokens] = useState<SocialKeyStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/api-keys')
      .then((r) => r.json())
      .then((data: SocialKeyStatus[]) => {
        setTokens(data.filter((k) =>
          SOCIAL_API_PROVIDERS.includes(k.provider as typeof SOCIAL_API_PROVIDERS[number])
        ))
      })
      .catch((err: unknown) => {
        console.warn('[Vysible] Social-Token-Status konnte nicht geladen werden', err)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-36 bg-stone/40 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Platform Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const key = tokens.find((t) => t.provider === platform.id)
          const status = getTokenStatus(key)
          const statusCfg = STATUS_CONFIG[status]
          const isConnected = status !== 'missing'
          const needsRenewal = status === 'expiring' || status === 'expired'

          return (
            <div
              key={platform.id}
              className={`bg-white rounded-xl border p-5 flex flex-col gap-4 transition ${
                isConnected ? 'border-stone' : 'border-dashed border-stone'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Logo */}
                  <div className={`w-9 h-9 rounded-lg ${platform.logoBg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-xs font-bold ${platform.logoText}`}>{platform.logoChar}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-nachtblau leading-tight">{platform.name}</p>
                    <p className="text-xs text-stahlgrau">{platform.sub}</p>
                  </div>
                </div>

                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusCfg.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>
              </div>

              {/* Token info */}
              {isConnected && key ? (
                <div className="bg-creme rounded-lg px-3 py-2 space-y-0.5">
                  <p className="text-xs font-medium text-anthrazit truncate">{key.name}</p>
                  {key.expiresAt ? (
                    <p className={`text-xs ${needsRenewal ? 'text-red-600 font-medium' : 'text-stahlgrau'}`}>
                      Läuft ab: {new Date(key.expiresAt).toLocaleDateString('de-DE')}
                      {needsRenewal && ' — bitte erneuern'}
                    </p>
                  ) : (
                    <p className="text-xs text-stahlgrau">Kein Ablaufdatum hinterlegt</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-stahlgrau">{platform.note}</p>
              )}

              {/* CTA */}
              <div className="mt-auto">
                {isConnected ? (
                  <a
                    href="/settings/api-keys"
                    className="inline-flex items-center gap-1 text-xs font-medium text-tiefblau hover:text-nachtblau transition"
                  >
                    {needsRenewal ? 'Key erneuern →' : 'Key verwalten →'}
                  </a>
                ) : (
                  <a
                    href="/settings/api-keys"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cognac hover:text-cognacDark transition"
                  >
                    + API-Key hinterlegen
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Kanäle Übersicht */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Facebook', color: 'bg-[#1877F2]/10 text-[#1877F2]', linked: tokens.some(t => t.provider === 'META') },
          { label: 'Instagram', color: 'bg-purple-100 text-purple-700', linked: tokens.some(t => t.provider === 'META') },
          { label: 'LinkedIn', color: 'bg-[#0A66C2]/10 text-[#0A66C2]', linked: tokens.some(t => t.provider === 'LINKEDIN') },
        ].map(({ label, color, linked }) => (
          <span
            key={label}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${color} ${!linked ? 'opacity-40' : ''}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${linked ? 'bg-current' : 'bg-gray-400'}`} />
            {label}
          </span>
        ))}
        <span className="text-xs text-stahlgrau self-center pl-1">
          {tokens.length === 0 ? 'Keine Plattform verbunden' : `${tokens.length} von 2 API-Keys konfiguriert`}
        </span>
      </div>

      {/* Canva-Hinweis */}
      <div className="px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        Canva-OAuth-Token: Verbindungsstatus unter{' '}
        <a href="/settings/canva" className="font-medium underline">Einstellungen → Canva</a> verwalten.
      </div>

    </div>
  )
}
