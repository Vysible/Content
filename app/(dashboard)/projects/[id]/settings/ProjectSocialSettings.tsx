'use client'

import { useState } from 'react'

interface Props {
  projectId: string
  initialSocialExamples: string
}

export function ProjectSocialSettings({ projectId, initialSocialExamples }: Props) {
  const [examples, setExamples] = useState(initialSocialExamples)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socialExamples: examples }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 3_000)
    } catch {
      setError('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-stone rounded-xl p-5">
      <h2 className="font-semibold text-sm mb-1">Beispiel-Posts (Social Media)</h2>
      <p className="text-xs text-stahlgrau mb-4">
        Füge 2–5 Beispiel-Posts dieser Praxis ein (Instagram, Facebook oder LinkedIn). Die KI übernimmt Stil, Tonalität und Struktur für alle generierten Social-Media-Beiträge.
      </p>

      <textarea
        value={examples}
        onChange={(e) => setExamples(e.target.value)}
        rows={8}
        placeholder={`Beispiel Instagram:\n🦷 Wusstest du, dass regelmäßige Prophylaxe nicht nur deine Zähne schützt, sondern auch dein Herz? In unserer Praxis nehmen wir uns Zeit für dich. #Prophylaxe #ZahnarztMünchen\n\nBeispiel LinkedIn:\nAls Zahnarztpraxis mit Schwerpunkt Implantologie sehen wir täglich, wie sehr ein gesundes Lächeln das Selbstbewusstsein unserer Patienten verändert. ...`}
        className="w-full border border-stone rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tiefblau resize-y font-mono"
      />

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-tiefblau text-creme text-sm rounded-lg hover:bg-anthrazit transition disabled:opacity-50"
        >
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
        {saved && <span className="text-xs text-green-600">Gespeichert</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}
