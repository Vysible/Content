'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Fehler beim Zurücksetzen.')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-bordeaux">
        Kein gültiger Reset-Link. Bitte fordern Sie einen neuen an.
      </p>
    )
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="text-sm text-green-700 font-medium mb-2">Passwort erfolgreich geändert.</p>
        <p className="text-xs text-stahlgrau">Sie werden zur Anmeldeseite weitergeleitet …</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-xs font-medium text-anthrazit mb-1">
          Neues Passwort
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white text-anthrazit focus:outline-none focus:ring-2 focus:ring-cognac focus:border-transparent transition"
          placeholder="mind. 8 Zeichen"
          autoComplete="new-password"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-xs font-medium text-anthrazit mb-1">
          Passwort bestätigen
        </label>
        <input
          id="confirm"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white text-anthrazit focus:outline-none focus:ring-2 focus:ring-cognac focus:border-transparent transition"
          placeholder="Passwort wiederholen"
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p className="text-xs text-bordeaux bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-cognac hover:bg-cognacDark text-black text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Wird gesetzt …' : 'Passwort setzen'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-creme">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-stone p-8 animate-fade-in">
        <h1 className="text-xl font-bold text-nachtblau mb-2">Passwort zurücksetzen</h1>
        <p className="text-xs text-stahlgrau mb-6">
          Geben Sie Ihr neues Passwort ein.
        </p>
        <Suspense fallback={<div className="text-sm text-stahlgrau">Lädt …</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
