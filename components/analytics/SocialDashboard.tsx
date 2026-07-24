'use client'

import { useEffect, useState, useCallback } from 'react'
import { DateRangePicker, type DateRange } from './DateRangePicker'
import { AnalyticStat, calcTrend } from './AnalyticStat'

interface PlatformDaily { date: string; impressions: number }

interface FacebookMetrics {
  impressions: number; reach: number; engagements: number
  daily: PlatformDaily[]
  prev: { impressions: number; reach: number; engagements: number } | null
}
interface InstagramMetrics {
  impressions: number; reach: number; interactions: number; profileViews: number
  daily: PlatformDaily[]
  prev: { impressions: number; reach: number; interactions: number } | null
}
interface LinkedInMetrics {
  impressions: number; clicks: number; reactions: number; comments: number; shares: number
  daily: PlatformDaily[]
  prev: { impressions: number; clicks: number; reactions: number } | null
}
interface SocialData {
  facebook: FacebookMetrics | null
  instagram: InstagramMetrics | null
  linkedin: LinkedInMetrics | null
  errors: { meta: string | null; linkedin: string | null }
}

interface Props { projectId: string }

function today() { return new Date().toISOString().slice(0, 10) }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10)
}

function PlatformIcon({ platform }: { platform: 'facebook' | 'instagram' | 'linkedin' }) {
  if (platform === 'facebook') return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
  if (platform === 'instagram') return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

function PlatformHeader({ platform, label }: { platform: 'facebook' | 'instagram' | 'linkedin'; label: string }) {
  const colors: Record<string, string> = {
    facebook: 'text-[#1877F2]',
    instagram: 'text-[#E1306C]',
    linkedin: 'text-[#0A66C2]',
  }
  return (
    <div className={`flex items-center gap-2 mb-4 ${colors[platform]}`}>
      <PlatformIcon platform={platform} />
      <h3 className="text-sm font-bold">{label}</h3>
    </div>
  )
}

function DailyBar({ data }: { data: PlatformDaily[] }) {
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.impressions), 1)
  return (
    <div className="mt-4">
      <div className="flex items-end gap-0.5 h-16">
        {data.map((day) => {
          const h = Math.max(4, Math.round((day.impressions / max) * 100))
          return (
            <div
              key={day.date}
              className="flex-1 bg-bordeaux/60 hover:bg-bordeaux rounded-sm transition-all cursor-default"
              style={{ height: `${h}%` }}
              title={`${day.date}: ${day.impressions.toLocaleString('de-DE')} Impressionen`}
            />
          )
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-stahlgrau">{data[0]?.date}</span>
        <span className="text-[10px] text-stahlgrau">{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}

function NotConfiguredCard({ platform, projectId }: { platform: string; projectId: string }) {
  return (
    <div className="bg-white border border-stone rounded-xl p-5">
      <p className="text-sm font-semibold text-nachtblau mb-1">{platform} nicht konfiguriert</p>
      <p className="text-xs text-stahlgrau mb-3">
        Für dieses Projekt wurde noch kein {platform}-Token hinterlegt.
      </p>
      <a
        href={`/projects/${projectId}/settings`}
        className="inline-block px-3 py-1.5 text-xs bg-brombeer text-anthrazit font-semibold rounded-lg hover:opacity-90 transition"
      >
        Jetzt einrichten →
      </a>
    </div>
  )
}

export function SocialDashboard({ projectId }: Props) {
  const [data, setData] = useState<SocialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [range, setRange] = useState<DateRange>({ startDate: daysAgo(28), endDate: today() })

  const load = useCallback(async (r: DateRange) => {
    setLoading(true)
    setFetchError(null)
    setData(null)
    try {
      const params = new URLSearchParams({ startDate: r.startDate, endDate: r.endDate })
      const res = await fetch(`/api/projects/${projectId}/social-analytics?${params}`)
      const json = await res.json()
      if (!res.ok) {
        setFetchError(json.error ?? 'Unbekannter Fehler')
      } else {
        setData(json as SocialData)
      }
    } catch (err) {
      console.warn('[Vysible] SocialDashboard Ladefehler', err)
      setFetchError('Verbindungsfehler beim Laden der Social-Daten')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load(range) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRangeChange(r: DateRange) {
    setRange(r)
    load(r)
  }

  const skeleton = (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white border border-stone rounded-xl p-5 animate-pulse h-40" />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <DateRangePicker value={range} onChange={handleRangeChange} />
      </div>

      {loading ? skeleton : fetchError ? (
        <div className="bg-white border border-stone rounded-xl p-6">
          <p className="text-sm font-semibold text-nachtblau">Social Analytics nicht verfügbar</p>
          <p className="text-sm text-stahlgrau mt-1">{fetchError}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">

          {/* Facebook */}
          {data.facebook ? (
            <div className="bg-white border border-stone rounded-xl p-5">
              <PlatformHeader platform="facebook" label="Facebook" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <AnalyticStat
                  label="Impressionen"
                  value={data.facebook.impressions.toLocaleString('de-DE')}
                  trendData={calcTrend(data.facebook.impressions, data.facebook.prev?.impressions)}
                />
                <AnalyticStat
                  label="Reichweite"
                  value={data.facebook.reach.toLocaleString('de-DE')}
                  trendData={calcTrend(data.facebook.reach, data.facebook.prev?.reach)}
                />
                <AnalyticStat
                  label="Interaktionen"
                  value={data.facebook.engagements.toLocaleString('de-DE')}
                  trendData={calcTrend(data.facebook.engagements, data.facebook.prev?.engagements)}
                />
              </div>
              <DailyBar data={data.facebook.daily} />
            </div>
          ) : (
            data.errors.meta
              ? <NotConfiguredCard platform="Facebook & Instagram" projectId={projectId} />
              : null
          )}

          {/* Instagram */}
          {data.instagram && (
            <div className="bg-white border border-stone rounded-xl p-5">
              <PlatformHeader platform="instagram" label="Instagram" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <AnalyticStat
                  label="Impressionen"
                  value={data.instagram.impressions.toLocaleString('de-DE')}
                  trendData={calcTrend(data.instagram.impressions, data.instagram.prev?.impressions)}
                />
                <AnalyticStat
                  label="Reichweite"
                  value={data.instagram.reach.toLocaleString('de-DE')}
                  trendData={calcTrend(data.instagram.reach, data.instagram.prev?.reach)}
                />
                <AnalyticStat
                  label="Interaktionen"
                  value={data.instagram.interactions.toLocaleString('de-DE')}
                  trendData={calcTrend(data.instagram.interactions, data.instagram.prev?.interactions)}
                />
                <AnalyticStat
                  label="Profilaufrufe"
                  value={data.instagram.profileViews.toLocaleString('de-DE')}
                />
              </div>
              <DailyBar data={data.instagram.daily} />
            </div>
          )}

          {/* LinkedIn */}
          {data.linkedin ? (
            <div className="bg-white border border-stone rounded-xl p-5">
              <PlatformHeader platform="linkedin" label="LinkedIn" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <AnalyticStat
                  label="Impressionen"
                  value={data.linkedin.impressions.toLocaleString('de-DE')}
                  trendData={calcTrend(data.linkedin.impressions, data.linkedin.prev?.impressions)}
                />
                <AnalyticStat
                  label="Klicks"
                  value={data.linkedin.clicks.toLocaleString('de-DE')}
                  trendData={calcTrend(data.linkedin.clicks, data.linkedin.prev?.clicks)}
                />
                <AnalyticStat
                  label="Reaktionen"
                  value={data.linkedin.reactions.toLocaleString('de-DE')}
                  trendData={calcTrend(data.linkedin.reactions, data.linkedin.prev?.reactions)}
                />
                <AnalyticStat
                  label="Kommentare"
                  value={data.linkedin.comments.toLocaleString('de-DE')}
                />
              </div>
              <DailyBar data={data.linkedin.daily} />
            </div>
          ) : (
            data.errors.linkedin
              ? <NotConfiguredCard platform="LinkedIn" projectId={projectId} />
              : null
          )}

        </div>
      ) : null}
    </div>
  )
}
