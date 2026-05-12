'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Vysible]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md text-center">
        <p className="text-lg font-semibold text-red-700 mb-2">Fehler aufgetreten</p>
        <p className="text-sm text-red-600 mb-4">{error.message || 'Unbekannter Fehler'}</p>
        {error.digest && (
          <p className="text-xs text-stahlgrau mb-4">Fehler-ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  )
}
