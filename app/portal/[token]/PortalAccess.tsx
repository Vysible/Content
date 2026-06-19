'use client'

import { useState } from 'react'
import type { StoredTextResult, CustomerApproval } from '@/lib/generation/results-store'

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
}

interface LocalState {
  status: CustomerApproval | null
  comment: string
  showInput: boolean
  loading: boolean
  error: string
}

export function PortalAccess({ token, projectName, praxisName, expiresAt, portalItems }: Props) {
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
          [globalIndex]: {
            ...prev[globalIndex],
            status: action,
            comment,
            showInput: false,
            loading: false,
            error: '',
          },
        }))
      } else {
        const data = await res.json().catch(() => ({}))
        setLocalStates((prev) => ({
          ...prev,
          [globalIndex]: {
            ...prev[globalIndex],
            loading: false,
            error: (data as { error?: string }).error ?? 'Fehler beim Speichern',
          },
        }))
      }
    } catch (err: unknown) {
      console.error('[Vysible] Freigabe-Übermittlung fehlgeschlagen:', err)
      setLocalStates((prev) => ({
        ...prev,
        [globalIndex]: {
          ...prev[globalIndex],
          loading: false,
          error: 'Verbindungsfehler — bitte erneut versuchen',
        },
      }))
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nachtblau p-4">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-6">Kundenportal</p>
            <h1 className="text-2xl font-bold text-nachtblau mb-2">{praxisName}</h1>
            <p className="text-sm text-stahlgrau">
              Bitte geben Sie Ihr persönliches Passwort ein
            </p>
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
            {authError && (
              <p className="text-xs text-red-600">{authError}</p>
            )}
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

  return (
    <div className="min-h-screen bg-creme">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-nachtblau text-creme">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-widest uppercase opacity-60">Kundenportal</span>
            <span className="text-sm font-bold">{praxisName}</span>
          </div>
          <p className="text-xs opacity-50 hidden sm:block">{projectName}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {portalItems.length === 0 && (
          <div className="bg-white rounded-xl border border-stone p-8 text-center">
            <p className="text-sm text-stahlgrau">Keine Inhalte zur Freigabe vorhanden.</p>
          </div>
        )}

        {portalItems.map(({ globalIndex, result: r }) => {
          const state = localStates[globalIndex] ?? {
            status: null,
            comment: '',
            showInput: false,
            loading: false,
            error: '',
          }

          return (
            <div key={globalIndex} className="space-y-3">
              {/* Blog card */}
              {r.blog && (
                <div className="bg-white rounded-xl border border-stone overflow-hidden">
                  <div className="px-6 pt-5 pb-1 border-b border-stone/50">
                    <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-1">{r.monat} · Blog</p>
                    <h2 className="text-xl font-bold text-nachtblau mb-4">{r.titel}</h2>
                  </div>
                  <div
                    className="px-6 py-6 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: r.blog.html }}
                  />
                </div>
              )}

              {/* Newsletter card */}
              {r.newsletter && (
                <div className="bg-white rounded-xl border border-stone overflow-hidden">
                  <div className="px-6 pt-5 pb-4 border-b border-stone/50">
                    <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-1">{r.monat} · Newsletter</p>
                    <h2 className="text-xl font-bold text-nachtblau mb-4">{r.titel}</h2>
                    <div className="space-y-1 bg-stone/20 rounded-lg p-3 text-sm">
                      <p className="text-xs text-stahlgrau"><span className="font-semibold">Betreff A:</span> {r.newsletter.betreffA}</p>
                      <p className="text-xs text-stahlgrau"><span className="font-semibold">Betreff B:</span> {r.newsletter.betreffB}</p>
                      <p className="text-xs text-stahlgrau italic">{r.newsletter.preheader}</p>
                    </div>
                  </div>
                  <div
                    className="px-6 py-6 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: r.newsletter.body }}
                  />
                </div>
              )}

              {/* Social card */}
              {r.socialPosts && r.socialPosts.length > 0 && (
                <div className="bg-white rounded-xl border border-stone overflow-hidden">
                  <div className="px-6 pt-5 pb-4 border-b border-stone/50">
                    <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-1">{r.monat} · Social Media</p>
                    <h2 className="text-xl font-bold text-nachtblau mb-4">{r.titel}</h2>
                  </div>
                  <div className="px-6 py-6 space-y-4">
                    {(() => {
                      const metaPost = r.socialPosts!.find(
                        (p) => p.kanal === 'SOCIAL_INSTAGRAM' || p.kanal === 'SOCIAL_FACEBOOK'
                      )
                      const liPost = r.socialPosts!.find((p) => p.kanal === 'SOCIAL_LINKEDIN')
                      return (
                        <>
                          {metaPost && (
                            <div className="border border-stone rounded-lg p-4">
                              <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-2">Instagram & Facebook</p>
                              <p className="text-sm whitespace-pre-wrap text-nachtblau">{metaPost.text}</p>
                            </div>
                          )}
                          {liPost && (
                            <div className="border border-stone rounded-lg p-4">
                              <p className="text-xs font-semibold tracking-widest uppercase text-stahlgrau mb-2">LinkedIn</p>
                              <p className="text-sm whitespace-pre-wrap text-nachtblau">{liPost.text}</p>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Approval UI */}
              <div className="bg-white rounded-xl border border-stone p-5">
                {(state.status === null || state.status === 'pending') && (
                  <div>
                    <p className="text-sm font-semibold text-nachtblau mb-3">
                      Wie gefällt Ihnen dieser Inhalt?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => submitApproval(globalIndex, 'approved', '')}
                        disabled={state.loading}
                        className="px-4 py-2 bg-nachtblau text-white text-sm font-semibold rounded-lg hover:bg-black transition disabled:opacity-40"
                      >
                        ✓ Freigeben
                      </button>
                      <button
                        onClick={() =>
                          setLocalStates((prev) => ({
                            ...prev,
                            [globalIndex]: { ...prev[globalIndex], showInput: true },
                          }))
                        }
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
                          onChange={(e) =>
                            setLocalStates((prev) => ({
                              ...prev,
                              [globalIndex]: { ...prev[globalIndex], comment: e.target.value },
                            }))
                          }
                          className="w-full border border-stone rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nachtblau/20 focus:border-nachtblau transition min-h-[80px]"
                          placeholder="Bitte beschreiben Sie, was geändert werden soll…"
                        />
                        <button
                          onClick={() =>
                            submitApproval(globalIndex, 'changes_requested', state.comment)
                          }
                          disabled={state.loading || !state.comment.trim()}
                          className="px-4 py-2 bg-nachtblau text-white text-sm font-semibold rounded-lg hover:bg-black transition disabled:opacity-40"
                        >
                          {state.loading ? 'Sendet…' : 'Senden'}
                        </button>
                      </div>
                    )}
                    {state.error && (
                      <p className="text-xs text-red-600 mt-2">{state.error}</p>
                    )}
                  </div>
                )}

                {state.status === 'approved' && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-nachtblau text-white text-sm font-semibold">
                      ✓ Freigegeben — vielen Dank!
                    </span>
                  </div>
                )}

                {state.status === 'changes_requested' && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone text-anthrazit text-sm font-semibold">
                      ✎ Änderung gewünscht
                    </span>
                    {state.comment && (
                      <p className="text-sm text-stahlgrau italic">{state.comment}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
