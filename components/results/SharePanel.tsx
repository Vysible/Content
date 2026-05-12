'use client'

import { useState, useEffect } from 'react'

interface ShareLink {
  token: string
  expiresAt: string
  createdAt: string
}

interface Props {
  projectId: string
}

export function SharePanel({ projectId }: Props) {
  const [links, setLinks] = useState<ShareLink[]>([])
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!show) return
    fetch(`/api/projects/${projectId}/share`)
      .then((r) => r.json())
      .then(setLinks)
      .catch(() => {})
  }, [show, projectId])

  async function create() {
    if (!password) return
    setCreating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const link: ShareLink = await res.json()
        setLinks((prev) => [link, ...prev])
        setPassword('')
      }
    } finally {
      setCreating(false)
    }
  }

  async function revoke(token: string) {
    await fetch(`/api/projects/${projectId}/share`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    setLinks((prev) => prev.filter((l) => l.token !== token))
  }

  function copy(token: string) {
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2_000)
  }

  return (
    <div>
      <button
        onClick={() => setShow(!show)}
        className="flex items-center gap-2 px-4 py-2 text-sm border border-stone rounded-lg hover:border-tiefblau hover:text-tiefblau transition"
      >
        🔗 Freigabelink
      </button>

      {show && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-stone rounded-xl shadow-xl p-4 z-10">
          <h4 className="font-medium text-sm text-nachtblau mb-3">Kunden-Sharing (7 Tage)</h4>

          <div className="flex gap-2 mb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort für den Kunden"
              className="flex-1 text-sm border border-stone rounded-lg px-3 py-1.5 focus:outline-none focus:border-tiefblau"
            />
            <button
              onClick={create}
              disabled={!password || creating}
              className="px-3 py-1.5 text-sm bg-tiefblau text-white rounded-lg hover:bg-nachtblau disabled:opacity-40"
            >
              {creating ? '…' : '+ Link'}
            </button>
          </div>

          {links.length > 0 && (
            <div className="space-y-2">
              {links.map((l) => (
                <div key={l.token} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate text-stahlgrau">
                    …/share/{l.token.slice(0, 12)}…
                  </span>
                  <span className="text-stahlgrau whitespace-nowrap">
                    bis {new Date(l.expiresAt).toLocaleDateString('de-DE')}
                  </span>
                  <button onClick={() => copy(l.token)} className="text-tiefblau hover:underline">
                    {copied === l.token ? '✓' : 'Kopieren'}
                  </button>
                  <button onClick={() => revoke(l.token)} className="text-red-500 hover:underline">
                    Widerrufen
                  </button>
                </div>
              ))}
            </div>
          )}
          {links.length === 0 && (
            <p className="text-xs text-stahlgrau">Noch keine aktiven Links</p>
          )}
        </div>
      )}
    </div>
  )
}
