'use client'

import { useState } from 'react'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type { StoredTextResult } from '@/lib/generation/results-store'

const CHANNEL_LABELS: Record<string, string> = {
  BLOG: 'Blog',
  NEWSLETTER: 'Newsletter',
  SOCIAL_INSTAGRAM: 'Instagram',
  SOCIAL_FACEBOOK: 'Facebook',
  SOCIAL_LINKEDIN: 'LinkedIn',
}

const CHANNEL_COLORS: Record<string, string> = {
  BLOG:             'bg-stone border border-stahlgrau/30',
  NEWSLETTER:       'bg-emerald-500',
  SOCIAL_INSTAGRAM: 'bg-purple-500',
  SOCIAL_FACEBOOK:  'bg-purple-400',
  SOCIAL_LINKEDIN:  'bg-violet-500',
}

const ALL_CHANNELS = ['BLOG', 'NEWSLETTER', 'SOCIAL_INSTAGRAM', 'SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN']

interface Props {
  projectId: string
  themes: ThemenItem[]
  textResults: StoredTextResult[]
  channels: string[]
}

interface ModalItem {
  theme: ThemenItem
  textResult?: StoredTextResult
}

// ISO-Kalenderwoche (Mo=1 … So=7)
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getMonthKwRange(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const kwStart = getISOWeek(first)
  const kwEnd = getISOWeek(last)
  return kwStart === kwEnd ? `KW ${kwStart}` : `KW ${kwStart}–${kwEnd}`
}

