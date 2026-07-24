'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Vysible] Projekt-Fehler:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-lg w-full">
        <p className="text-base font-semibold text-red-700 mb-2">Projekt konnte nicht geladen werden</p>
        <p className="text-sm text-red-600 mb-4 leading-relaxed">
          {error.message || 'Unbekannter Fehler beim Laden des Projekts.'}
        </p>
        {error.digest && (
          <p className="text-xs text-stahlgrau mb-4 font-mono">Fehler-ID: {error.digest}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau transition"
          >
            Erneut versuchen
          </button>
          <Link
            href="/projects"
            className="px-4 py-2 bg-stone text-anthrazit text-sm rounded-lg hover:bg-stone/70 transition"
          >
            Alle Projekte
          </Link>
        </div>
      </div>
    </div>
  )
}
