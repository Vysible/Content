'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { StoredTextResult, CustomerApproval } from '@/lib/generation/results-store'
import type { GA4Metrics } from '@/lib/ga4/client'
import type { GoogleAdsMetrics } from '@/lib/google-ads/client'

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
  ga4: GA4Metrics | null
  googleAds: GoogleAdsMetrics | null
  showAnalytics?: boolean
}

interface LocalState {
  status: CustomerApproval | null
  comment: string
  showInput: boolean
  loading: boolean
  error: string
}

function InstagramMockup({ text, praxisName }: { text: string; praxisName: string }) {
  const initials = praxisName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="border border-stone rounded-xl overflow-hidden bg-white max-w-sm mx-auto">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone/50">
        <div className="w-7 h-7 rounded-full bg-nachtblau flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initials}</div>
        <span className="text-xs font-semibold text-nachtblau">{praxisName}</span>
      </div>
      <div className="bg-stone/20 aspect-square flex items-center justify-center text-stahlgrau text-xs">Bild</div>
      <div className="px-3 py-2.5">
        <p className="text-xs leading-relaxed text-nachtblau whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  )
}

function LinkedInMockup({ text, praxisName }: { text: string; praxisName: string }) {
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
      <div className="px-3 py-3">
        <p className="text-xs leading-relaxed text-nachtblau whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-stone rounded-xl p-5">
      <p className="text-xs font-medium text-stahlgrau mb-1">{label}</p>
      <p className="text-2xl font-bold text-nachtblau">
        {typeof value === 'number' ? value.toLocaleString('de-DE') : value}
      </p>
    </div>
  )
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full bg-stone/40 rounded-full h-2 mt-1">
      <div className="bg-nachtblau h-2 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function PortalAccess({ token, projectName, praxisName, expiresAt, portalItems, ga4, googleAds, showAnalytics }: Props) {
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
                        <InstagramMockup text={metaPost.text} praxisName={praxisName} />
                      </div>
                    )}
                    {liPost && (
                      <div>
                        <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-3">LinkedIn</p>
                        <LinkedInMockup text={liPost.text} praxisName={praxisName} />
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
        {/* Analytics */}
        {(showAnalytics || ga4 || googleAds) && (
          <section className="space-y-6">
            <div className="border-t border-stone pt-6">
              <h2 className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-6">
                Analysen — letzte 28 Tage
              </h2>
              {!ga4 && !googleAds && (
                <div className="bg-white rounded-xl border border-stone p-5 text-center">
                  <p className="text-sm text-stahlgrau">Noch keine Analysedaten verfügbar.</p>
                  <p className="text-xs text-stahlgrau mt-1 opacity-70">Die Daten erscheinen hier, sobald GA4 oder Google Ads verbunden sind.</p>
                </div>
              )}

              {ga4 && (
                <div className="space-y-4 mb-8">
                  <h3 className="text-sm font-semibold text-nachtblau">Website-Analytics (Google Analytics)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Sessions" value={ga4.sessions} />
                    <StatCard label="Nutzer" value={ga4.users} />
                    <StatCard label="Seitenaufrufe" value={ga4.pageviews} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {ga4.topPages.length > 0 && (
                      <div className="bg-white border border-stone rounded-xl p-5">
                        <h4 className="text-sm font-semibold text-nachtblau mb-4">Top-Seiten</h4>
                        <div className="space-y-3">
                          {ga4.topPages.map((page) => {
                            const max = Math.max(...ga4.topPages.map((p) => p.views), 1)
                            return (
                              <div key={page.page}>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-xs text-stahlgrau truncate max-w-[70%]" title={page.page}>{page.page}</span>
                                  <span className="text-xs font-medium text-nachtblau ml-2">{page.views.toLocaleString('de-DE')}</span>
                                </div>
                                <MiniBar value={page.views} max={max} />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {ga4.trafficSources.length > 0 && (
                      <div className="bg-white border border-stone rounded-xl p-5">
                        <h4 className="text-sm font-semibold text-nachtblau mb-4">Traffic-Quellen</h4>
                        <div className="space-y-3">
                          {ga4.trafficSources.map((source) => {
                            const max = Math.max(...ga4.trafficSources.map((s) => s.sessions), 1)
                            return (
                              <div key={source.source}>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-xs text-stahlgrau">{source.source}</span>
                                  <span className="text-xs font-medium text-nachtblau ml-2">{source.sessions.toLocaleString('de-DE')}</span>
                                </div>
                                <MiniBar value={source.sessions} max={max} />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {ga4.dailySessions.length > 0 && (
                    <div className="bg-white border border-stone rounded-xl p-5">
                      <h4 className="text-sm font-semibold text-nachtblau mb-4">Sessions-Verlauf</h4>
                      <div className="flex items-end gap-1 h-24">
                        {ga4.dailySessions.map((day) => {
                          const max = Math.max(...ga4.dailySessions.map((d) => d.sessions), 1)
                          const heightPct = Math.max(4, Math.round((day.sessions / max) * 100))
                          return (
                            <div
                              key={day.date}
                              className="flex-1 bg-nachtblau/60 hover:bg-nachtblau rounded-sm transition-all cursor-default"
                              style={{ height: `${heightPct}%` }}
                              title={`${day.date}: ${day.sessions.toLocaleString('de-DE')} Sessions`}
                            />
                          )
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-stahlgrau">{ga4.dailySessions[0]?.date}</span>
                        <span className="text-xs text-stahlgrau">{ga4.dailySessions[ga4.dailySessions.length - 1]?.date}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {googleAds && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-nachtblau">Google Ads</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Werbeausgaben" value={`€ ${googleAds.totalSpend.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                    <StatCard label="Klicks" value={googleAds.totalClicks} />
                    <StatCard label="Impressionen" value={googleAds.totalImpressions} />
                    <StatCard label="Conversions" value={googleAds.totalConversions} />
                  </div>

                  {googleAds.campaigns.length > 0 && (
                    <div className="bg-white border border-stone rounded-xl p-5">
                      <h4 className="text-sm font-semibold text-nachtblau mb-4">Kampagnen</h4>
                      <div className="space-y-3">
                        {googleAds.campaigns.map((c) => (
                          <div key={c.name} className="flex items-center justify-between gap-4 py-2 border-b border-stone/40 last:border-0">
                            <span className="text-sm text-nachtblau font-medium truncate">{c.name}</span>
                            <div className="flex gap-4 text-xs text-stahlgrau shrink-0">
                              <span>€ {c.spend.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <span>{c.clicks.toLocaleString('de-DE')} Klicks</span>
                              <span>{(c.ctr * 100).toFixed(2)} % CTR</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
