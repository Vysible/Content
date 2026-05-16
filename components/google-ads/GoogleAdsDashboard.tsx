'use client'

import { useEffect, useState } from 'react'
import { GoogleAdsSetupGuide } from './GoogleAdsSetupGuide'

interface GoogleAdsMetrics {
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  totalConversions: number
  averageCpc: number
  campaigns: {
    name: string
    spend: number
    clicks: number
    impressions: number
    ctr: number
    conversions: number
    status: string
  }[]
  topKeywords: {
    keyword: string
    clicks: number
    impressions: number
    spend: number
  }[]
  dailySpend: { date: string; spend: number }[]
}

interface Props {
  projectId: string
}

function eur(value: number) {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-stone rounded-xl p-5">
      <p className="text-xs font-medium text-stahlgrau mb-1">{label}</p>
      <p className="text-2xl font-bold text-nachtblau">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isEnabled = status === 'ENABLED'
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        isEnabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {isEnabled ? 'Aktiv' : 'Pausiert'}
    </span>
  )
}

export function GoogleAdsDashboard({ projectId }: Props) {
  const [metrics, setMetrics] = useState<GoogleAdsMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/google-ads`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Unbekannter Fehler')
        } else {
          setMetrics(data as GoogleAdsMetrics)
        }
      } catch (err) {
        console.warn('[Vysible] GoogleAdsDashboard Ladefehler', err)
        setError('Verbindungsfehler beim Laden der Google Ads Daten')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-stone rounded-xl p-5 animate-pulse">
              <div className="h-3 bg-stone/40 rounded w-20 mb-2" />
              <div className="h-7 bg-stone/40 rounded w-24" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-stone rounded-xl p-5 animate-pulse h-40" />
      </div>
    )
  }

  if (error) {
    const isNotConfigured =
      error.includes('Customer-ID') || error.includes('nicht konfiguriert')
    return (
      <div>
        <div className="bg-white border border-stone rounded-xl p-6 space-y-2">
          <p className="text-sm font-semibold text-nachtblau">
            {isNotConfigured ? 'Google Ads nicht eingerichtet' : 'Google Ads nicht verfügbar'}
          </p>
          <p className="text-sm text-stahlgrau">{error}</p>
          {isNotConfigured && (
            <a
              href={`/projects/${projectId}/settings`}
              className="inline-block mt-2 px-4 py-2 text-sm bg-cognac text-black font-semibold rounded-lg hover:opacity-90 transition"
            >
              Zu den Einstellungen
            </a>
          )}
        </div>
        <GoogleAdsSetupGuide />
      </div>
    )
  }

  if (!metrics) return null

  const maxDailySpend = Math.max(...metrics.dailySpend.map((d) => d.spend), 0.01)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Ausgaben (30 Tage)" value={eur(metrics.totalSpend)} />
        <StatCard label="Klicks" value={metrics.totalClicks.toLocaleString('de-DE')} />
        <StatCard label="Impressionen" value={metrics.totalImpressions.toLocaleString('de-DE')} />
        <StatCard label="Conversions" value={metrics.totalConversions.toLocaleString('de-DE')} />
      </div>

      {metrics.campaigns.length > 0 && (
        <div className="bg-white border border-stone rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-stone">
            <h3 className="text-sm font-semibold text-nachtblau">Kampagnen</h3>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-stone/20">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-stahlgrau">Kampagne</th>
                <th className="text-left px-4 py-2 font-medium text-stahlgrau">Status</th>
                <th className="text-right px-4 py-2 font-medium text-stahlgrau">Ausgaben</th>
                <th className="text-right px-4 py-2 font-medium text-stahlgrau">Klicks</th>
                <th className="text-right px-4 py-2 font-medium text-stahlgrau">CTR</th>
                <th className="text-right px-4 py-2 font-medium text-stahlgrau">Conv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/40">
              {metrics.campaigns.map((c, i) => (
                <tr key={i} className="hover:bg-stone/10">
                  <td className="px-4 py-2 text-nachtblau font-medium truncate max-w-[200px]" title={c.name}>{c.name}</td>
                  <td className="px-4 py-2"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-2 text-right">{eur(c.spend)}</td>
                  <td className="px-4 py-2 text-right">{c.clicks.toLocaleString('de-DE')}</td>
                  <td className="px-4 py-2 text-right">{(c.ctr * 100).toFixed(2)} %</td>
                  <td className="px-4 py-2 text-right">{c.conversions.toLocaleString('de-DE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {metrics.topKeywords.length > 0 && (
        <div className="bg-white border border-stone rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-stone">
            <h3 className="text-sm font-semibold text-nachtblau">Top-Keywords</h3>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-stone/20">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-stahlgrau">Keyword</th>
                <th className="text-right px-4 py-2 font-medium text-stahlgrau">Klicks</th>
                <th className="text-right px-4 py-2 font-medium text-stahlgrau">Impressionen</th>
                <th className="text-right px-4 py-2 font-medium text-stahlgrau">Ausgaben</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/40">
              {metrics.topKeywords.map((kw, i) => (
                <tr key={i} className="hover:bg-stone/10">
                  <td className="px-4 py-2 text-nachtblau">{kw.keyword}</td>
                  <td className="px-4 py-2 text-right">{kw.clicks.toLocaleString('de-DE')}</td>
                  <td className="px-4 py-2 text-right">{kw.impressions.toLocaleString('de-DE')}</td>
                  <td className="px-4 py-2 text-right">{eur(kw.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {metrics.dailySpend.length > 0 && (
        <div className="bg-white border border-stone rounded-xl p-5">
          <h3 className="text-sm font-semibold text-nachtblau mb-4">Tagesausgaben — letzte 30 Tage</h3>
          <div className="flex items-end gap-1 h-24">
            {metrics.dailySpend.map((day) => {
              const heightPct = Math.max(4, Math.round((day.spend / maxDailySpend) * 100))
              return (
                <div
                  key={day.date}
                  className="flex-1 bg-cognac/70 hover:bg-cognac rounded-sm transition-all cursor-default"
                  style={{ height: `${heightPct}%` }}
                  title={`${day.date}: ${eur(day.spend)}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-stahlgrau">{metrics.dailySpend[0]?.date}</span>
            <span className="text-xs text-stahlgrau">{metrics.dailySpend[metrics.dailySpend.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  )
}
