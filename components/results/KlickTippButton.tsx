'use client'

import { useState } from 'react'

interface KlickTippButtonProps {
  projectId: string
  subjectA: string
  subjectB?: string
  preheader?: string
  newsletterMarkdown: string
  ktConfigured: boolean
  hwgFlag?: string
  initialStatus?: 'ausstehend' | 'kt_kampagne'
}

export function KlickTippButton({
  projectId,
  subjectA,
  subjectB,
  preheader,
  newsletterMarkdown,
  ktConfigured,
  hwgFlag,
  initialStatus = 'ausstehend',
}: KlickTippButtonProps) {
  const [status, setStatus] = useState<'ausstehend' | 'kt_kampagne' | 'loading' | 'error'>(
    initialStatus,
  )
  const [editUrl, setEditUrl] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const hwgBlocked = hwgFlag === 'rot'

  async function handleCreate() {
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/klicktipp/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          subjectA,
          subjectB,
          preheader,
          newsletterMarkdown,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setEditUrl(data.editUrl ?? '')
      setStatus('kt_kampagne')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg.slice(0, 120))
      setStatus('error')
      console.error('[Vysible] KlickTipp-Kampagne fehlgeschlagen', err)
    }
  }

  if (!ktConfigured) {
    return (
      <button
        disabled
        className="px-3 py-1.5 text-xs bg-stone/50 text-stahlgrau rounded-lg opacity-60 cursor-not-allowed"
        title="KlickTipp nicht konfiguriert — /settings/klicktipp"
      >
        KT-Kampagne (nicht konfiguriert)
      </button>
    )
  }

  if (status === 'kt_kampagne') {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="text-xs text-green-700">[OK] KT-Kampagne erstellt</span>
        {editUrl && (
          <a
            href={editUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-orange-600 hover:underline"
          >
            In KlickTipp bearbeiten &rarr;
          </a>
        )}
        <button
          onClick={handleCreate}
          className="px-2 py-1 text-xs border border-stone text-stahlgrau rounded hover:bg-stone/30 transition"
        >
          Erneut erstellen
        </button>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleCreate}
        disabled={status === 'loading' || hwgBlocked}
        className="px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition"
        title={
          hwgBlocked
            ? 'HWG-Compliance-Gate: Rote Markierung zuerst beheben'
            : undefined
        }
      >
        {status === 'loading'
          ? '[INFO] Kampagne wird erstellt...'
          : status === 'error'
            ? 'Fehler — nochmal versuchen'
            : 'Als KT-Kampagne anlegen'}
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
