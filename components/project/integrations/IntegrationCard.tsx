'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  description: string
  connected: boolean
  saving: boolean
  testing: boolean
  testResult: { ok: boolean; error?: string } | null
  saved: boolean
  saveError: string | null
  onSave: () => void
  onTest: () => void
  onDisconnect: () => void
  children: ReactNode
  prerequisites: Array<{ step: string; detail?: string; link?: { label: string; href: string } }>
}

export function IntegrationCard({
  title, description, connected, saving, testing, testResult, saved, saveError,
  onSave, onTest, onDisconnect, children, prerequisites,
}: Props) {
  const [showPrereqs, setShowPrereqs] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-stone p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-nachtblau">{title}</h2>
            {connected
              ? <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Verbunden</span>
              : <span className="text-xs px-2 py-0.5 bg-stone text-stahlgrau rounded-full">Nicht verbunden</span>
            }
          </div>
          <p className="text-sm text-stahlgrau mt-0.5">{description}</p>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-3">
        {children}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau disabled:opacity-50 transition"
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
        <button
          onClick={onTest}
          disabled={testing || saving}
          className="px-4 py-2 border border-stone text-sm text-anthrazit rounded-lg hover:bg-stone/30 disabled:opacity-50 transition"
        >
          {testing ? 'Teste…' : 'Verbindung testen'}
        </button>
        {connected && (
          <button
            onClick={onDisconnect}
            className="px-4 py-2 text-sm text-red-600 hover:underline"
          >
            Trennen
          </button>
        )}
        <div className="flex items-center gap-2">
          {saved && <p className="text-sm text-green-600">Gespeichert ✓</p>}
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          {testResult?.ok && <p className="text-sm text-green-600">Verbindung OK ✓</p>}
          {testResult && !testResult.ok && <p className="text-sm text-red-600">{testResult.error}</p>}
        </div>
      </div>

      {/* Prerequisites */}
      <div className="border-t border-stone pt-4">
        <button
          onClick={() => setShowPrereqs((v) => !v)}
          className="flex items-center gap-2 text-xs text-stahlgrau hover:text-anthrazit transition"
        >
          <span>{showPrereqs ? '▲' : '▼'}</span>
          <span>Voraussetzungen anzeigen</span>
        </button>
        {showPrereqs && (
          <div className="mt-3 p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-blue-900">Was du brauchst:</p>
            <ol className="space-y-2">
              {prerequisites.map((p, i) => (
                <li key={i} className="flex gap-2 text-xs text-blue-800">
                  <span className="shrink-0 font-bold">{i + 1}.</span>
                  <span>
                    {p.step}
                    {p.detail && <span className="text-blue-600"> — {p.detail}</span>}
                    {p.link && (
                      <>
                        {' '}
                        <a
                          href={p.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-900"
                        >
                          {p.link.label}
                        </a>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
