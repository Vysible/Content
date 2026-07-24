'use client'

import { useEffect, useState, useCallback } from 'react'
import { GoogleAdsSetupGuide } from './GoogleAdsSetupGuide'
import { DateRangePicker, type DateRange } from '@/components/analytics/DateRangePicker'
import { AnalyticStat, calcTrend } from '@/components/analytics/AnalyticStat'

interface ConversionBreakdown {
  anrufe: number
  mails: number
  buchungen: number
}

interface PrevSnapshot {
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  totalConversions: number
  averageCpc: number
}

interface GoogleAdsMetrics {
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  totalConversions: number
  averageCpc: number
  conversionBreakdown: ConversionBreakdown
  prev: PrevSnapshot | null
  campaigns: {
    name: string
    spend: number
    clicks: number
    impressions: number
    ctr: number
    conversions: number
    status: string
    conversionBreakdown: ConversionBreakdown
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

function today(): string { return new Date().toISOString().slice(0, 10) }
function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10)
}

function eur(value: number) {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
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
  const [range, setRange] = useState<DateRange>({ startDate: daysAgo(28), endDate: today() })

  const load = useCallback(async (r: DateRange) => {
    setLoading(true)
    setError(null)
    setMetrics(null)
    try {
      const params = new URLSearchParams({ startDate: r.startDate, endDate: r.endDate })
      const res = await fetch(`/api/projects/${projectId}/google-ads?${params}`)
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
  }, [projectId])

  useEffect(() => { load(range) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRangeChange(r: DateRange) {
    setRange(r)
    load(r)
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
              className="inline-block mt-2 px-4 py-2 text-sm bg-brombeer text-anthrazit font-semibold rounded-lg hover:opacity-90 transition"
            >
              Zu den Einstellungen
            </a>
          )}
        </div>
        <GoogleAdsSetupGuide />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <DateRangePicker value={range} onChange={handleRangeChange} />
      </div>

      {loading ? (
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
      ) : metrics ? (() => {
          const p = metrics.prev
          const ctr = metrics.totalImpressions > 0
            ? (metrics.totalClicks / metrics.totalImpressions * 100).toFixed(2) + ' %'
            : '—'
          const ctc = metrics.totalConversions > 0
            ? eur(metrics.totalSpend / metrics.totalConversions)
            : '—'
          const prevCtr = p && p.totalImpressions > 0 ? p.totalClicks / p.totalImpressions * 100 : undefined
          const currCtr = metrics.totalImpressions > 0 ? metrics.totalClicks / metrics.totalImpressions * 100 : 0
          const prevCtc = p && p.totalConversions > 0 ? p.totalSpend / p.totalConversions : undefined
          const currCtc = metrics.totalConversions > 0 ? metrics.totalSpend / metrics.totalConversions : 0
          return (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <AnalyticStat label="Impressionen" value={metrics.totalImpressions.toLocaleString('de-DE')} trendData={calcTrend(metrics.totalImpressions, p?.totalImpressions)} />
            <AnalyticStat label="Klicks" value={metrics.totalClicks.toLocaleString('de-DE')} trendData={calcTrend(metrics.totalClicks, p?.totalClicks)} />
            <AnalyticStat label="CTR" value={ctr} trendData={prevCtr !== undefined ? calcTrend(currCtr, prevCtr) : null} />
            <AnalyticStat label="Conversions" value={metrics.totalConversions.toLocaleString('de-DE')} trendData={calcTrend(metrics.totalConversions, p?.totalConversions)} />
            <AnalyticStat label="Kosten / Conv." value={ctc} trendData={prevCtc !== undefined ? calcTrend(currCtc, prevCtc) : null} invertTrend />
          </div>

          {metrics.campaigns.length > 0 && (
            <div className="bg-white border border-stone rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-stone">
                <h3 className="text-sm font-semibold text-nachtblau">Kampagnen — Conversions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-stone/20">
                    <tr>
                      <th className="text-left px-5 py-2.5 font-semibold tracking-wide uppercase text-stahlgrau text-[10px]">Kampagne</th>
                      <th className="text-right px-4 py-2.5 font-semibold tracking-wide uppercase text-stahlgrau text-[10px]">Anrufe</th>
                      <th className="text-right px-4 py-2.5 font-semibold tracking-wide uppercase text-stahlgrau text-[10px]">Mails</th>
                      <th className="text-right px-4 py-2.5 font-semibold tracking-wide uppercase text-stahlgrau text-[10px]">Buchungen</th>
                      <th className="text-right px-5 py-2.5 font-semibold tracking-wide uppercase text-stahlgrau text-[10px]">Gesamt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone/40">
                    {metrics.campaigns.slice(0, 8).map((c, i) => (
                      <tr key={i} className="hover:bg-stone/10 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={c.status} />
                            <span className="font-medium text-nachtblau truncate max-w-[200px]">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-anthrazit">{c.conversionBreakdown.anrufe > 0 ? c.conversionBreakdown.anrufe : '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-anthrazit">{c.conversionBreakdown.mails > 0 ? c.conversionBreakdown.mails : '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-anthrazit">{c.conversionBreakdown.buchungen > 0 ? c.conversionBreakdown.buchungen : '—'}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-nachtblau">{c.conversions > 0 ? Math.round(c.conversions) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-stone/10 border-t border-stone/60">
                      <td className="px-5 py-3 text-xs font-semibold text-nachtblau">Gesamt</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-nachtblau">{metrics.conversionBreakdown.anrufe > 0 ? metrics.conversionBreakdown.anrufe : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-nachtblau">{metrics.conversionBreakdown.mails > 0 ? metrics.conversionBreakdown.mails : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-nachtblau">{metrics.conversionBreakdown.buchungen > 0 ? metrics.conversionBreakdown.buchungen : '—'}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-nachtblau">{Math.round(metrics.totalConversions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
              <h3 className="text-sm font-semibold text-nachtblau mb-4">
                Tagesausgaben — {range.startDate} bis {range.endDate}
              </h3>
              <div className="flex items-end gap-1 h-24">
                {metrics.dailySpend.map((day) => {
                  const maxSpend = Math.max(...metrics.dailySpend.map((d) => d.spend), 0.01)
                  const heightPct = Math.max(4, Math.round((day.spend / maxSpend) * 100))
                  return (
                    <div
                      key={day.date}
                      className="flex-1 bg-bordeaux/70 hover:bg-bordeaux rounded-sm transition-all cursor-default"
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
        </>
          )
        })() : null}
    </div>
  )
}
