'use client'

import type { WizardData } from './NewProjectWizard'

const CHANNELS = [
  { id: 'BLOG',              label: 'Blog',        icon: '✍' },
  { id: 'NEWSLETTER',        label: 'Newsletter',  icon: '✉' },
  { id: 'SOCIAL_INSTAGRAM',  label: 'Instagram',   icon: '◈' },
  { id: 'SOCIAL_FACEBOOK',   label: 'Facebook',    icon: '◉' },
  { id: 'SOCIAL_LINKEDIN',   label: 'LinkedIn',    icon: '◆' },
]

const DURATIONS = [3, 6, 12]

// Erzeugt Monate ab aktuellem Monat für die nächsten 24 Monate
function getMonthOptions(): { value: string; label: string }[] {
  const options = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const value = d.toISOString().slice(0, 7) // "2026-05"
    const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

interface Step2Props {
  data: WizardData
  onChange: (updates: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}

export function Step2Planning({ data, onChange, onNext, onBack }: Step2Props) {
  const monthOptions = getMonthOptions()

  function handleStartChange(value: string) {
    const [year, month] = value.split('-').map(Number)
    const endDate = new Date(year, month - 1 + data.durationMonths, 0) // last day of end month
    onChange({
      planningStart: value,
      planningEnd: endDate.toISOString().slice(0, 7),
    })
  }

  function handleDurationChange(months: number) {
    const [year, month] = data.planningStart.split('-').map(Number)
    const endDate = new Date(year, month - 1 + months, 0)
    onChange({
      durationMonths: months,
      planningEnd: endDate.toISOString().slice(0, 7),
    })
  }

  function toggleChannel(id: string) {
    const current = data.channels
    const updated = current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
    onChange({ channels: updated })
  }

  const endLabel = monthOptions.find((m) => m.value === data.planningEnd)?.label ?? data.planningEnd
  const canProceed = data.projectName.trim().length > 0 && data.channels.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-nachtblau mb-1">Schritt 2: Planung</h2>
        <p className="text-sm text-stahlgrau">Projektname, Zeitraum und Kanäle festlegen.</p>
      </div>

      {/* Projektname */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">Projektname</label>
        <input
          type="text"
          value={data.projectName}
          onChange={(e) => onChange({ projectName: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac"
        />
      </div>

      {/* Planungszeitraum */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-1">Startmonat</label>
          <select
            value={data.planningStart}
            onChange={(e) => handleStartChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-1">Laufzeit</label>
          <div className="flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => handleDurationChange(d)}
                className={`flex-1 py-2 text-sm rounded-lg border transition font-medium ${
                  data.durationMonths === d
                    ? 'border-cognac bg-cognac text-white'
                    : 'border-stone bg-white text-anthrazit hover:border-cognac'
                }`}
              >
                {d} Mo.
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-stahlgrau -mt-2">
        Zeitraum: {monthOptions.find((m) => m.value === data.planningStart)?.label} – {endLabel}
      </p>

      {/* Kanal-Auswahl */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-2">Kanäle</label>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((ch) => {
            const active = data.channels.includes(ch.id)
            return (
              <button
                key={ch.id}
                onClick={() => toggleChannel(ch.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition ${
                  active
                    ? 'border-cognac bg-cognac text-white font-medium'
                    : 'border-stone bg-white text-anthrazit hover:border-cognac'
                }`}
              >
                <span>{ch.icon}</span>
                {ch.label}
              </button>
            )
          })}
        </div>
        {data.channels.length === 0 && (
          <p className="text-xs text-bordeaux mt-1">Mindestens einen Kanal auswählen.</p>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 text-sm text-stahlgrau hover:text-anthrazit transition">
          ← Zurück
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-2 bg-cognac hover:bg-cognacDark text-white text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Weiter →
        </button>
      </div>
    </div>
  )
}
