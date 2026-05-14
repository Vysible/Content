'use client'

import { useState } from 'react'
import type { StoredTextResult } from '@/lib/generation/results-store'
import type { ThemenItem } from '@/lib/generation/themes-schema'

interface Props {
  token: string
  projectName: string
  praxisName: string
  themes: ThemenItem[]
  textResults: StoredTextResult[]
  channels: string[]
  expiresAt: string
}

export function ShareAccess(props: Props) {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function verify() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/share/${props.token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setAuthed(true)
      } else {
        setError('Falsches Passwort')
      }
    } catch (err: unknown) {
      console.error('[Vysible] Passwort-Verifizierung fehlgeschlagen:', err)
      setError('Verbindungsfehler — bitte erneut versuchen')
    } finally {
      setLoading(false)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone/30 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
          <h1 className="font-bold text-nachtblau text-xl mb-1">{props.projectName}</h1>
          <p className="text-sm text-stahlgrau mb-6">
            Geschützter Freigabelink · Gültig bis {new Date(props.expiresAt).toLocaleDateString('de-DE')}
          </p>
          <label className="text-xs text-stahlgrau block mb-1">Passwort</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verify()}
            className="w-full border border-stone rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-tiefblau"
            placeholder="Zugangspasswort eingeben…"
          />
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <button
            onClick={verify}
            disabled={loading || !password}
            className="w-full py-2 bg-tiefblau text-white text-sm font-medium rounded-lg hover:bg-nachtblau transition disabled:opacity-40"
          >
            {loading ? 'Prüft…' : 'Zugang öffnen'}
          </button>
        </div>
      </div>
    )
  }

  const HWG_COLORS: Record<string, string> = {
    gruen: 'bg-green-100 text-green-700',
    gelb: 'bg-amber-100 text-amber-700',
    rot: 'bg-red-100 text-red-700',
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-nachtblau">{props.projectName}</h1>
        <p className="text-stahlgrau">{props.praxisName} · Read-only Freigabe</p>
      </div>

      {props.themes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Themenplan</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-white border border-stone rounded-xl overflow-hidden">
              <thead className="bg-stone/50">
                <tr>
                  <th className="text-left py-2 px-4 text-xs font-medium">Monat</th>
                  <th className="text-left py-2 px-4 text-xs font-medium">Titel</th>
                  <th className="text-left py-2 px-4 text-xs font-medium">Kanal</th>
                  <th className="text-left py-2 px-4 text-xs font-medium">HWG</th>
                </tr>
              </thead>
              <tbody>
                {props.themes.map((t: ThemenItem, i: number) => (
                  <tr key={i} className="border-t border-stone">
                    <td className="py-2 px-4 text-stahlgrau">{t.monat}</td>
                    <td className="py-2 px-4">{t.seoTitel}</td>
                    <td className="py-2 px-4 text-xs">{t.kanal}</td>
                    <td className="py-2 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${HWG_COLORS[t.hwgFlag] ?? ''}`}>
                        {t.hwgFlag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {props.textResults.filter((r: StoredTextResult) => r.blog).map((r: StoredTextResult, i: number) => (
        <section key={i} className="mb-6 bg-white border border-stone rounded-xl p-6">
          <p className="text-xs text-stahlgrau mb-1">{r.monat} · Blog</p>
          <h3 className="font-semibold text-lg mb-3">{r.titel}</h3>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: r.blog!.html }}
          />
        </section>
      ))}

      {props.textResults.some((r: StoredTextResult) => r.newsletter) && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Newsletter</h2>
          <p className="text-xs text-stahlgrau mb-4">Nur-Lesen — keine Bearbeitung möglich</p>
          {props.textResults.filter((r: StoredTextResult) => r.newsletter).map((r: StoredTextResult, i: number) => (
            <div key={i} className="mb-4 bg-white border border-stone rounded-xl p-6">
              <p className="text-xs text-stahlgrau mb-3">{r.monat} · Newsletter</p>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-stahlgrau uppercase tracking-wide">Betreff A</span>
                  <p className="text-sm mt-0.5">{r.newsletter!.betreffA}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-stahlgrau uppercase tracking-wide">Betreff B</span>
                  <p className="text-sm mt-0.5">{r.newsletter!.betreffB}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-stahlgrau uppercase tracking-wide">Preheader</span>
                  <p className="text-sm mt-0.5 text-stahlgrau">{r.newsletter!.preheader}</p>
                </div>
                <div className="pt-2 border-t border-stone">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: r.newsletter!.body }}
                  />
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {props.textResults.some((r: StoredTextResult) => r.socialPosts?.length) && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Social Media</h2>
          <p className="text-xs text-stahlgrau mb-4">Nur-Lesen — keine Bearbeitung möglich</p>
          {props.textResults.filter((r: StoredTextResult) => r.socialPosts?.length).map((r: StoredTextResult, i: number) => (
            <div key={i} className="mb-4 bg-white border border-stone rounded-xl p-6">
              <p className="text-xs text-stahlgrau mb-3">{r.monat} · Social Media</p>
              <div className="space-y-4">
                {r.socialPosts!.map((post, j) => {
                  const PLATFORM_LABELS: Record<string, string> = {
                    SOCIAL_INSTAGRAM: 'Instagram',
                    SOCIAL_FACEBOOK: 'Facebook',
                    SOCIAL_LINKEDIN: 'LinkedIn',
                  }
                  const CHAR_LIMITS: Record<string, number> = {
                    SOCIAL_INSTAGRAM: 200,
                    SOCIAL_FACEBOOK: 80,
                    SOCIAL_LINKEDIN: 700,
                  }
                  const limit = CHAR_LIMITS[post.kanal]
                  const count = post.text.length
                  return (
                    <div key={j} className="border border-stone rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-nachtblau">
                          {PLATFORM_LABELS[post.kanal] ?? post.kanal}
                        </span>
                        {limit && (
                          <span className={`text-xs ${count > limit ? 'text-red-500' : 'text-stahlgrau'}`}>
                            {count}/{limit}
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{post.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
