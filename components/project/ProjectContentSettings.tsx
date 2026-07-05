'use client'

import { useState, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { DEFAULT_QUANTITIES, NEWSLETTER_RHYTHM_OPTIONS } from '@/lib/types/channel-quantities'
import type { ChannelQuantities, SocialQuantity } from '@/lib/types/channel-quantities'

interface GeplantThema {
  monat: string
  kanal: string
  thema: string
}

const CHANNEL_LABELS: Record<string, string> = {
  BLOG: 'Blog',
  NEWSLETTER: 'Newsletter',
  SOCIAL_INSTAGRAM: 'Instagram',
  SOCIAL_FACEBOOK: 'Facebook',
  SOCIAL_LINKEDIN: 'LinkedIn',
}

const SOCIAL_CHANNELS = new Set(['SOCIAL_INSTAGRAM', 'SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN'])

interface Props {
  projectId: string
  initialKeywords: string[]
  initialThemenPool: string
  initialGeplantThemen: GeplantThema[]
  initialChannelQuantities: ChannelQuantities
  channels: string[]
  planningStart: string
  planningEnd: string
}

function generateMonths(start: string, end: string): string[] {
  const months: string[] = []
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  let y = sy, m = sm
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months
}

function formatMonat(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export function ProjectContentSettings({
  projectId,
  initialKeywords,
  initialThemenPool,
  initialGeplantThemen,
  initialChannelQuantities,
  channels,
  planningStart,
  planningEnd,
}: Props) {
  const [keywords, setKeywords] = useState<string[]>(initialKeywords)
  const [kwInput, setKwInput] = useState('')
  const [themenPool, setThemenPool] = useState(initialThemenPool)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const months = generateMonths(planningStart, planningEnd)

  // geplantThemen: Record<`${monat}::${kanal}`, thema>
  const [geplantThemen, setGeplantThemen] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const t of initialGeplantThemen) {
      if (t.kanal) map[`${t.monat}::${t.kanal}`] = t.thema
    }
    return map
  })

  const [quantities, setQuantities] = useState<ChannelQuantities>(() => ({
    ...DEFAULT_QUANTITIES,
    ...initialChannelQuantities,
  }))

  function addKeyword(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed || keywords.includes(trimmed)) return
    setKeywords((prev) => [...prev, trimmed])
    setKwInput('')
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }

  function handleKwKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword(kwInput)
    } else if (e.key === 'Backspace' && kwInput === '' && keywords.length > 0) {
      setKeywords((prev) => prev.slice(0, -1))
    }
  }

  function handleKwBlur() {
    if (kwInput.trim()) addKeyword(kwInput)
  }

  function getThema(monat: string, kanal: string): string {
    return geplantThemen[`${monat}::${kanal}`] ?? ''
  }

  function setThema(monat: string, kanal: string, thema: string) {
    const key = `${monat}::${kanal}`
    setGeplantThemen(prev => thema ? { ...prev, [key]: thema } : (() => { const n = { ...prev }; delete n[key]; return n })())
  }

  function setSocialQuantity(kanal: string, field: 'posts' | 'stories', value: number) {
    setQuantities(prev => {
      const existing = (prev[kanal as keyof ChannelQuantities] as SocialQuantity | undefined) ?? { posts: 1, stories: 0, postsUnit: 'week' }
      return { ...prev, [kanal]: { ...existing, [field]: value, postsUnit: 'week' } }
    })
  }

  function setSimpleQuantity(kanal: string, value: number) {
    setQuantities(prev => ({ ...prev, [kanal]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const finalKeywords = kwInput.trim()
      ? [...keywords, kwInput.trim()].filter((k, i, a) => a.indexOf(k) === i)
      : keywords
    if (kwInput.trim()) { setKeywords(finalKeywords); setKwInput('') }

    const geplantThemenArr: GeplantThema[] = Object.entries(geplantThemen)
      .filter(([, thema]) => thema.trim())
      .map(([key, thema]) => {
        const [monat, kanal] = key.split('::')
        return { monat: monat ?? '', kanal: kanal ?? '', thema: thema.trim() }
      })
      .filter(t => t.monat && t.kanal)

    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: finalKeywords, themenPool, geplantThemen: geplantThemenArr, channelQuantities: quantities }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3_000)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const activeChannels = ['BLOG', 'NEWSLETTER', 'SOCIAL_INSTAGRAM', 'SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN']
    .filter(ch => channels.includes(ch))

  return (
    <div className="bg-white rounded-2xl border border-stone p-6 space-y-6">

      {/* Keywords */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">
          Keywords <span className="text-stahlgrau font-normal">(optional)</span>
        </label>
        <div
          className="flex flex-wrap gap-1.5 px-3 py-2 border border-stone rounded-lg bg-white focus-within:ring-2 focus-within:ring-bordeaux cursor-text min-h-[42px]"
          onClick={() => inputRef.current?.focus()}
        >
          {keywords.map((kw) => (
            <span key={kw} className="inline-flex items-center gap-1 text-xs bg-stone px-2 py-0.5 rounded-full text-anthrazit">
              {kw}
              <button type="button" onClick={(e) => { e.stopPropagation(); removeKeyword(kw) }} className="text-stahlgrau hover:text-bordeaux leading-none">×</button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyDown={handleKwKeyDown}
            onBlur={handleKwBlur}
            placeholder={keywords.length === 0 ? 'Keyword eingeben, Enter zum Bestätigen …' : ''}
            className="flex-1 min-w-[140px] text-sm bg-transparent focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-stahlgrau">Enter oder Komma zum Hinzufügen. Backspace entfernt das letzte Keyword.</p>
      </div>

      {/* Themen-Pool */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">
          Themen-Pool <span className="text-stahlgrau font-normal">(optional)</span>
        </label>
        <textarea
          value={themenPool}
          onChange={(e) => setThemenPool(e.target.value)}
          rows={4}
          placeholder="Bevorzugte Themen, Saisonales, Aktionen der Praxis …"
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux resize-none"
        />
      </div>

      {/* Mengenplan */}
      {activeChannels.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-2">
            Mengenplan
          </label>
          <div className="border border-stone rounded-lg overflow-hidden divide-y divide-stone/40">
            {activeChannels.map((ch) => {
              const isSocial = SOCIAL_CHANNELS.has(ch)
              return (
                <div key={ch} className="flex items-center gap-4 px-4 py-2.5 bg-white">
                  <span className="text-sm text-anthrazit w-28 shrink-0">{CHANNEL_LABELS[ch] ?? ch}</span>
                  {isSocial ? (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-stahlgrau text-xs">
                        Beiträge/Woche
                        <input
                          type="number"
                          min={0}
                          max={7}
                          value={(quantities[ch as keyof ChannelQuantities] as SocialQuantity | undefined)?.posts ?? 1}
                          onChange={e => setSocialQuantity(ch, 'posts', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-14 px-2 py-1 border border-stone rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-bordeaux"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-stahlgrau text-xs">
                        Storys/Woche
                        <input
                          type="number"
                          min={0}
                          max={7}
                          value={(quantities[ch as keyof ChannelQuantities] as SocialQuantity | undefined)?.stories ?? 0}
                          onChange={e => setSocialQuantity(ch, 'stories', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-14 px-2 py-1 border border-stone rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-bordeaux"
                        />
                      </label>
                    </div>
                  ) : ch === 'NEWSLETTER' ? (
                    <select
                      value={(quantities[ch as keyof ChannelQuantities] as number | undefined) ?? 1}
                      onChange={e => setSimpleQuantity(ch, parseFloat(e.target.value))}
                      className="text-xs px-2 py-1.5 border border-stone rounded focus:outline-none focus:ring-1 focus:ring-bordeaux bg-white"
                    >
                      {NEWSLETTER_RHYTHM_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <label className="flex items-center gap-1.5 text-stahlgrau text-xs">
                      pro Monat
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={(quantities[ch as keyof ChannelQuantities] as number | undefined) ?? 1}
                        onChange={e => setSimpleQuantity(ch, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-14 px-2 py-1 border border-stone rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-bordeaux"
                      />
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bereits abgestimmte Themen — pro Monat & Kanal */}
      {months.length > 0 && activeChannels.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-anthrazit mb-2">
            Bereits abgestimmte Themen <span className="text-stahlgrau font-normal">(verbindlich für die Generierung)</span>
          </label>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-stone rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-stone/40">
                  <th className="text-left px-3 py-2 text-xs font-medium text-stahlgrau whitespace-nowrap min-w-[110px]">Monat</th>
                  {activeChannels.map(ch => (
                    <th key={ch} className="text-left px-3 py-2 text-xs font-medium text-stahlgrau whitespace-nowrap min-w-[160px]">
                      {CHANNEL_LABELS[ch] ?? ch}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((monat, i) => (
                  <tr key={monat} className={`border-t border-stone/40 ${i % 2 === 0 ? 'bg-white' : 'bg-stone/20'}`}>
                    <td className="px-3 py-2 text-xs text-stahlgrau whitespace-nowrap align-middle">{formatMonat(monat)}</td>
                    {activeChannels.map(ch => {
                      const val = getThema(monat, ch)
                      return (
                        <td key={ch} className="px-2 py-1.5 align-middle">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={val}
                              onChange={e => setThema(monat, ch, e.target.value)}
                              placeholder="Thema …"
                              className="flex-1 text-xs bg-transparent focus:outline-none placeholder:text-stone-400 min-w-0"
                            />
                            {val && (
                              <button
                                type="button"
                                onClick={() => setThema(monat, ch, '')}
                                className="text-stahlgrau hover:text-bordeaux text-xs leading-none shrink-0"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-xs text-stahlgrau">Eingetragene Themen werden bei der KI-Generierung verbindlich berücksichtigt.</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-nachtblau text-white text-sm rounded-lg hover:bg-black disabled:opacity-50 transition"
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
        {saved && <p className="text-sm text-green-600">Gespeichert ✓</p>}
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      </div>
    </div>
  )
}
