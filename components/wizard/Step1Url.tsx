'use client'

import { useState } from 'react'
import type { WizardData } from './NewProjectWizard'

interface Step1Props {
  data: WizardData
  onChange: (updates: Partial<WizardData>) => void
  onNext: () => void
}

type CheckStatus = 'idle' | 'loading' | 'ok' | 'warn' | 'error'

interface CheckResult {
  status: CheckStatus
  message: string
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

export function Step1Url({ data, onChange, onNext }: Step1Props) {
  const [urlInput, setUrlInput] = useState(data.praxisUrl)
  const [check, setCheck] = useState<CheckResult>({ status: 'idle', message: '' })

  async function handleCheck() {
    const url = normalizeUrl(urlInput)
    if (!url) return

    onChange({ praxisUrl: url, urlValidated: false })
    setCheck({ status: 'loading', message: 'Prüfe URL …' })

    try {
      const res = await fetch('/api/projects/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const result = await res.json()

      if (!result.reachable) {
        setCheck({ status: 'error', message: result.error ?? 'URL nicht erreichbar' })
        return
      }

      if (!result.robotsAllowed) {
        setCheck({ status: 'error', message: result.error ?? 'robots.txt verbietet den Zugriff' })
        onChange({ praxisUrl: url, urlValidated: false, robotsAllowed: false })
        return
      }

      if (result.warning) {
        setCheck({ status: 'warn', message: result.warning })
        onChange({ praxisUrl: url, urlValidated: true, robotsAllowed: true })
        return
      }

      setCheck({ status: 'ok', message: 'URL erreichbar · robots.txt OK' })
      onChange({ praxisUrl: url, urlValidated: true, robotsAllowed: true })
    } catch {
      setCheck({ status: 'error', message: 'Prüfung fehlgeschlagen. Bitte erneut versuchen.' })
    }
  }

  const statusColors: Record<CheckStatus, string> = {
    idle: '',
    loading: 'text-stahlgrau',
    ok: 'text-green-700 bg-green-50 border-green-200',
    warn: 'text-amber-700 bg-amber-50 border-amber-200',
    error: 'text-bordeaux bg-red-50 border-red-200',
  }

  const canProceed = data.urlValidated && data.praxisName.trim().length > 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-nachtblau mb-1">Schritt 1: Praxis-Website</h2>
        <p className="text-sm text-stahlgrau">URL der Praxis-Website eingeben und prüfen.</p>
      </div>

      {/* URL-Eingabe */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">Praxis-URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setCheck({ status: 'idle', message: '' }) }}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            placeholder="www.zahnzentrum-warendorf.de"
            className="flex-1 px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac"
          />
          <button
            onClick={handleCheck}
            disabled={!urlInput.trim() || check.status === 'loading'}
            className="px-4 py-2 bg-tiefblau hover:bg-nachtblau text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {check.status === 'loading' ? '…' : 'Prüfen'}
          </button>
        </div>

        {check.status !== 'idle' && check.message && (
          <div className={`mt-2 text-xs px-3 py-2 rounded-lg border ${statusColors[check.status]}`}>
            {check.status === 'ok' && '✓ '}{check.status === 'error' && '✗ '}{check.status === 'warn' && '⚠ '}
            {check.message}
          </div>
        )}
      </div>

      {/* Praxisname */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">Praxisname</label>
        <input
          type="text"
          value={data.praxisName}
          onChange={(e) => onChange({ praxisName: e.target.value })}
          placeholder="z.B. Zahnzentrum Warendorf"
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-2 bg-cognac hover:bg-cognacDark text-black text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Weiter →
        </button>
      </div>

      {!canProceed && data.praxisName.trim().length === 0 && data.urlValidated && (
        <p className="text-xs text-stahlgrau text-right -mt-2">Bitte Praxisnamen eingeben, um fortzufahren.</p>
      )}
    </div>
  )
}
