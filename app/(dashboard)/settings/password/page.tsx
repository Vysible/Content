'use client'

import { useState } from 'react'

export default function PasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('Neues Passwort und Bestätigung stimmen nicht überein.')
      return
    }

    if (newPassword.length < 8) {
      setError('Das neue Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Ein Fehler ist aufgetreten.')
      } else {
        setSuccess('Passwort wurde erfolgreich geändert.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-nachtblau mb-1">Passwort ändern</h1>
      <p className="text-sm text-stahlgrau mb-6">Aktualisiere dein Anmelde-Passwort.</p>

      <div className="bg-white rounded-2xl shadow-sm border border-stone p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-xs font-medium text-anthrazit mb-1">
              Aktuelles Passwort
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white text-anthrazit focus:outline-none focus:ring-2 focus:ring-cognac focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-xs font-medium text-anthrazit mb-1">
              Neues Passwort
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white text-anthrazit focus:outline-none focus:ring-2 focus:ring-cognac focus:border-transparent transition"
              placeholder="Mindestens 8 Zeichen"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-medium text-anthrazit mb-1">
              Passwort bestätigen
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white text-anthrazit focus:outline-none focus:ring-2 focus:ring-cognac focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-bordeaux bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cognac hover:bg-cognacDark text-black text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird gespeichert …' : 'Passwort ändern'}
          </button>
        </form>
      </div>
    </div>
  )
}
