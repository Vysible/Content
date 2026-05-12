'use client'

import { useEffect, useState } from 'react'

interface Template {
  slug: string
  name: string
  fachgebiet: string
}

interface TemplateSelectorProps {
  onSelect: (slug: string) => void
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected, setSelected] = useState('')

  useEffect(() => {
    fetch('/api/projects/templates')
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {})
  }, [])

  function handleSelect(slug: string) {
    setSelected(slug)
    onSelect(slug)
  }

  if (templates.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-nachtblau">Vorlage wählen (optional)</p>
      <div className="grid grid-cols-3 gap-2">
        {templates.map((t) => (
          <button
            key={t.slug}
            onClick={() => handleSelect(t.slug)}
            className={`p-3 rounded-lg border text-left text-sm transition-colors ${
              selected === t.slug
                ? 'border-tiefblau bg-tiefblau/10 text-tiefblau'
                : 'border-stone hover:border-tiefblau/50 text-nachtblau'
            }`}
          >
            <p className="font-medium">{t.name}</p>
            <p className="text-xs text-stahlgrau mt-0.5">{t.fachgebiet}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
