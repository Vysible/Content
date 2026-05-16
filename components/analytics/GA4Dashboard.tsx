'use client'

import { useEffect, useState } from 'react'

interface GA4Metrics {
  sessions: number
  users: number
  pageviews: number
  topPages: { page: string; views: number }[]
  trafficSources: { source: string; sessions: number }[]
  dailySessions: { date: string; sessions: number }[]
}

interface Props {
  projectId: string
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-stone rounded-xl p-5">
      <p className="text-xs font-medium text-stahlgrau mb-1">{label}</p>
      <p className="text-2xl font-bold text-nachtblau">{value.toLocaleString('de-DE')}</p>
    </div>
  )
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full bg-stone/40 rounded-full h-2 mt-1">
      <div className="bg-cognac h-2 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function GA4Dashboard({ projectId }: Props) {
  const [metrics, setMetrics] = useState<GA4Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/analytics`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Unbekannter Fehler')
        } else {
          setMetrics(data as GA4Metrics)
        }
      } catch (err) {
        console.warn('[Vysible] GA4Dashboard Ladefehler', err)
        setError('Verbindungsfehler beim Laden der Analytics-Daten')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
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
    const isNotConfigured = error.includes('Keine GA4-Property-ID')
    return (
      <div className="bg-white border border-stone rounded-xl p-8 text-center space-y-2">
        <p className="text-nachtblau font-semibold">
          {isNotConfigured ? 'GA4-Property-ID fehlt' : 'Analytics nicht verfügbar'}
        </p>
        <p className="text-sm text-stahlgrau">
          {isNotConfigured
            ? 'Keine GA4-Property-ID hinterlegt — bitte in den Projekteinstellungen eintragen.'
            : error}
        </p>
        {isNotConfigured && (
          <a
            href={`/projects/${projectId}/settings`}
            className="inline-block mt-3 px-4 py-2 text-sm bg-cognac hover:bg-cognacDark text-black font-semibold rounded-lg transition"
          >
            Zu den Einstellungen
          </a>
        )}
      </div>
    )
  }

  if (!metrics) return null

  const maxDailySessions = Math.max(...metrics.dailySessions.map((d) => d.sessions), 1)
  const maxPageViews = Math.max(...metrics.topPages.map((p) => p.views), 1)
  const maxTrafficSessions = Math.max(...metrics.trafficSources.map((t) => t.sessions), 1)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Sessions" value={metrics.sessions} />
        <StatCard label="Nutzer" value={metrics.users} />
        <StatCard label="Seitenaufrufe" value={metrics.pageviews} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-stone rounded-xl p-5">
          <h3 className="text-sm font-semibold text-nachtblau mb-4">Top-Seiten</h3>
          {metrics.topPages.length === 0 ? (
            <p className="text-sm text-stahlgrau">Keine Daten verfügbar</p>
          ) : (
            <div className="space-y-3">
              {metrics.topPages.map((page) => (
                <div key={page.page}>
                  <div className="flex justify-between items-baseline">
                    <span
                      className="text-xs text-tiefblau truncate max-w-[70%]"
                      title={page.page}
                    >
                      {page.page}
                    </span>
                    <span className="text-xs font-medium text-nachtblau ml-2">
                      {page.views.toLocaleString('de-DE')}
                    </span>
                  </div>
                  <MiniBar value={page.views} max={maxPageViews} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-stone rounded-xl p-5">
          <h3 className="text-sm font-semibold text-nachtblau mb-4">Traffic-Quellen</h3>
          {metrics.trafficSources.length === 0 ? (
            <p className="text-sm text-stahlgrau">Keine Daten verfügbar</p>
          ) : (
            <div className="space-y-3">
              {metrics.trafficSources.map((source) => (
                <div key={source.source}>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-tiefblau">{source.source}</span>
                    <span className="text-xs font-medium text-nachtblau ml-2">
                      {source.sessions.toLocaleString('de-DE')}
                    </span>
                  </div>
                  <MiniBar value={source.sessions} max={maxTrafficSessions} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-stone rounded-xl p-5">
        <h3 className="text-sm font-semibold text-nachtblau mb-4">Sessions — letzte 28 Tage</h3>
        {metrics.dailySessions.length === 0 ? (
          <p className="text-sm text-stahlgrau">Keine Daten verfügbar</p>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {metrics.dailySessions.map((day) => {
              const heightPct = maxDailySessions > 0
                ? Math.max(4, Math.round((day.sessions / maxDailySessions) * 100))
                : 4
              return (
                <div
                  key={day.date}
                  className="flex-1 bg-cognac/70 hover:bg-cognac rounded-sm transition-all cursor-default"
                  style={{ height: `${heightPct}%` }}
                  title={`${day.date}: ${day.sessions.toLocaleString('de-DE')} Sessions`}
                />
              )
            })}
          </div>
        )}
        {metrics.dailySessions.length > 0 && (
          <div className="flex justify-between mt-1">
            <span className="text-xs text-stahlgrau">{metrics.dailySessions[0]?.date}</span>
            <span className="text-xs text-stahlgrau">
              {metrics.dailySessions[metrics.dailySessions.length - 1]?.date}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
