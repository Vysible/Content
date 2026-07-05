'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { StoredTextResult, CustomerApproval } from '@/lib/generation/results-store'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type { GA4Metrics } from '@/lib/ga4/client'
import type { GoogleAdsMetrics } from '@/lib/google-ads/client'
import type { CanvaAsset } from '@/lib/canva/client'

interface PortalItem {
  globalIndex: number
  result: StoredTextResult
}

interface Props {
  token: string
  projectName: string
  praxisName: string
  expiresAt: string
  portalItems: PortalItem[]
  themes: ThemenItem[]
  ga4: GA4Metrics | null
  googleAds: GoogleAdsMetrics | null
  showAnalytics?: boolean
  canvaAssets?: CanvaAsset[]
}

type PlanKanal = 'BLOG' | 'NEWSLETTER' | 'SOCIAL'

interface PlanItem {
  kanal: PlanKanal
  titel: string
  isReady: boolean
}

function formatMonatLang(monat: string): string {
  const [year, month] = monat.split('-')
  return new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function kanalLabel(kanal: PlanKanal): string {
  if (kanal === 'BLOG') return 'Blog'
  if (kanal === 'NEWSLETTER') return 'Newsletter'
  return 'Social Media'
}

function kanalStyle(kanal: PlanKanal): string {
  if (kanal === 'BLOG') return 'bg-stone/30 text-anthrazit'
  if (kanal === 'NEWSLETTER') return 'bg-emerald-100 text-emerald-700'
  return 'bg-purple-100 text-purple-700'
}

function buildPlanByMonth(themes: ThemenItem[], portalItems: PortalItem[]): Record<string, PlanItem[]> {
  const byMonth: Record<string, PlanItem[]> = {}

  for (const t of themes) {
    if (!byMonth[t.monat]) byMonth[t.monat] = []

    let kanal: PlanKanal
    if (t.kanal === 'BLOG') kanal = 'BLOG'
    else if (t.kanal === 'NEWSLETTER') kanal = 'NEWSLETTER'
    else kanal = 'SOCIAL'

    if (kanal === 'SOCIAL' && byMonth[t.monat].some((p) => p.kanal === 'SOCIAL')) continue

    const isReady = portalItems.some(({ result: r }) => {
      if (r.monat !== t.monat) return false
      if (kanal === 'BLOG') return !!r.blog
      if (kanal === 'NEWSLETTER') return !!r.newsletter
      return (r.socialPosts?.length ?? 0) > 0
    })

    byMonth[t.monat].push({ kanal, titel: t.seoTitel, isReady })
  }

  return byMonth
}

interface LocalState {
  status: CustomerApproval | null
  comment: string
  showInput: boolean
  loading: boolean
  error: string
}

function InstagramMockup({ text, praxisName, imageUrl }: { text: string; praxisName: string; imageUrl?: string }) {
  const initials = praxisName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="border border-stone rounded-xl overflow-hidden bg-white max-w-sm mx-auto">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone/50">
        <div className="w-7 h-7 rounded-full bg-nachtblau flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initials}</div>
        <span className="text-xs font-semibold text-nachtblau">{praxisName}</span>
      </div>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Canva-Vorschau" className="w-full aspect-square object-cover" />
      ) : (
        <div className="bg-stone/20 aspect-square flex items-center justify-center text-stahlgrau text-xs">Bild / Grafik</div>
      )}
      <div className="px-3 py-2.5">
        <p className="text-xs leading-relaxed text-nachtblau whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  )
}

function LinkedInMockup({ text, praxisName, imageUrl }: { text: string; praxisName: string; imageUrl?: string }) {
  const initials = praxisName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="border border-stone rounded-xl overflow-hidden bg-white max-w-sm mx-auto">
      <div className="flex items-start gap-2.5 px-3 py-3 border-b border-stone/50">
        <div className="w-9 h-9 rounded-md bg-nachtblau flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{initials}</div>
        <div>
          <p className="text-xs font-semibold text-nachtblau">{praxisName}</p>
          <p className="text-xs text-stahlgrau">Zahnarztpraxis</p>
        </div>
      </div>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Canva-Vorschau" className="w-full aspect-video object-cover" />
      )}
      <div className="px-3 py-3">
        <p className="text-xs leading-relaxed text-nachtblau whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  )
}

function AnalyticStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-stone rounded-xl p-4">
      <p className="text-[10px] font-semibold tracking-wide uppercase text-stahlgrau mb-1">{label}</p>
      <p className="text-2xl font-bold text-nachtblau tabular-nums leading-tight">
        {typeof value === 'number' ? value.toLocaleString('de-DE') : value}
      </p>
    </div>
  )
}

function HBar({ value, max, color }: { value: number; max: number; color: 'dark' | 'green' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="h-1.5 bg-stone/60 rounded-full overflow-hidden mt-1">
      <div
        className={`h-full rounded-full ${color === 'green' ? 'bg-emerald-600/50' : 'bg-nachtblau/40'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function PortalAccess({ token, projectName, praxisName, expiresAt, portalItems, themes, ga4, googleAds, showAnalytics, canvaAssets = [] }: Props) {
  const canvaThumb = canvaAssets.find(a => a.thumbnailUrl)?.thumbnailUrl
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [localStates, setLocalStates] = useState<Record<number, LocalState>>(() => {
    const map: Record<number, LocalState> = {}
    for (const { globalIndex, result } of portalItems) {
      map[globalIndex] = {
        status: result.customerApproval ?? null,
        comment: result.customerComment ?? '',
        showInput: false,
        loading: false,
        error: '',
      }
    }
    return map
  })

  async function verify() {
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await fetch(`/api/portal/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setAuthed(true)
      } else {
        setAuthError('Falsches Passwort')
      }
    } catch (err: unknown) {
      console.error('[Vysible] Portal-Verifizierung fehlgeschlagen:', err)
      setAuthError('Verbindungsfehler — bitte erneut versuchen')
    } finally {
      setAuthLoading(false)
    }
  }

  async function submitApproval(globalIndex: number, action: CustomerApproval, comment: string) {
    setLocalStates((prev) => ({
      ...prev,
      [globalIndex]: { ...prev[globalIndex], loading: true, error: '' },
    }))
    try {
      const res = await fetch(`/api/portal/${token}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: globalIndex, action, comment }),
      })
      if (res.ok) {
        setLocalStates((prev) => ({
          ...prev,
          [globalIndex]: { ...prev[globalIndex], status: action, comment, showInput: false, loading: false, error: '' },
        }))
      } else {
        const data = await res.json().catch(() => ({}))
        setLocalStates((prev) => ({
          ...prev,
          [globalIndex]: { ...prev[globalIndex], loading: false, error: (data as { error?: string }).error ?? 'Fehler beim Speichern' },
        }))
      }
    } catch (err: unknown) {
      console.error('[Vysible] Freigabe-Übermittlung fehlgeschlagen:', err)
      setLocalStates((prev) => ({
        ...prev,
        [globalIndex]: { ...prev[globalIndex], loading: false, error: 'Verbindungsfehler — bitte erneut versuchen' },
      }))
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nachtblau p-4">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-6">
              <Image src="/logo.png" alt="Vysible" width={40} height={40} className="object-contain" />
            </div>
            <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-4">Kundenportal</p>
            <h1 className="text-2xl font-bold text-nachtblau mb-2">{praxisName}</h1>
            <p className="text-sm text-stahlgrau">Bitte geben Sie Ihr persönliches Passwort ein</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !authLoading && password && verify()}
              className="w-full border border-stone rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nachtblau/20 focus:border-nachtblau transition"
              placeholder="Passwort eingeben…"
              autoFocus
            />
            {authError && <p className="text-xs text-red-600">{authError}</p>}
            <button
              onClick={verify}
              disabled={authLoading || !password}
              className="w-full py-3 bg-nachtblau text-white text-sm font-semibold rounded-lg hover:bg-black transition disabled:opacity-40"
            >
              {authLoading ? 'Prüft…' : 'Zugang öffnen'}
            </button>
          </div>
          <p className="text-center text-xs text-stahlgrau mt-6">
            Gültig bis {new Date(expiresAt).toLocaleDateString('de-DE')}
          </p>
        </div>
      </div>
    )
  }

  const approvedCount = Object.values(localStates).filter((s) => s.status === 'approved').length
  const totalCount = portalItems.length

  return (
    <div className="min-h-screen bg-creme">
      <header className="sticky top-0 z-10 bg-nachtblau text-creme">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/logo.png" alt="Vysible" width={28} height={28} className="object-contain opacity-90 flex-shrink-0" />
            <span className="text-xs font-semibold tracking-widest uppercase opacity-50 hidden sm:block">Kundenportal</span>
            <span className="text-sm font-bold truncate">{praxisName}</span>
          </div>
          <p className="text-xs opacity-60 truncate">{projectName}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Intro + progress */}
        {totalCount > 0 && (
          <div className="bg-white rounded-xl border border-stone p-5 space-y-3">
            <p className="text-sm text-anthrazit">
              Bitte prüfen Sie die folgenden Inhalte und geben Sie diese frei oder teilen Sie uns Ihre Änderungswünsche mit.
              Freigegebene Inhalte werden direkt veröffentlicht.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-stone/40 rounded-full h-2">
                <div
                  className="bg-nachtblau h-2 rounded-full transition-all"
                  style={{ width: totalCount > 0 ? `${Math.round((approvedCount / totalCount) * 100)}%` : '0%' }}
                />
              </div>
              <span className="text-xs font-semibold text-nachtblau whitespace-nowrap">
                {approvedCount} von {totalCount} freigegeben
              </span>
            </div>
          </div>
        )}

        {portalItems.length === 0 && (
          <div className="bg-white rounded-xl border border-stone p-8 text-center">
            <p className="text-sm text-stahlgrau">Keine Inhalte zur Freigabe vorhanden.</p>
          </div>
        )}

        {portalItems.map(({ globalIndex, result: r }) => {
          const state = localStates[globalIndex] ?? { status: null, comment: '', showInput: false, loading: false, error: '' }
          const metaPost = r.socialPosts?.find(p => p.kanal === 'SOCIAL_INSTAGRAM' || p.kanal === 'SOCIAL_FACEBOOK')
          const liPost = r.socialPosts?.find(p => p.kanal === 'SOCIAL_LINKEDIN')

          return (
            <div key={globalIndex} className="space-y-3">

              {/* Blog */}
              {r.blog && (
                <div className="bg-white rounded-xl border border-stone overflow-hidden">
                  <div className="px-6 pt-5 pb-4 border-b border-stone/50">
                    <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-1">{r.monat} · Blog-Beitrag</p>
                    <h2 className="text-xl font-bold text-nachtblau">{r.blog.titel ?? r.titel}</h2>
                  </div>
                  <div
                    className="px-6 py-6 prose prose-sm max-w-none prose-headings:text-nachtblau prose-headings:font-bold prose-p:text-anthrazit prose-li:text-anthrazit"
                    dangerouslySetInnerHTML={{ __html: r.blog.html }}
                  />
                </div>
              )}

              {/* Newsletter */}
              {r.newsletter && (
                <div className="bg-white rounded-xl border border-stone overflow-hidden">
                  <div className="px-6 pt-5 pb-4 border-b border-stone/50">
                    <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-1">{r.monat} · Newsletter</p>
                    <h2 className="text-xl font-bold text-nachtblau mb-4">{r.newsletter.titel ?? r.titel}</h2>
                    <div className="bg-stone/20 rounded-lg p-3 space-y-1">
                      <p className="text-xs text-stahlgrau"><span className="font-semibold">Betreff A:</span> {r.newsletter.betreffA}</p>
                      <p className="text-xs text-stahlgrau"><span className="font-semibold">Betreff B:</span> {r.newsletter.betreffB}</p>
                      <p className="text-xs text-stahlgrau italic">{r.newsletter.preheader}</p>
                    </div>
                  </div>
                  <div className="px-6 py-6 text-sm text-anthrazit leading-relaxed whitespace-pre-wrap">
                    {r.newsletter.body}
                  </div>
                </div>
              )}

              {/* Social */}
              {(metaPost || liPost) && (
                <div className="bg-white rounded-xl border border-stone overflow-hidden">
                  <div className="px-6 pt-5 pb-4 border-b border-stone/50">
                    <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-1">{r.monat} · Social Media</p>
                    <h2 className="text-xl font-bold text-nachtblau">{r.titel}</h2>
                  </div>
                  <div className="px-6 py-6 grid sm:grid-cols-2 gap-6">
                    {metaPost && (
                      <div>
                        <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-3">Instagram & Facebook</p>
                        <InstagramMockup text={metaPost.text} praxisName={praxisName} imageUrl={canvaThumb} />
                      </div>
                    )}
                    {liPost && (
                      <div>
                        <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-3">LinkedIn</p>
                        <LinkedInMockup text={liPost.text} praxisName={praxisName} imageUrl={canvaThumb} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Freigabe */}
              <div className="bg-white rounded-xl border border-stone p-5">
                {(state.status === null || state.status === 'pending') && (
                  <div>
                    <p className="text-sm font-semibold text-nachtblau mb-3">Wie gefällt Ihnen dieser Inhalt?</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => submitApproval(globalIndex, 'approved', '')}
                        disabled={state.loading}
                        className="px-4 py-2 bg-nachtblau text-white text-sm font-semibold rounded-lg hover:bg-black transition disabled:opacity-40"
                      >
                        ✓ Freigeben
                      </button>
                      <button
                        onClick={() => setLocalStates(prev => ({ ...prev, [globalIndex]: { ...prev[globalIndex], showInput: true } }))}
                        disabled={state.loading}
                        className="px-4 py-2 bg-white border border-stone text-nachtblau text-sm font-semibold rounded-lg hover:bg-stone/30 transition disabled:opacity-40"
                      >
                        ✎ Änderung wünschen
                      </button>
                    </div>
                    {state.showInput && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={state.comment}
                          onChange={(e) => setLocalStates(prev => ({ ...prev, [globalIndex]: { ...prev[globalIndex], comment: e.target.value } }))}
                          className="w-full border border-stone rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nachtblau/20 focus:border-nachtblau transition min-h-[80px]"
                          placeholder="Bitte beschreiben Sie, was geändert werden soll…"
                        />
                        <button
                          onClick={() => submitApproval(globalIndex, 'changes_requested', state.comment)}
                          disabled={state.loading || !state.comment.trim()}
                          className="px-4 py-2 bg-nachtblau text-white text-sm font-semibold rounded-lg hover:bg-black transition disabled:opacity-40"
                        >
                          {state.loading ? 'Sendet…' : 'Senden'}
                        </button>
                      </div>
                    )}
                    {state.error && <p className="text-xs text-red-600 mt-2">{state.error}</p>}
                  </div>
                )}
                {state.status === 'approved' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-nachtblau text-white text-sm font-semibold">
                    ✓ Freigegeben — vielen Dank!
                  </span>
                )}
                {state.status === 'changes_requested' && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone text-anthrazit text-sm font-semibold">
                      ✎ Änderung gewünscht
                    </span>
                    {state.comment && <p className="text-sm text-stahlgrau italic">{state.comment}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {/* Content-Planung */}
        {themes.length > 0 && (() => {
          const planByMonth = buildPlanByMonth(themes, portalItems)
          const months = Object.keys(planByMonth).sort()
          return (
            <section>
              <div className="border-t border-stone pt-6">
                <h2 className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-1">
                  Ihre Content-Planung
                </h2>
                <p className="text-sm text-stahlgrau mb-5">
                  Alle geplanten Inhalte für Ihre Praxis — nach Monat und Format sortiert.
                </p>
                <div className="space-y-4">
                  {months.map((monat) => (
                    <div key={monat} className="bg-white border border-stone rounded-xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-stone/40 bg-stone/10">
                        <p className="text-sm font-semibold text-nachtblau">{formatMonatLang(monat)}</p>
                      </div>
                      <div className="divide-y divide-stone/30">
                        {planByMonth[monat].map((item, i) => (
                          <div key={i} className="flex items-center gap-3 px-5 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${kanalStyle(item.kanal)}`}>
                              {kanalLabel(item.kanal)}
                            </span>
                            <p className="text-sm text-anthrazit flex-1 min-w-0">{item.titel}</p>
                            {item.isReady ? (
                              <span className="text-xs text-emerald-600 font-medium shrink-0">✓ Im Portal</span>
                            ) : (
                              <span className="text-xs text-stahlgrau shrink-0">In Vorbereitung</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        })()}

        {/* Analytics */}
        {showAnalytics && (ga4 || googleAds) && (
          <section>
            <div className="border-t border-stone pt-6 space-y-8">
              <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau">
                Analysen — letzte 28 Tage
              </p>

              {/* GA4 */}
              {ga4 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-nachtblau">Website-Analytics</p>

                  <div className="grid grid-cols-3 gap-3">
                    <AnalyticStat label="Sessions" value={ga4.sessions} />
                    <AnalyticStat label="Nutzer" value={ga4.users} />
                    <AnalyticStat label="Seitenaufrufe" value={ga4.pageviews} />
                  </div>

                  {ga4.dailySessions.length > 0 && (
                    <div className="bg-white border border-stone rounded-xl p-5">
                      <p className="text-xs font-semibold text-nachtblau mb-4">Sessions-Verlauf</p>
                      <div className="flex items-end gap-[3px] h-40">
                        {ga4.dailySessions.map((day) => {
                          const max = Math.max(...ga4.dailySessions.map((d) => d.sessions), 1)
                          const pct = Math.max(2, Math.round((day.sessions / max) * 100))
                          return (
                            <div
                              key={day.date}
                              className="flex-1 bg-nachtblau/30 hover:bg-nachtblau/70 rounded-sm transition-colors cursor-default"
                              style={{ height: `${pct}%` }}
                              title={`${day.date}: ${day.sessions.toLocaleString('de-DE')} Sessions`}
                            />
                          )
                        })}
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[10px] text-stahlgrau">{ga4.dailySessions[0]?.date}</span>
                        <span className="text-[10px] text-stahlgrau">{ga4.dailySessions[ga4.dailySessions.length - 1]?.date}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {ga4.topPages.length > 0 && (
                      <div className="bg-white border border-stone rounded-xl p-5">
                        <p className="text-xs font-semibold text-nachtblau mb-4">Top-Seiten</p>
                        <div className="space-y-3">
                          {ga4.topPages.map((page) => {
                            const max = Math.max(...ga4.topPages.map((p) => p.views), 1)
                            return (
                              <div key={page.page}>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-xs text-stahlgrau truncate max-w-[70%]" title={page.page}>{page.page}</span>
                                  <span className="text-xs font-semibold text-nachtblau tabular-nums ml-2">{page.views.toLocaleString('de-DE')}</span>
                                </div>
                                <HBar value={page.views} max={max} color="dark" />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {ga4.trafficSources.length > 0 && (
                      <div className="bg-white border border-stone rounded-xl p-5">
                        <p className="text-xs font-semibold text-nachtblau mb-4">Traffic-Quellen</p>
                        <div className="space-y-3">
                          {ga4.trafficSources.map((source) => {
                            const max = Math.max(...ga4.trafficSources.map((s) => s.sessions), 1)
                            return (
                              <div key={source.source}>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-xs text-stahlgrau truncate max-w-[70%]">{source.source}</span>
                                  <span className="text-xs font-semibold text-nachtblau tabular-nums ml-2">{source.sessions.toLocaleString('de-DE')}</span>
                                </div>
                                <HBar value={source.sessions} max={max} color="dark" />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Google Ads */}
              {googleAds && (() => {
                const ctr = googleAds.totalImpressions > 0
                  ? `${(googleAds.totalClicks / googleAds.totalImpressions * 100).toFixed(2)} %`
                  : '—'
                return (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-nachtblau">Google Ads</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <AnalyticStat label="Impressionen" value={googleAds.totalImpressions} />
                      <AnalyticStat label="Klicks" value={googleAds.totalClicks} />
                      <AnalyticStat label="CTR" value={ctr} />
                      <AnalyticStat label="Conversions" value={googleAds.totalConversions} />
                      <AnalyticStat label="Ø CPC" value={`€ ${googleAds.averageCpc.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                    </div>
                  </div>
                )
              })()}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
