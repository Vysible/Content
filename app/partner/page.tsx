'use client'

import { useState } from 'react'

export default function PartnerPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Ein Fehler ist aufgetreten.')
        setStatus('error')
      } else {
        setStatus('success')
      }
    } catch {
      setErrorMsg('Verbindung fehlgeschlagen. Bitte versuche es erneut.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <main className="min-h-screen bg-creme flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-stone p-10 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-bordeaux mb-3">Danke!</h1>
          <p className="text-sm text-anthrazit">
            Deine Anfrage ist eingegangen. Du erhältst in Kürze eine Bestätigung per E-Mail.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-creme flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-stone p-10 max-w-md w-full">
        <h1 className="text-2xl font-bold text-bordeaux mb-2">Partner werden</h1>
        <p className="text-sm text-stahlgrau mb-8">
          Trag dich ein – wir melden uns bei dir.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-stahlgrau mb-1.5">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-stone px-4 py-2.5 text-sm text-anthrazit bg-creme focus:outline-none focus:ring-2 focus:ring-bordeaux/40 focus:border-bordeaux transition"
              placeholder="Max Mustermann"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-stahlgrau mb-1.5">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone px-4 py-2.5 text-sm text-anthrazit bg-creme focus:outline-none focus:ring-2 focus:ring-bordeaux/40 focus:border-bordeaux transition"
              placeholder="max@beispiel.de"
            />
          </div>

          {status === 'error' && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-bordeaux hover:bg-bordeaux/90 disabled:opacity-60 text-white font-semibold text-sm rounded-lg px-4 py-3 transition"
          >
            {status === 'loading' ? 'Wird gesendet…' : 'Partner werden'}
          </button>
        </form>
      </div>
    </main>
  )
}
