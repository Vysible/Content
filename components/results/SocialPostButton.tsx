'use client'

import { useState } from 'react'
import type { StoredTextResult, SocialStatus } from '@/lib/generation/results-store'

const PLATFORM_LABELS: Record<string, string> = {
  SOCIAL_FACEBOOK:  'Facebook',
  SOCIAL_INSTAGRAM: 'Instagram',
  SOCIAL_LINKEDIN:  'LinkedIn',
}

interface Props {
  projectId: string
  index: number
  kanal: string
  text: string
  currentStatus?: SocialStatus
  currentDraftId?: string
  currentPlatform?: string
  currentError?: string
  tokenExpired?: boolean
  onResult: (updates: Partial<StoredTextResult>) => void
}

export function SocialPostButton({
  projectId,
  index,
  kanal,
  text,
  currentStatus,
  currentDraftId,
  currentPlatform,
  currentError,
  tokenExpired = false,
  onResult,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Nur für die Plattform dieses Buttons relevant (z.B. 'facebook' ↔ 'SOCIAL_FACEBOOK')
  const expectedPlatform = kanal.replace('SOCIAL_', '').toLowerCase()
  const isActivePlatform = currentPlatform === expectedPlatform

  const platformLabel = PLATFORM_LABELS[kanal] ?? kanal

  async function handleUpload() {
    setLoading(true)
    setSessionError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/social-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index, kanal, text }),
      })
      const data = await res.json() as { status?: string; draftId?: string; platform?: string; error?: string }
      if (!res.ok) {
        const msg = data.error ?? `HTTP ${res.status}`
        setSessionError(msg)
        onResult({ socialStatus: 'fehler', socialPlatform: expectedPlatform, socialError: msg })
      } else if (data.status === 'draft') {
        onResult({ socialStatus: 'hochgeladen', socialDraftId: data.draftId, socialPlatform: data.platform })
      } else {
        const msg = data.error ?? 'Unbekannter Fehler'
        setSessionError(msg)
        onResult({ socialStatus: 'fehler', socialPlatform: data.platform ?? expectedPlatform, socialError: msg })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[Vysible] Social-Post-Upload fehlgeschlagen:', err)
      setSessionError(msg)
      onResult({ socialStatus: 'fehler', socialPlatform: expectedPlatform, socialError: msg })
    } finally {
      setLoading(false)
    }
  }

  // Anzeigezustand auflösen
  const showSuccess = !sessionError && isActivePlatform && currentStatus === 'hochgeladen'
  const showError   = sessionError || (isActivePlatform && currentStatus === 'fehler')
  const errorMsg    = sessionError ?? (isActivePlatform ? currentError : undefined)
  const draftId     = isActivePlatform ? currentDraftId : undefined

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-stahlgrau">
        <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-tiefblau border-t-transparent rounded-full" />
        Wird hochgeladen…
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-700">
        <span className="font-medium">{platformLabel} Draft hochgeladen [OK]</span>
        {draftId && (
          <span className="text-stahlgrau font-mono">ID: {draftId.slice(0, 12)}…</span>
        )}
        <button
          onClick={handleUpload}
          className="text-stahlgrau hover:text-anthrazit underline ml-1"
        >
          Erneut hochladen
        </button>
      </div>
    )
  }

  if (showError) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-700">
        <span className="font-medium">[FAIL] {platformLabel}:</span>
        <span className="truncate max-w-[200px]">{errorMsg}</span>
        <button
          onClick={handleUpload}
          className="underline ml-1 whitespace-nowrap"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleUpload}
      disabled={tokenExpired || !text.trim()}
      title={tokenExpired ? `${platformLabel}-Token abgelaufen — unter Einstellungen → API-Keys erneuern` : undefined}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
        tokenExpired || !text.trim()
          ? 'bg-stone text-stahlgrau cursor-not-allowed opacity-60'
          : 'bg-tiefblau text-white hover:bg-nachtblau'
      }`}
    >
      {platformLabel} Draft hochladen
      {tokenExpired && <span className="text-amber-300">⚠</span>}
    </button>
  )
}
