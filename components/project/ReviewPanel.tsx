'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ReviewPanelProps {
  projectId:  string
  reviewMode: 'SIMPLE' | 'COMPLETE'
  hwgFlag:    boolean
}

export function ReviewPanel({ projectId, reviewMode: initialMode, hwgFlag: initialFlag }: ReviewPanelProps) {
  const router = useRouter()
  const [reviewMode, setReviewMode] = useState(initialMode)
  const [hwgFlag,    setHwgFlag]    = useState(initialFlag)
  const [saving,     setSaving]     = useState(false)

  async function update(patch: { reviewMode?: 'SIMPLE' | 'COMPLETE'; hwgFlag?: boolean }) {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/review`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Fehler beim Speichern')
      const updated = await res.json()
      if (updated.reviewMode !== undefined) setReviewMode(updated.reviewMode)
      if (updated.hwgFlag    !== undefined) setHwgFlag(updated.hwgFlag)
      router.refresh()
    } catch (err: unknown) {
      console.error('[Vysible] ReviewPanel update failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-stone rounded-xl p-4 space-y-4">
      <p className="text-xs text-stahlgrau font-medium uppercase tracking-wide">Review & Compliance</p>

      {/* Review-Modus */}
      <div>
        <p className="text-xs text-stahlgrau mb-2">Review-Modus</p>
        <div className="flex gap-2">
          {(['SIMPLE', 'COMPLETE'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => update({ reviewMode: mode })}
              disabled={saving || reviewMode === mode}
              className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${
                reviewMode === mode
                  ? 'bg-tiefblau text-white border-tiefblau'
                  : 'bg-white text-anthrazit border-stone hover:border-tiefblau'
              }`}
            >
              {mode === 'SIMPLE' ? 'Einfach' : 'Vollständig'}
            </button>
          ))}
        </div>
        <p className="text-xs text-stahlgrau mt-1">
          {reviewMode === 'SIMPLE' ? 'Schnellfreigabe ohne Einzelprüfung' : 'Jeder Inhalt wird einzeln geprüft'}
        </p>
      </div>

      {/* HWG-Flag */}
      <div className={`rounded-lg p-3 border ${hwgFlag ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-semibold ${hwgFlag ? 'text-red-700' : 'text-green-700'}`}>
              {hwgFlag ? '[FAIL] HWG-Compliance-Flag gesetzt' : '[OK] Kein HWG-Problem erkannt'}
            </p>
            <p className="text-xs text-stahlgrau mt-0.5">
              {hwgFlag
                ? 'Export und Veröffentlichung gesperrt bis Flag zurückgesetzt wird.'
                : 'Export und Veröffentlichung freigegeben.'}
            </p>
          </div>
          <button
            onClick={() => update({ hwgFlag: !hwgFlag })}
            disabled={saving}
            className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${
              hwgFlag
                ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
            }`}
          >
            {hwgFlag ? 'Flag zurücksetzen' : 'Flag setzen'}
          </button>
        </div>
      </div>
    </div>
  )
}
