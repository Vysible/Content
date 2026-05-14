'use client'

import { useState, useCallback } from 'react'
import type { StoredTextResult } from '@/lib/generation/results-store'
import { BLOG_STATUS_LABELS, NEWSLETTER_STATUS_LABELS, SOCIAL_STATUS_LABELS } from '@/lib/generation/results-store'

type StatusColor = 'gray' | 'yellow' | 'green' | 'blue'

const STATUS_COLORS: Record<string, StatusColor> = {
  ausstehend:    'gray',
  in_wordpress:  'yellow',
  veroeffentlicht: 'blue',
  kt_kampagne:   'yellow',
  versendet:     'blue',
  hochgeladen:   'yellow',
  freigegeben:   'green',
}

const COLOR_CLASSES: Record<StatusColor, string> = {
  gray:   'bg-stone text-stahlgrau',
  yellow: 'bg-amber-100 text-amber-800',
  green:  'bg-green-100 text-green-800',
  blue:   'bg-blue-100 text-blue-800',
}

const KANAL_LABELS: Record<string, string> = {
  BLOG:              'Blog',
  NEWSLETTER:        'NL',
  SOCIAL_INSTAGRAM:  'IG',
  SOCIAL_FACEBOOK:   'FB',
  SOCIAL_LINKEDIN:   'LI',
}

interface CalendarItem {
  index: number
  monat: string
  titel: string
  kanal: string
  status: string
}

interface Props {
  projectId: string
  textResults: StoredTextResult[]
}

export function ContentCalendar({ projectId, textResults }: Props) {
  const [items, setItems] = useState<CalendarItem[]>(() =>
    textResults.map((r, i) => ({
      index: i,
      monat: r.monat,
      titel: r.titel,
      kanal: r.kanal,
      status: r.blogStatus ?? r.newsletterStatus ?? r.socialStatus ?? 'ausstehend',
    }))
  )
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Alle Monate ermitteln
  const months = Array.from(new Set(items.map((i) => i.monat))).sort()

  const getItemsForMonth = (monat: string) =>
    items.filter((i) => i.monat === monat)

  const handleDragStart = useCallback((idx: number) => setDragIndex(idx), [])
  const handleDragOver = useCallback((e: React.DragEvent, targetMonat: string) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetMonat: string) => {
      e.preventDefault()
      if (dragIndex === null) return

      const snapshot = items
      const updated = items.map((item) =>
        item.index === dragIndex ? { ...item, monat: targetMonat } : item
      )
      setItems(updated)
      setDragIndex(null)

      setSaving(true)
      try {
        const movedItem = updated.find((i) => i.index === dragIndex)
        if (movedItem) {
          const res = await fetch(`/api/projects/${projectId}/results`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: movedItem.index, updates: { monat: targetMonat } }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
        }
      } catch (err: unknown) {
        console.error('[Vysible] Kalender-Verschiebung konnte nicht gespeichert werden:', err)
        setItems(snapshot)
      } finally {
        setSaving(false)
      }
    },
    [dragIndex, items, projectId]
  )

  return (
    <div>
      {/* Legende */}
      <div className="flex flex-wrap gap-3 mb-6 text-xs">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-stone inline-block" /> Ausstehend</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-300 inline-block" /> In Bearbeitung</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Freigegeben</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Veröffentlicht</div>
        {saving && <span className="text-stahlgrau ml-auto">Speichert…</span>}
      </div>

      {/* Monats-Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {months.map((monat) => (
          <div
            key={monat}
            onDragOver={(e) => handleDragOver(e, monat)}
            onDrop={(e) => handleDrop(e, monat)}
            className="bg-white border border-stone rounded-xl p-4 min-h-[120px]"
          >
            <p className="text-sm font-semibold text-nachtblau mb-3">{formatMonth(monat)}</p>
            <div className="space-y-2">
              {getItemsForMonth(monat).map((item) => {
                const color = STATUS_COLORS[item.status] ?? 'gray'
                return (
                  <div
                    key={item.index}
                    draggable
                    onDragStart={() => handleDragStart(item.index)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-grab text-xs ${COLOR_CLASSES[color]} select-none`}
                  >
                    <span className="font-medium flex-shrink-0">{KANAL_LABELS[item.kanal] ?? item.kanal}</span>
                    <span className="truncate">{item.titel}</span>
                  </div>
                )
              })}
              {getItemsForMonth(monat).length === 0 && (
                <p className="text-xs text-stahlgrau italic">Kein Content</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatMonth(monat: string): string {
  const [year, month] = monat.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}
