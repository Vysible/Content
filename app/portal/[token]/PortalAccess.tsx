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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-nachtblau to-tiefblau p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full">
          <div className="mb-6 text-center">
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-tiefblau/10 text-tiefblau mb-4">
              Kundenportal
            </span>
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
              className="w-full border border-stone rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-tiefblau"
              placeholder="Passwort eingeben…"
              autoFocus
            />
            {authError && (
              <p className="text-xs text-red-600">{authError}</p>
            )}
            <button
              onClick={verify}
              disabled={authLoading || !password}
              className="w-full py-3 bg-tiefblau text-white text-sm font-semibold rounded-lg hover:bg-nachtblau transition disabled:opacity-40"
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
    <div className="min-h-screen bg-stone/20">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-stone shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-tiefblau/10 text-tiefblau">
              Kundenportal
            </span>
            <span className="font-semibold text-nachtblau text-sm">{praxisName}</span>
          </div>
          <p className="text-xs text-stahlgrau hidden sm:block">
            Freigabeportal für {projectName}
          </p>
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
                <div className="bg-white rounded-xl border border-stone border-l-4 border-l-stone/60 overflow-hidden">
                  <div className="px-6 pt-5 pb-1">
                    <p className="text-xs text-stahlgrau mb-1">{r.monat} · Blog-Beitrag</p>
                    <h2 className="text-xl font-bold text-nachtblau mb-4">{r.titel}</h2>
                  </div>
                  <div
                    className="px-6 pb-6 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: r.blog.html }}
                  />
                </div>
              )}

              {/* Newsletter card */}
              {r.newsletter && (
                <div className="bg-white rounded-xl border border-stone border-l-4 border-l-emerald-400 overflow-hidden">
                  <div className="px-6 pt-5 pb-3">
                    <p className="text-xs text-stahlgrau mb-1">{r.monat} · Newsletter</p>
                    <h2 className="text-xl font-bold text-nachtblau mb-4">{r.titel}</h2>
                  </div>
                  <div className="max-w-lg mx-auto mb-6 bg-white border border-stone rounded-xl overflow-hidden mx-6">
                    <div className="px-5 py-4 bg-stone/20 space-y-1 border-b border-stone">
                      <p className="text-xs text-stahlgrau">
                        <span className="font-medium">Betreff A:</span> {r.newsletter.betreffA}
                      </p>
                      <p className="text-xs text-stahlgrau">
                        <span className="font-medium">Betreff B:</span> {r.newsletter.betreffB}
                      </p>
                      <p className="text-xs text-stahlgrau italic">{r.newsletter.preheader}</p>
                    </div>
                    <div
                      className="px-5 py-4 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: r.newsletter.body }}
                    />
                  </div>
                </div>
              )}

              {/* Social card */}
              {r.socialPosts && r.socialPosts.length > 0 && (
                <div className="bg-white rounded-xl border border-stone border-l-4 border-l-purple-400 overflow-hidden">
                  <div className="px-6 pt-5 pb-3">
                    <p className="text-xs text-stahlgrau mb-1">{r.monat} · Social Media</p>
                    <h2 className="text-xl font-bold text-nachtblau mb-4">{r.titel}</h2>
                  </div>
                  <div className="px-6 pb-6 space-y-3">
                    {(() => {
                      const metaPost = r.socialPosts!.find(
                        (p) => p.kanal === 'SOCIAL_INSTAGRAM' || p.kanal === 'SOCIAL_FACEBOOK'
                      )
                      const liPost = r.socialPosts!.find((p) => p.kanal === 'SOCIAL_LINKEDIN')
                      return (
                        <>
                          {metaPost && (
                            <div className="border border-stone rounded-lg p-4">
                              <div className="flex gap-2 mb-2">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                  Instagram & Facebook
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{metaPost.text}</p>
                            </div>
                          )}
                          {liPost && (
                            <div className="border border-stone rounded-lg p-4">
                              <div className="flex gap-2 mb-2">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                  LinkedIn
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{liPost.text}</p>
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
                    <p className="text-sm font-medium text-nachtblau mb-3">
                      Wie gefällt Ihnen dieser Inhalt?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => submitApproval(globalIndex, 'approved', '')}
                        disabled={state.loading}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition disabled:opacity-40"
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
                        className="px-4 py-2 bg-amber-50 border border-amber-300 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 transition disabled:opacity-40"
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
                          className="w-full border border-stone rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tiefblau min-h-[80px]"
                          placeholder="Bitte beschreiben Sie, was geändert werden soll…"
                        />
                        <button
                          onClick={() =>
                            submitApproval(globalIndex, 'changes_requested', state.comment)
                          }
                          disabled={state.loading || !state.comment.trim()}
                          className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition disabled:opacity-40"
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                      ✓ Freigegeben — vielen Dank!
                    </span>
                  </div>
                )}

                {state.status === 'changes_requested' && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
                      ⚠ Änderung gewünscht
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
