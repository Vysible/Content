'use client'

import { useState } from 'react'
import type { HedySession } from '@/lib/hedy/client'

type Step = 'idle' | 'select' | 'transcript' | 'generate' | 'preview'

interface HedyImportProps {
  projectId?: string
  onImported: (positioning: string) => void
}

export function HedyImport({ projectId, onImported }: HedyImportProps) {
  const [step, setStep] = useState<Step>('idle')
  const [sessions, setSessions] = useState<HedySession[]>([])
  const [transcript, setTranscript] = useState<string | null>(null)
  const [document, setDocument] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadSessions() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/hedy/import?action=sessions')
      if (res.status === 422) {
        setError('[WARN] Hedy nicht konfiguriert — API-Key unter Einstellungen → API-Keys hinterlegen.')
        return
      }
      if (!res.ok) throw new Error(`[FAIL] Sessions konnten nicht geladen werden (HTTP ${res.status})`)
      const { sessions: list } = await res.json() as { sessions: HedySession[] }
      setSessions(list)
      setStep('select')
    } catch (e) {
      console.error('[Vysible] Hedy Sessions laden fehlgeschlagen', e)
      setError(e instanceof Error ? e.message : '[FAIL] Hedy nicht erreichbar. API-Key prüfen.')
    } finally {
      setLoading(false)
    }
  }

  async function loadTranscript(sessionId: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/hedy/import?action=transcript&id=${sessionId}`)
      if (!res.ok) throw new Error(`[FAIL] Transkript-Abruf fehlgeschlagen (HTTP ${res.status})`)
      const { transcript: text } = await res.json() as { transcript: string }
      setTranscript(text)
      setStep('transcript')
    } catch (e) {
      console.error('[Vysible] Hedy Transkript laden fehlgeschlagen', e)
      setError(e instanceof Error ? e.message : '[FAIL] Transkript konnte nicht abgerufen werden.')
    } finally {
      setLoading(false)
    }
  }

  async function generateDocument() {
    if (!transcript) return
    setStep('generate')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/hedy/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, transcript }),
      })
      if (!res.ok) throw new Error(`[FAIL] Generierung fehlgeschlagen (HTTP ${res.status})`)
      const { document: doc } = await res.json() as { document: string }
      setDocument(doc)
      setStep('preview')
    } catch (e) {
      console.error('[Vysible] Hedy Generierung fehlgeschlagen', e)
      setError(e instanceof Error ? e.message : '[FAIL] Generierung fehlgeschlagen. Erneut versuchen.')
      setStep('transcript')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('idle')
    setSessions([])
    setTranscript(null)
    setDocument('')
    setError('')
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="space-y-3">

      {step === 'idle' && (
        <button
          onClick={loadSessions}
          disabled={loading}
          className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau disabled:opacity-50"
        >
          {loading ? '[INFO] Sessions werden geladen…' : 'Aus Hedy importieren'}
        </button>
      )}

      {step === 'select' && (
        <div className="space-y-2">
          <p className="text-xs text-stahlgrau">Session auswählen:</p>
          <ul className="divide-y divide-stone border border-stone rounded-lg overflow-hidden text-sm">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => loadTranscript(s.id)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2 hover:bg-creme transition disabled:opacity-50"
                >
                  <span className="font-medium text-anthrazit">{s.title}</span>
                  <span className="ml-2 text-xs text-stahlgrau">{formatDate(s.date)}</span>
                  {s.durationMinutes > 0 && (
                    <span className="ml-1 text-xs text-stahlgrau">· {s.durationMinutes} min</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {loading && <p className="text-xs text-stahlgrau">[INFO] Transkript wird abgerufen…</p>}
          <button onClick={reset} className="text-xs text-stahlgrau hover:text-anthrazit">Abbrechen</button>
        </div>
      )}

      {step === 'transcript' && (
        <div className="space-y-2">
          <p className="text-xs text-stahlgrau">
            Transkript geladen ({transcript?.length.toLocaleString('de')} Zeichen). Positionierungsdokument generieren?
          </p>
          <div className="flex gap-2 items-center">
            <button
              onClick={generateDocument}
              disabled={loading}
              className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau disabled:opacity-50"
            >
              Positionierungsdokument generieren
            </button>
            <button onClick={reset} className="text-xs text-stahlgrau hover:text-anthrazit px-2">Abbrechen</button>
          </div>
        </div>
      )}

      {step === 'generate' && (
        <p className="text-xs text-stahlgrau">[INFO] KI analysiert Transkript… (ca. 20–30 Sekunden)</p>
      )}

      {step === 'preview' && (
        <div className="space-y-2">
          <p className="text-xs text-stahlgrau">[OK] Generiert — vor Speicherung editierbar:</p>
          <textarea
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            rows={12}
            className="w-full border border-stone rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-tiefblau"
          />
          <div className="flex gap-2 items-center">
            <button
              onClick={() => { onImported(document); reset() }}
              disabled={!document.trim()}
              className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau disabled:opacity-50"
            >
              Als Positionierungsdokument speichern
            </button>
            <button onClick={reset} className="text-xs text-stahlgrau hover:text-anthrazit px-2">Verwerfen</button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
