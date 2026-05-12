'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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

        <h2 className="text-sm font-semibold text-anthrazit mb-6">Anmelden</h2>

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
            <p className="text-xs text-bordeaux bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cognac hover:bg-cognacDark text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Anmelden …' : 'Anmelden'}
          </button>
        </form>

        <p className="mt-6 text-xs text-center text-stahlgrau">
          Agentur-internes System · Nur für autorisierte Nutzer
        </p>
      </div>
    </main>
  )
}