function formatMonatShort(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function getUniqueMonths(themes: ThemenItem[]): string[] {
  const seen: Record<string, boolean> = {}
  for (const t of themes) { seen[t.monat] = true }
  return Object.keys(seen).sort()
}

export function ResultsOverview({ projectId, themes, textResults, channels }: Props) {
  const [modal, setModal] = useState<ModalItem | null>(null)

  const activeChannels = ALL_CHANNELS.filter((ch) => channels.includes(ch))
  const months = getUniqueMonths(themes)

  // Lookup: monat+kanal → ThemenItem[]
  const lookup = new Map<string, ThemenItem[]>()
  for (const t of themes) {
    const key = `${t.monat}::${t.kanal}`
    const existing = lookup.get(key) ?? []
    existing.push(t)
    lookup.set(key, existing)
  }

  function findTextResult(theme: ThemenItem): StoredTextResult | undefined {
    return textResults.find((r) => r.titel === theme.seoTitel && r.monat === theme.monat)
  }

  function hasText(theme: ThemenItem): boolean {
    const r = findTextResult(theme)
    if (!r) return false
    return !!(r.blog ?? r.newsletter ?? r.socialPosts?.length)
  }

  function openModal(theme: ThemenItem) {
    setModal({ theme, textResult: findTextResult(theme) })
  }

  if (months.length === 0) {
    return <p className="text-sm text-stahlgrau py-8 text-center">Keine Themen vorhanden</p>
  }

  const blogThemes = themes.filter((t) => t.kanal === 'BLOG').sort((a, b) => a.monat.localeCompare(b.monat))
  const newsletterThemes = themes.filter((t) => t.kanal === 'NEWSLETTER').sort((a, b) => a.monat.localeCompare(b.monat))

  return (
    <div className="space-y-6">

      {/* Download */}
      <div className="flex justify-end">
        <a
          href={`/api/projects/${projectId}/plans/download`}
          download
          className="text-xs px-3 py-1.5 bg-tiefblau text-white rounded-lg hover:bg-nachtblau transition"
        >
          Alle Pläne als XLSX
        </a>
      </div>

      {/* Blog-Roadmap (wenn Blog aktiv) */}
      {blogThemes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-stahlgrau uppercase tracking-wide mb-3">Blog-Roadmap</p>
          <div className="relative overflow-x-auto pb-2">
            <div className="flex items-center min-w-max px-4">
              {blogThemes.map((theme, idx) => {
                const above = idx % 2 === 0
                const hasT = hasText(theme)
                return (
                  <div key={theme.monat + theme.seoTitel} className="flex items-center">
                    {/* Topic card above/below */}
                    <div className="flex flex-col items-center">
                      {/* Above */}
                      <div className={`w-44 mb-2 ${above ? 'visible' : 'invisible pointer-events-none'}`}>
                        <button
                          onClick={() => openModal(theme)}
                          className="text-left w-full group"
                          tabIndex={above ? 0 : -1}
                        >
                          <p className="text-sm font-semibold text-nachtblau group-hover:text-cognac leading-snug line-clamp-2">
                            {theme.seoTitel}
                          </p>
                          <p className="text-xs text-stahlgrau mt-0.5 line-clamp-2">{theme.contentWinkel}</p>
                          {hasT && (
                            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                              Text
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Timeline node */}
                      <div className="flex flex-col items-center">
                        <div className={`w-px h-6 ${above ? 'bg-stone' : 'bg-transparent'}`} />
                        <button
                          onClick={() => openModal(theme)}
                          className="w-28 h-11 rounded-full border-2 border-nachtblau bg-white hover:bg-nachtblau hover:text-white transition flex flex-col items-center justify-center group"
                        >
                          <span className="text-xs font-bold text-nachtblau group-hover:text-white leading-none">
                            {new Date(parseInt(theme.monat.split('-')[0]), parseInt(theme.monat.split('-')[1]) - 1, 1)
                              .toLocaleDateString('de-DE', { month: 'long' })}
                          </span>
                          <span className="text-[9px] text-stahlgrau group-hover:text-white/80">
                            {getMonthKwRange(theme.monat)}
                          </span>
                        </button>
                        <div className={`w-px h-6 ${!above ? 'bg-stone' : 'bg-transparent'}`} />
                      </div>

                      {/* Below */}
                      <div className={`w-44 mt-2 ${!above ? 'visible' : 'invisible pointer-events-none'}`}>
                        <button
                          onClick={() => openModal(theme)}
                          className="text-left w-full group"
                          tabIndex={!above ? 0 : -1}
                        >
                          <p className="text-sm font-semibold text-nachtblau group-hover:text-cognac leading-snug line-clamp-2">
                            {theme.seoTitel}
                          </p>
                          <p className="text-xs text-stahlgrau mt-0.5 line-clamp-2">{theme.contentWinkel}</p>
                          {hasT && (
                            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                              Text
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Verbindungslinie zum nächsten */}
                    {idx < blogThemes.length - 1 && (
                      <div className="h-px w-8 bg-nachtblau/30 flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Newsletter-Roadmap */}
      {newsletterThemes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-stahlgrau uppercase tracking-wide mb-3">Newsletter-Roadmap</p>
          <div className="relative overflow-x-auto pb-2">
            <div className="flex items-center min-w-max px-4">
              {newsletterThemes.map((theme, idx) => {
                const above = idx % 2 === 0
                const hasT = hasText(theme)
                return (
                  <div key={theme.monat + theme.seoTitel} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-44 mb-2 ${above ? 'visible' : 'invisible pointer-events-none'}`}>
                        <button onClick={() => openModal(theme)} className="text-left w-full group" tabIndex={above ? 0 : -1}>
                          <p className="text-sm font-semibold text-emerald-800 group-hover:text-cognac leading-snug line-clamp-2">
                            {theme.seoTitel}
                          </p>
                          <p className="text-xs text-stahlgrau mt-0.5 line-clamp-2">{theme.contentWinkel}</p>
                          {hasT && (
                            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                              Text
                            </span>
                          )}
                        </button>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className={`w-px h-6 ${above ? 'bg-emerald-200' : 'bg-transparent'}`} />
                        <button
                          onClick={() => openModal(theme)}
                          className="w-28 h-11 rounded-full border-2 border-emerald-600 bg-white hover:bg-emerald-600 hover:text-white transition flex flex-col items-center justify-center group"
                        >
                          <span className="text-xs font-bold text-emerald-700 group-hover:text-white leading-none">
                            {new Date(parseInt(theme.monat.split('-')[0]), parseInt(theme.monat.split('-')[1]) - 1, 1)
                              .toLocaleDateString('de-DE', { month: 'long' })}
                          </span>
                          <span className="text-[9px] text-stahlgrau group-hover:text-white/80">
                            {getMonthKwRange(theme.monat)}
                          </span>
                        </button>
                        <div className={`w-px h-6 ${!above ? 'bg-emerald-200' : 'bg-transparent'}`} />
                      </div>
                      <div className={`w-44 mt-2 ${!above ? 'visible' : 'invisible pointer-events-none'}`}>
                        <button onClick={() => openModal(theme)} className="text-left w-full group" tabIndex={!above ? 0 : -1}>
                          <p className="text-sm font-semibold text-emerald-800 group-hover:text-cognac leading-snug line-clamp-2">
                            {theme.seoTitel}
                          </p>
                          <p className="text-xs text-stahlgrau mt-0.5 line-clamp-2">{theme.contentWinkel}</p>
                          {hasT && (
                            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                              Text
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                    {idx < newsletterThemes.length - 1 && (
                      <div className="h-px w-8 bg-emerald-300/50 flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Redaktionsplan-Tabelle — Monate als Spalten, Kanäle als Zeilen */}
      <div>
        <p className="text-xs font-medium text-stahlgrau uppercase tracking-wide mb-3">Redaktionsplan</p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead>
              {/* Zeile 1: Monatsnamen */}
              <tr>
                <th className="sticky left-0 z-10 bg-white text-left py-2 pr-4 pl-1 text-xs text-stahlgrau font-medium whitespace-nowrap min-w-[120px] border-b-2 border-stone">
                  Kanal
                </th>
                {months.map((m) => (
                  <th
                    key={m}
                    className="text-left py-2 px-3 text-xs font-bold text-nachtblau whitespace-nowrap border-b-2 border-stone min-w-[160px]"
                  >
                    {formatMonatShort(m)}
                    <span className="block text-[10px] font-normal text-stahlgrau mt-0.5">
                      {getMonthKwRange(m)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeChannels.map((ch) => (
                <tr key={ch} className="border-b border-stone/40 align-top">
                  {/* Kanalname (sticky) */}
                  <td className="sticky left-0 z-10 bg-white py-3 pr-4 pl-1 text-xs font-semibold text-anthrazit whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${CHANNEL_COLORS[ch] ?? 'bg-stone'}`} />
                      {CHANNEL_LABELS[ch] ?? ch}
                    </span>
                  </td>

                  {/* Eine Zelle pro Monat */}
                  {months.map((monat) => {
                    const items = lookup.get(`${monat}::${ch}`) ?? []
                    if (items.length === 0) {
                      return (
                        <td key={monat} className="py-3 px-3 text-stahlgrau/30 text-sm">
                          —
                        </td>
                      )
                    }
                    return (
                      <td key={monat} className="py-3 px-3">
                        <div className="flex flex-col gap-1.5">
                          {items.map((theme, idx) => (
                            <button
                              key={idx}
                              onClick={() => openModal(theme)}
                              className="text-left group w-full"
                            >
                              <div className="rounded-lg border border-stone bg-white px-2.5 py-1.5 hover:border-cognac hover:bg-amber-50/40 transition">
                                <p className="text-xs font-medium text-anthrazit leading-snug group-hover:text-nachtblau line-clamp-2">
                                  {theme.seoTitel}
                                </p>
                                <div className="mt-1 flex items-center gap-1.5">
                                  {hasText(theme) ? (
                                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                      Text ✓
                                    </span>
                                  ) : (
                                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-stone text-stahlgrau">
                                      Offen
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <OverviewModal item={modal} onClose={() => setModal(null)} />}
    </div>
  )
}

function OverviewModal({ item, onClose }: { item: ModalItem; onClose: () => void }) {
  const { theme, textResult } = item

  function getTextContent(): string | null {
    if (!textResult) return null
    if (textResult.blog?.html) return textResult.blog.html
    if (textResult.newsletter?.body) return textResult.newsletter.body
    if (textResult.socialPosts?.length)
      return textResult.socialPosts.map((p) => `[${p.kanal}]\n${p.text}`).join('\n\n')
    return null
  }

  const textContent = getTextContent()
  const isBlogHtml = !!(textResult?.blog?.html)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-white w-full sm:w-[560px] h-full sm:h-auto sm:max-h-[90vh] sm:rounded-l-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-stone flex-shrink-0">
          <div>
            <p className="text-xs text-stahlgrau mb-0.5">
              {formatMonatShort(theme.monat)} · {getMonthKwRange(theme.monat)} · {CHANNEL_LABELS[theme.kanal] ?? theme.kanal}
            </p>
            <h2 className="text-base font-bold text-nachtblau leading-snug">{theme.seoTitel}</h2>
          </div>
          <button onClick={onClose} className="ml-4 p-1.5 rounded-lg hover:bg-stone transition text-stahlgrau">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoField label="Thema" value={theme.thema} />
            <InfoField label="Kategorie" value={theme.kategorie} />
            <InfoField label="Keyword" value={theme.keywordPrimaer} />
            <InfoField label="Funnel" value={theme.funnelStufe} />
            <InfoField label="Zielgruppe" value={theme.zielgruppe} />
            <InfoField label="Priorität" value={theme.prioritaet} />
            {theme.contentWinkel && <InfoField label="Content-Winkel" value={theme.contentWinkel} />}
            {theme.cta && <InfoField label="CTA" value={theme.cta} />}
          </div>

          {theme.paaFragen.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stahlgrau mb-1.5">Häufige Fragen (PAA)</p>
              <ul className="space-y-1">
                {theme.paaFragen.map((q, i) => (
                  <li key={i} className="text-xs text-anthrazit bg-stone/40 rounded-lg px-3 py-1.5">{q}</li>
                ))}
              </ul>
            </div>
          )}

          {textContent ? (
            <div>
              <p className="text-xs font-medium text-stahlgrau mb-1.5">Generierter Inhalt</p>
              {isBlogHtml ? (
                <div
                  className="prose prose-sm max-w-none text-sm border border-stone rounded-xl p-4 bg-stone/10"
                  dangerouslySetInnerHTML={{ __html: textContent }}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-xs text-anthrazit border border-stone rounded-xl p-4 bg-stone/10 font-sans leading-relaxed">
                  {textContent}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-xs text-stahlgrau italic bg-stone/30 rounded-xl px-4 py-3">
              Noch kein Text generiert.
            </p>
          )}
        </div>

        <div className="flex-shrink-0 px-5 py-3 border-t border-stone flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-stone hover:bg-stone/70 text-anthrazit transition"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-stahlgrau uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-anthrazit">{value}</p>
    </div>
  )
}
