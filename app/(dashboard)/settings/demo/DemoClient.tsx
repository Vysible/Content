'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'

type DemoResult = {
  ok: boolean
  projectName?: string
  portalToken?: string
  portalUrl?: string
  password?: string
  error?: string
}

export function DemoClient() {
  const [result, setResult] = useState<DemoResult | null>(null)
  const [loading, setLoading] = useState<'create' | 'delete' | null>(null)

  async function create() {
    setLoading('create')
    setResult(null)
    try {
      const res = await fetch('/api/admin/demo', { method: 'POST' })
      const data = await res.json()
      setResult(data)
    } catch (e: unknown) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Unbekannter Fehler' })
    } finally {
      setLoading(null)
    }
  }

  async function remove() {
    if (!confirm('Demo-Projekt wirklich löschen?')) return
    setLoading('delete')
    setResult(null)
    try {
      const res = await fetch('/api/admin/demo', { method: 'DELETE' })
      const data = await res.json()
      setResult(data)
    } catch (e: unknown) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Unbekannter Fehler' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <Header
        title="Demo-Portal"
        subtitle="Coaching-Demo erstellen oder zurücksetzen (nur Admins)"
      />

      <div className="max-w-xl space-y-4">
        <div className="bg-stone/30 border border-stone rounded-xl p-5 text-sm text-stahlgrau space-y-2">
          <p className="font-semibold text-anthrazit">Coaching-Demo „Andrea Hoffmann"</p>
          <p>Erstellt ein vollständiges Demo-Projekt mit Themenplan (Jul–Sep 2026), fertig geschriebenen Texten für Juli und einem Kundenportal-Link.</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>1 Blog-Artikel + 1 Newsletter + 4 Instagram + 2 LinkedIn pro Monat</li>
            <li>Portalzugang mit Passwort <code className="bg-stone px-1 rounded">coaching2026</code></li>
            <li>Analytics deaktiviert (kein Google Ads)</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={create}
            disabled={loading !== null}
            className="px-4 py-2 bg-brombeer text-white rounded-lg text-sm font-semibold hover:bg-brombeer/90 disabled:opacity-50 transition"
          >
            {loading === 'create' ? 'Wird erstellt…' : 'Demo erstellen / zurücksetzen'}
          </button>
          <button
            onClick={remove}
            disabled={loading !== null}
            className="px-4 py-2 bg-white border border-stone text-stahlgrau rounded-lg text-sm font-semibold hover:bg-stone/30 disabled:opacity-50 transition"
          >
            {loading === 'delete' ? 'Wird gelöscht…' : 'Demo löschen'}
          </button>
        </div>

        {result && (
          <div className={`rounded-xl p-4 text-sm border ${result.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {result.ok ? (
              <div className="space-y-2">
                {result.projectName && (
                  <p>
                    <span className="font-semibold">Projekt:</span> {result.projectName}
                  </p>
                )}
                {result.portalUrl && (
                  <p>
                    <span className="font-semibold">Portal-Link:</span>{' '}
                    <a
                      href={result.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-mono"
                    >
                      {result.portalUrl}
                    </a>
                  </p>
                )}
                {result.password && (
                  <p>
                    <span className="font-semibold">Passwort:</span>{' '}
                    <code className="bg-white/60 px-1.5 rounded border border-emerald-200">{result.password}</code>
                  </p>
                )}
                {!result.projectName && <p>Erfolgreich gelöscht.</p>}
              </div>
            ) : (
              <p>{result.error ?? 'Fehler beim Ausführen der Aktion.'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
