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

function formatMonat(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function getUniqueMonths(themes: ThemenItem[]): string[] {
  const seen: Record<string, boolean> = {}
  for (const t of themes) { seen[t.monat] = true }
  return Object.keys(seen).sort()
}

export function ResultsOverview({ themes, textResults, channels }: Props) {
  const [modal, setModal] = useState<ModalItem | null>(null)

  const activeChannels = ALL_CHANNELS.filter((ch) => channels.includes(ch))
  const months = getUniqueMonths(themes)

  // Build lookup: monat+kanal → [ThemenItem, ...]
  const lookup = new Map<string, ThemenItem[]>()
  for (const t of themes) {
    const key = `${t.monat}::${t.kanal}`
    const existing = lookup.get(key) ?? []
    existing.push(t)
    lookup.set(key, existing)
  }

  // Build textResult lookup by seoTitel + monat
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
    return (
      <p className="text-sm text-stahlgrau py-8 text-center">Keine Themen vorhanden</p>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-stone">
              <th className="text-left py-2 pr-4 pl-1 text-xs text-stahlgrau font-medium whitespace-nowrap w-28">
                Monat
              </th>
              {activeChannels.map((ch) => (
                <th
                  key={ch}
                  className="text-left py-2 px-3 text-xs text-stahlgrau font-medium whitespace-nowrap"
                >
                  {CHANNEL_LABELS[ch] ?? ch}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((monat) => (
              <tr key={monat} className="border-b border-stone/50 align-top">
                <td className="py-3 pr-4 pl-1 text-xs text-stahlgrau whitespace-nowrap font-medium">
                  {formatMonat(monat)}
                </td>
                {activeChannels.map((ch) => {
                  const items = lookup.get(`${monat}::${ch}`) ?? []
                  if (items.length === 0) {
                    return (
                      <td key={ch} className="py-3 px-3 text-stahlgrau/40 text-center text-sm">
                        —
                      </td>
                    )
                  }
                  return (
                    <td key={ch} className="py-3 px-3">
                      <div className="flex flex-col gap-1.5">
                        {items.map((theme, idx) => (
                          <button
                            key={idx}
                            onClick={() => openModal(theme)}
                            className="text-left group"
                          >
                            <div className="rounded-lg border border-stone bg-white px-2.5 py-1.5 hover:border-cognac hover:bg-stone/30 transition">
                              <p className="text-xs font-medium text-anthrazit leading-snug group-hover:text-nachtblau line-clamp-2">
                                {theme.seoTitel}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5">
                                {hasText(theme) ? (
                                  <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                    Text
                                  </span>
                                ) : (
                                  <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-stone text-stahlgrau">
                                    Offen
                                  </span>
                                )}
                                <span className="text-[10px] text-stahlgrau">{theme.thema}</span>
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

      {/* Modal */}
      {modal && (
        <OverviewModal
          item={modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function OverviewModal({ item, onClose }: { item: ModalItem; onClose: () => void }) {
  const { theme, textResult } = item

  function getTextContent(): string | null {
    if (!textResult) return null
    if (textResult.blog?.html) {
      return textResult.blog.html
    }
    if (textResult.newsletter?.body) {
      return textResult.newsletter.body
    }
    if (textResult.socialPosts?.length) {
      return textResult.socialPosts.map((p) => `[${p.kanal}]\n${p.text}`).join('\n\n')
    }
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
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-stone flex-shrink-0">
          <div>
            <p className="text-xs text-stahlgrau mb-0.5">
              {formatMonat(theme.monat)} · {CHANNEL_LABELS[theme.kanal] ?? theme.kanal}
            </p>
            <h2 className="text-base font-bold text-nachtblau leading-snug">{theme.seoTitel}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-lg hover:bg-stone transition text-stahlgrau"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Meta-Infos */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoField label="Thema" value={theme.thema} />
            <InfoField label="Kategorie" value={theme.kategorie} />
            <InfoField label="Keyword" value={theme.keywordPrimaer} />
            <InfoField label="Funnel" value={theme.funnelStufe} />
            <InfoField label="Zielgruppe" value={theme.zielgruppe} />
            <InfoField label="Priorität" value={theme.prioritaet} />
          </div>

          {/* PAA-Fragen */}
          {theme.paaFragen.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stahlgrau mb-1.5">Häufige Fragen (PAA)</p>
              <ul className="space-y-1">
                {theme.paaFragen.map((q, i) => (
                  <li key={i} className="text-xs text-anthrazit bg-stone/40 rounded-lg px-3 py-1.5">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generierter Text */}
          {textContent && (
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
          )}

          {!textContent && (
            <p className="text-xs text-stahlgrau italic bg-stone/30 rounded-xl px-4 py-3">
              Noch kein Text generiert.
            </p>
          )}
        </div>

        {/* Footer */}
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
