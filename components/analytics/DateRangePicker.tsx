'use client'

import { useState } from 'react'

export interface DateRange {
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
}

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS = [
  { label: '7 Tage',     days: 7 },
  { label: '28 Tage',    days: 28 },
  { label: '90 Tage',    days: 90 },
  { label: '12 Monate',  days: 365 },
]

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toYMD(d)
}

function today(): string {
  return toYMD(new Date())
}

function labelForRange(range: DateRange): string | null {
  const end = today()
  if (range.endDate !== end) return null
  for (const p of PRESETS) {
    if (range.startDate === daysAgo(p.days)) return p.label
  }
  return null
}

export function DateRangePicker({ value, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState(value.startDate)
  const [customEnd, setCustomEnd] = useState(value.endDate)

  const activePreset = labelForRange(value)

  function applyPreset(days: number) {
    setShowCustom(false)
    onChange({ startDate: daysAgo(days), endDate: today() })
  }

  function applyCustom() {
    if (customStart && customEnd && customStart <= customEnd) {
      onChange({ startDate: customStart, endDate: customEnd })
      setShowCustom(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.days}
          onClick={() => applyPreset(p.days)}
          className={`px-3 py-1.5 text-xs rounded-lg border transition ${
            activePreset === p.label
              ? 'bg-nachtblau text-creme border-nachtblau font-medium'
              : 'bg-white text-stahlgrau border-stone hover:border-nachtblau hover:text-nachtblau'
          }`}
        >
          {p.label}
        </button>
      ))}

      <button
        onClick={() => setShowCustom((v) => !v)}
        className={`px-3 py-1.5 text-xs rounded-lg border transition ${
          showCustom || (!activePreset)
            ? 'bg-nachtblau text-creme border-nachtblau font-medium'
            : 'bg-white text-stahlgrau border-stone hover:border-nachtblau hover:text-nachtblau'
        }`}
      >
        Benutzerdefiniert
      </button>

      {!activePreset && !showCustom && (
        <span className="text-xs text-stahlgrau">
          {value.startDate} – {value.endDate}
        </span>
      )}

      {showCustom && (
        <div className="flex items-center gap-2 mt-1 w-full sm:w-auto sm:mt-0">
          <input
            type="date"
            value={customStart}
            max={customEnd || today()}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1.5 text-xs border border-stone rounded-lg focus:outline-none focus:ring-1 focus:ring-cognac"
          />
          <span className="text-xs text-stahlgrau">bis</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            max={today()}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1.5 text-xs border border-stone rounded-lg focus:outline-none focus:ring-1 focus:ring-cognac"
          />
          <button
            onClick={applyCustom}
            disabled={!customStart || !customEnd || customStart > customEnd}
            className="px-3 py-1.5 text-xs bg-cognac text-black font-medium rounded-lg hover:opacity-90 transition disabled:opacity-40"
          >
            Anwenden
          </button>
        </div>
      )}
    </div>
  )
}
