'use client'

import type { WizardData } from './NewProjectWizard'
import type { ChannelQuantities, SocialQuantity } from '@/lib/types/channel-quantities'

const CHANNELS = [
  { id: 'BLOG',              label: 'Blog',        icon: '✍' },
  { id: 'NEWSLETTER',        label: 'Newsletter',  icon: '✉' },
  { id: 'SOCIAL_INSTAGRAM',  label: 'Instagram',   icon: '◈' },
  { id: 'SOCIAL_FACEBOOK',   label: 'Facebook',    icon: '◉' },
  { id: 'SOCIAL_LINKEDIN',   label: 'LinkedIn',    icon: '◆' },
]

const DURATIONS = [3, 6, 12]

const SOCIAL_CHANNELS = ['SOCIAL_INSTAGRAM', 'SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN']

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getDaysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

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

  function updateSimpleQuantity(channelId: string, value: number) {
    const next: ChannelQuantities = {
      ...data.channelQuantities,
      [channelId]: value,
    }
    onChange({ channelQuantities: next })
  }

  function updateSocialQuantity(channelId: string, field: keyof SocialQuantity, value: number) {
    const existing = (data.channelQuantities[channelId as keyof ChannelQuantities] as SocialQuantity | undefined) ?? { posts: 4, stories: 0 }
    const next: ChannelQuantities = {
      ...data.channelQuantities,
      [channelId]: { ...existing, [field]: value },
    }
    onChange({ channelQuantities: next })
  }

  const endLabel = monthOptions.find((m) => m.value === data.planningEnd)?.label ?? data.planningEnd
  const canProceed = data.projectName.trim().length > 0 && data.channels.length > 0
  const daysInStartMonth = getDaysInMonth(data.planningStart)
  const safeDay = Math.min(data.planningStartDay, daysInStartMonth)
  const startDateObj = new Date(
    parseInt(data.planningStart.split('-')[0]),
    parseInt(data.planningStart.split('-')[1]) - 1,
    safeDay,
  )
  const startKw = getISOWeek(startDateObj)

  const activeChannels = CHANNELS.filter((ch) => data.channels.includes(ch.id))

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
                    ? 'border-cognac bg-cognac text-black'
                    : 'border-stone bg-white text-anthrazit hover:border-cognac'
                }`}
              >
                {d} Mo.
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Startdatum (Tag) + KW-Anzeige */}
      <div className="flex items-center gap-4 -mt-1">
        <div className="flex items-center gap-2">
          <label className="text-xs text-stahlgrau whitespace-nowrap">Start am</label>
          <input
            type="number"
            min={1}
            max={daysInStartMonth}
            value={safeDay}
            onChange={(e) => onChange({ planningStartDay: Math.min(daysInStartMonth, Math.max(1, Number(e.target.value))) })}
            className="w-14 px-2 py-1 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac text-center"
          />
          <span className="text-xs text-stahlgrau">. des Monats</span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-cognac bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
          KW {startKw}
        </span>
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
                    ? 'border-cognac bg-cognac text-black font-medium'
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

      {/* Mengenangaben pro Kanal */}
      {activeChannels.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-2">Inhalte pro Monat</label>
          <div className="space-y-2">
            {activeChannels.map((ch) => {
              if (SOCIAL_CHANNELS.includes(ch.id)) {
                const sq = (data.channelQuantities[ch.id as keyof ChannelQuantities] as SocialQuantity | undefined) ?? { posts: 4, stories: 0 }
                return (
                  <div key={ch.id} className="flex items-center gap-3 bg-stone/30 rounded-lg px-3 py-2">
                    <span className="text-xs text-anthrazit font-medium w-24 shrink-0">{ch.icon} {ch.label}</span>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-stahlgrau">Beiträge/Mo.</label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={sq.posts}
                        onChange={(e) => updateSocialQuantity(ch.id, 'posts', Math.min(20, Math.max(0, Number(e.target.value))))}
                        className="w-14 px-2 py-1 text-xs border border-stone rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-cognac text-center"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-stahlgrau">Storys/Mo.</label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={sq.stories}
                        onChange={(e) => updateSocialQuantity(ch.id, 'stories', Math.min(20, Math.max(0, Number(e.target.value))))}
                        className="w-14 px-2 py-1 text-xs border border-stone rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-cognac text-center"
                      />
                    </div>
                  </div>
                )
              }
              // BLOG or NEWSLETTER
              const count = (data.channelQuantities[ch.id as keyof ChannelQuantities] as number | undefined) ?? 1
              return (
                <div key={ch.id} className="flex items-center gap-3 bg-stone/30 rounded-lg px-3 py-2">
                  <span className="text-xs text-anthrazit font-medium w-24 shrink-0">{ch.icon} {ch.label}</span>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-stahlgrau">Artikel/Monat</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={count}
                      onChange={(e) => updateSimpleQuantity(ch.id, Math.min(4, Math.max(1, Number(e.target.value))))}
                      className="w-14 px-2 py-1 text-xs border border-stone rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-cognac text-center"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 text-sm text-stahlgrau hover:text-anthrazit transition">
          ← Zurück
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-2 bg-cognac hover:bg-cognacDark text-black text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Weiter →
        </button>
      </div>
    </div>
  )
}
