'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Vysible-Logo SVG (inline, DSGVO-konform, kein externer Request)
function VysibleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-label="Vysible Logo">
      <circle cx="50" cy="50" r="50" fill="currentColor" />
      <circle cx="37" cy="32" r="7" fill="#F6F1E9" />
      <path d="M 49 30 L 65 30 L 58 86 L 50 86 Z" fill="#F6F1E9" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
    } finally {
      setForgotLoading(false)
      setForgotSent(true)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('E-Mail oder Passwort ungültig.')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-creme">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-stone p-8 animate-fade-in">
        {/* Logo + Titel */}
        <div className="flex items-center gap-3 mb-8">
          <VysibleLogo className="w-12 h-12 text-nachtblau" />
          <div>
            <h1 className="text-xl font-bold text-nachtblau leading-none">Vysible</h1>
            <p className="text-xs text-stahlgrau mt-0.5">KI-Content-Automationsplattform</p>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-anthrazit mb-6">
          {forgotMode ? 'Passwort zurücksetzen' : 'Anmelden'}
        </h2>

        {forgotMode ? (
          forgotSent ? (
            <div className="text-center py-4">
              <p className="text-sm text-green-700 font-medium mb-2">E-Mail gesendet.</p>
              <p className="text-xs text-stahlgrau mb-4">
                Falls ein Konto existiert, erhalten Sie einen Reset-Link.
              </p>
              <button
                type="button"
                onClick={() => { setForgotMode(false); setForgotSent(false) }}
                className="text-xs text-cognac hover:underline"
              >
                Zurück zur Anmeldung
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-medium text-anthrazit mb-1">
                  E-Mail
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white text-anthrazit focus:outline-none focus:ring-2 focus:ring-cognac focus:border-transparent transition"
                  placeholder="admin@vysible.de"
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-cognac hover:bg-cognacDark text-black text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
              >
                {forgotLoading ? 'Wird gesendet …' : 'Reset-Link anfordern'}
              </button>
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="w-full text-xs text-stahlgrau hover:text-anthrazit mt-1"
              >
                Zurück zur Anmeldung
              </button>
            </form>
          )
        ) : (

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-anthrazit mb-1">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white text-anthrazit focus:outline-none focus:ring-2 focus:ring-cognac focus:border-transparent transition"
              placeholder="admin@vysible.de"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-anthrazit mb-1">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white text-anthrazit focus:outline-none focus:ring-2 focus:ring-cognac focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p
              data-testid="login-error"
              className="text-xs text-bordeaux bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cognac hover:bg-cognacDark text-black text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Anmelden …' : 'Anmelden'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setForgotMode(true); setError('') }}
              className="text-xs text-stahlgrau hover:text-cognac transition"
            >
              Passwort vergessen?
            </button>
          </div>
        </form>
        )}

        <p className="mt-6 text-xs text-center text-stahlgrau">
          Agentur-internes System · Nur für autorisierte Nutzer
        </p>
      </div>
    </main>
  )
}
