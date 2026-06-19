'use client'

import { useState, useEffect } from 'react'

interface PortalLink {
  token: string
  expiresAt: string
  showAnalytics: boolean
}

interface Props {
  projectId: string
  portalCount: number  // how many items have portalVisible=true
}

export function PortalPanel({ projectId, portalCount }: Props) {
  const [show, setShow] = useState(false)
  const [link, setLink] = useState<PortalLink | null>(null)
  const [password, setPassword] = useState('')
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!show) return
    fetch(`/api/projects/${projectId}/portal`)
      .then((r) => r.json())
      .then((data) => setLink(data))
      .catch((err: unknown) => {
        console.warn('[Vysible] Portal-Link konnte nicht geladen werden:', err)
      })
  }, [show, projectId])

  const portalUrl = link ? `${window.location.origin}/portal/${link.token}` : ''

  async function createLink() {
    if (!password) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, showAnalytics }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Fehler beim Erstellen')
        return
      }
      const data = await res.json()
      setLink(data)
      setPassword('')
    } catch (err: unknown) {
      console.error('[Vysible] Portal-Link Erstellung fehlgeschlagen:', err)
      setError('Verbindungsfehler')
    } finally {
      setCreating(false)
    }
  }

  async function deleteLink() {
    setDeleting(true)
    try {
      await fetch(`/api/projects/${projectId}/portal`, { method: 'DELETE' })
      setLink(null)
    } catch (err: unknown) {
      console.error('[Vysible] Portal-Link Löschen fehlgeschlagen:', err)
    } finally {
      setDeleting(false)
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch((err: unknown) => {
      console.warn('[Vysible] Clipboard-Kopie fehlgeschlagen:', err)
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShow((v) => !v)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-stone bg-white hover:bg-stone/30 transition text-anthrazit"
      >
        <span className={`w-2 h-2 rounded-full ${portalCount > 0 ? 'bg-emerald-500' : 'bg-stone border border-stahlgrau/40'}`} />
        Kundenportal
        {portalCount > 0 && (
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
            {portalCount}
          </span>
        )}
      </button>

      {show && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-stone rounded-xl shadow-xl z-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-nachtblau">Kundenportal</p>
            <button onClick={() => setShow(false)} className="text-stahlgrau hover:text-anthrazit text-xs">✕</button>
          </div>

          {portalCount === 0 && (
            <div className="text-xs text-stahlgrau bg-stone/30 rounded-lg px-3 py-2">
              Noch keine Inhalte fürs Portal markiert. Aktiviere „Im Portal" bei den gewünschten Beiträgen.
            </div>
          )}

          {portalCount > 0 && (
            <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              {portalCount} {portalCount === 1 ? 'Inhalt' : 'Inhalte'} für den Kunden freigegeben
            </p>
          )}

          {link ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-stahlgrau mb-1">Portal-Link</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={portalUrl}
                    className="flex-1 text-xs border border-stone rounded-lg px-2 py-1.5 bg-stone/20 text-anthrazit truncate"
                  />
                  <button
                    onClick={copyUrl}
                    className="shrink-0 text-xs px-2 py-1.5 bg-tiefblau text-white rounded-lg hover:bg-nachtblau transition"
                  >
                    {copied ? '✓' : 'Kopieren'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-stahlgrau">
                Gültig bis {new Date(link.expiresAt).toLocaleDateString('de-DE')}
                {link.showAnalytics && ' · inkl. Analysen'}
              </p>
              <button
                onClick={deleteLink}
                disabled={deleting}
                className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-40"
              >
                {deleting ? 'Wird gelöscht…' : 'Link deaktivieren'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-stahlgrau block mb-1">Zugangspasswort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createLink()}
                  placeholder="Min. 4 Zeichen"
                  className="w-full text-sm border border-stone rounded-lg px-3 py-1.5 focus:outline-none focus:border-tiefblau"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-anthrazit cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAnalytics}
                  onChange={(e) => setShowAnalytics(e.target.checked)}
                  className="rounded"
                />
                GA4-Analysen im Portal anzeigen
              </label>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                onClick={createLink}
                disabled={creating || !password}
                className="w-full py-2 bg-tiefblau text-white text-sm font-medium rounded-lg hover:bg-nachtblau transition disabled:opacity-40"
              >
                {creating ? 'Erstelle Link…' : 'Portal-Link erstellen'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
