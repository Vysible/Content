'use client'

import { useEffect, useState } from 'react'

export interface FachgebietApiItem {
  slug: string
  displayName: string
  specialty: string
  defaultKeywords: string[]
  defaultCategories: string[]
  seasonalTopics: Record<string, string>
  hwgHighRiskCategories: string[]
  defaultCta: string
  defaultFunnelDistribution: {
    awareness: string
    consideration: string
    decision: string
    retention: string
  }
}

interface TemplateSelectorProps {
  onSelect: (template: FachgebietApiItem | null) => void
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<FachgebietApiItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/projects/templates')
      .then((r) => r.json())
      .then((data: FachgebietApiItem[]) => setTemplates(data))
      .catch((err: unknown) => {
        console.warn('[Vysible] Templates konnten nicht geladen werden', err)
      })
  }, [])

  function handleSelect(t: FachgebietApiItem) {
    setSelected(t.slug)
    onSelect(t)
  }

  function handleClear() {
    setSelected(null)
    onSelect(null)
  }

  if (templates.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-nachtblau">Fachgebiet-Vorlage <span className="text-stahlgrau font-normal">(optional)</span></p>
        {selected && (
          <button onClick={handleClear} className="text-xs text-stahlgrau hover:text-anthrazit transition">
            Auswahl aufheben
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {templates.map((t) => (
          <button
            key={t.slug}
            onClick={() => handleSelect(t)}
            className={`p-3 rounded-lg border text-left text-sm transition-colors ${
              selected === t.slug
                ? 'border-tiefblau bg-tiefblau/10 text-tiefblau'
                : 'border-stone hover:border-tiefblau/50 text-nachtblau'
            }`}
          >
            <p className="font-medium">{t.displayName}</p>
            {t.hwgHighRiskCategories.length > 0 && (
              <p className="text-xs text-bordeaux mt-0.5">HWG-relevant</p>
            )}
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-xs text-stahlgrau">
          [OK] Keywords + Kategorien aus Vorlage vorbelegt
        </p>
      )}
    </div>
  )
}
