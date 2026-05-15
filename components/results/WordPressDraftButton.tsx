'use client'

import { useState } from 'react'

interface WordPressDraftButtonProps {
  projectId: string
  blogMarkdown: string
  blogHtml: string
  hwgDisclaimer?: string
  wpConfigured: boolean
  hwgFlag?: string
  initialStatus?: 'ausstehend' | 'in_wordpress'
  initialEditUrl?: string
}

export function WordPressDraftButton({
  projectId,
  blogMarkdown,
  blogHtml,
  hwgDisclaimer,
  wpConfigured,
  hwgFlag,
  initialStatus = 'ausstehend',
  initialEditUrl,
}: WordPressDraftButtonProps) {
  const [status, setStatus] = useState<'ausstehend' | 'in_wordpress' | 'loading' | 'error'>(initialStatus)
  const [editUrl, setEditUrl] = useState(initialEditUrl ?? '')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const hwgBlocked = hwgFlag === 'rot'

  async function handleDraft() {
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/wordpress/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          ...(blogMarkdown ? { blogMarkdown } : { blogHtml }),
          hwgDisclaimer,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setEditUrl(data.editUrl)
      setStatus('in_wordpress')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg.slice(0, 120))
      setStatus('error')
      console.error('[Vysible] WordPress-Draft fehlgeschlagen', err)
    }
  }

  async function handleCopyHtml() {
    try {
      await navigator.clipboard.writeText(blogHtml)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err: unknown) {
      console.error('[Vysible] Clipboard-Copy fehlgeschlagen', err)
    }
  }

  if (!wpConfigured) {
    return (
      <div className="inline-flex items-center gap-2">
        <button
          onClick={handleCopyHtml}
          className="px-3 py-1.5 text-xs bg-stone/50 text-nachtblau rounded-lg hover:bg-stone/70 transition"
          title="In WordPress: Neuer Beitrag -> HTML-Modus einfügen"
        >
          {copied ? '[OK] HTML kopiert' : 'HTML kopieren'}
        </button>
      </div>
    )
  }

  if (status === 'in_wordpress') {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="text-xs text-green-700">[OK] In WordPress (Draft)</span>
        {editUrl && (
          <a
            href={editUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#21759b] hover:underline"
          >
            In WordPress bearbeiten &rarr;
          </a>
        )}
        <button
          onClick={handleDraft}
          className="px-2 py-1 text-xs border border-stone text-stahlgrau rounded hover:bg-stone/30 transition"
        >
          Erneut hochladen
        </button>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleDraft}
        disabled={status === 'loading' || hwgBlocked}
        className="px-3 py-1.5 text-xs bg-[#21759b] text-white rounded-lg hover:bg-[#1a5e7a] disabled:opacity-50 transition"
        title={hwgBlocked ? 'HWG-Compliance-Gate: Rote Markierung muss zuerst behoben werden' : undefined}
      >
        {status === 'loading'
          ? '[INFO] Draft wird erstellt...'
          : status === 'error'
            ? 'Fehler — nochmal versuchen'
            : 'Als WordPress-Draft anlegen'}
      </button>
      {hwgBlocked && (
        <span className="text-xs text-red-600">HWG-Gate blockiert</span>
      )}
      {status === 'error' && errorMsg && (
        <span className="text-xs text-red-600">[FAIL] {errorMsg}</span>
      )}
    </div>
  )
}
