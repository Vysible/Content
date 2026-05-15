'use client'

import { useState, useCallback, useRef } from 'react'
import { EditorView, type SaveState } from '@/components/editor/EditorView'
import { SeoPanel } from '@/components/editor/SeoPanel'
import { WordPressDraftButton } from '@/components/results/WordPressDraftButton'
import { KlickTippButton } from '@/components/results/KlickTippButton'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type {
  StoredTextResult,
  BlogStatus,
  NewsletterStatus,
  SocialStatus,
} from '@/lib/generation/results-store'
import {
  BLOG_STATUS_LABELS,
  NEWSLETTER_STATUS_LABELS,
  SOCIAL_STATUS_LABELS,
} from '@/lib/generation/results-store'

type Tab = 'themen' | 'blog' | 'newsletter' | 'social' | 'textentwuerfe' | 'bildbriefings'
type SortKey = 'monat' | 'funnel' | 'hwg' | 'kanal'

interface Props {
  projectId: string
  themes: ThemenItem[]
  textResults: StoredTextResult[]
  channels: string[]
  wpConfigured?: boolean
  ktConfigured?: boolean
  hwgFlag?: string
}

export function ResultsTabs({ projectId, themes, textResults, channels, wpConfigured = false, ktConfigured = false, hwgFlag }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('themen')
  const [results, setResults] = useState<StoredTextResult[]>(textResults)
  const [sort, setSort] = useState<SortKey>('monat')
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({})
  const debounceRefs = useRef<Record<number, ReturnType<typeof setTimeout> | null>>({})
  const idleRefs = useRef<Record<number, ReturnType<typeof setTimeout> | null>>({})

  const setSaveState = useCallback((index: number, state: SaveState) => {
    setSaveStates((prev) => ({ ...prev, [index]: state }))
  }, [])

  const autosave = useCallback(
    (index: number, updates: Partial<StoredTextResult>) => {
      setResults((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], ...updates }
        return next
      })
      setSaveState(index, 'saving')

      if (debounceRefs.current[index]) clearTimeout(debounceRefs.current[index]!)
      debounceRefs.current[index] = setTimeout(async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/results`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index, updates }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          setSaveState(index, 'saved')
          if (idleRefs.current[index]) clearTimeout(idleRefs.current[index]!)
          idleRefs.current[index] = setTimeout(() => setSaveState(index, 'idle'), 2_000)
        } catch (err: unknown) {
          console.warn('[Vysible] Autosave fehlgeschlagen:', err)
          setSaveState(index, 'error')
        }
      }, 5_000)
    },
    [projectId, setSaveState]
  )

  const isAnySaving = Object.values(saveStates).some((s) => s === 'saving')

  const hasSocial = channels.some((c) => c.startsWith('SOCIAL_'))

  const tabs: { key: Tab; label: string }[] = [
    { key: 'themen', label: 'Themenübersicht' },
    { key: 'blog', label: 'Blog' },
    { key: 'newsletter', label: 'Newsletter' },
    ...(hasSocial ? [{ key: 'social' as Tab, label: 'Social Media' }] : []),
    { key: 'textentwuerfe', label: 'Textentwürfe' },
    { key: 'bildbriefings', label: 'Bildbriefings' },
  ]

  const sortedThemes = [...themes].sort((a, b) => {
    if (sort === 'monat') return a.monat.localeCompare(b.monat)
    if (sort === 'funnel') return a.funnelStufe.localeCompare(b.funnelStufe)
    if (sort === 'hwg') return a.hwgFlag.localeCompare(b.hwgFlag)
    if (sort === 'kanal') return a.kanal.localeCompare(b.kanal)
    return 0
  })

  return (
    <div>
      {/* Tab-Navigation */}
      <div className="flex gap-1 border-b border-stone mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition -mb-px ${
              activeTab === t.key
                ? 'border-tiefblau text-tiefblau'
                : 'border-transparent text-stahlgrau hover:text-anthrazit'
            }`}
          >
            {t.label}
          </button>
        ))}
        {isAnySaving && (
          <span className="ml-auto text-xs text-stahlgrau self-center pr-2">Speichert…</span>
        )}
      </div>

      {activeTab === 'themen' && (
        <ThemenTab themes={sortedThemes} sort={sort} setSort={setSort} />
      )}
      {activeTab === 'blog' && (
        <BlogTab
          projectId={projectId}
          results={results.filter((r) => r.blog)}
          onUpdate={(index, updates) => autosave(index, updates)}
          saveStates={saveStates}
          allResults={results}
          wpConfigured={wpConfigured}
          hwgFlag={hwgFlag}
        />
      )}
      {activeTab === 'newsletter' && (
        <NewsletterTab
          projectId={projectId}
          results={results.filter((r) => r.newsletter)}
          onUpdate={(index, updates) => autosave(index, updates)}
          saveStates={saveStates}
          allResults={results}
          ktConfigured={ktConfigured}
          hwgFlag={hwgFlag}
        />
      )}
      {activeTab === 'social' && (
        <SocialTab
          results={results.filter((r) => r.socialPosts?.length)}
          onUpdate={(index, updates) => autosave(index, updates)}
          allResults={results}
        />
      )}
      {activeTab === 'textentwuerfe' && (
        <TextentwuerfeTab results={results} />
      )}
      {activeTab === 'bildbriefings' && (
        <ImageBriefTab results={results} />
      )}
    </div>
  )
}

// ── Themenübersicht ───────────────────────────────────────────────────────────

function ThemenTab({
  themes,
  sort,
  setSort,
}: {
  themes: ThemenItem[]
  sort: SortKey
  setSort: (k: SortKey) => void
}) {
  const HWG_COLORS: Record<string, string> = {
    gruen: 'bg-green-100 text-green-700',
    gelb: 'bg-amber-100 text-amber-700',
    rot: 'bg-red-100 text-red-700',
  }
  const KANAL_LABELS: Record<string, string> = {
    BLOG: 'Blog',
    NEWSLETTER: 'Newsletter',
    SOCIAL_INSTAGRAM: 'Instagram',
    SOCIAL_FACEBOOK: 'Facebook',
    SOCIAL_LINKEDIN: 'LinkedIn',
  }

  const SortButton = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => setSort(k)}
      className={`text-xs px-2 py-1 rounded transition ${
        sort === k ? 'bg-tiefblau text-white' : 'bg-stone text-stahlgrau hover:bg-stone/70'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="text-xs text-stahlgrau self-center">Sortieren:</span>
        <SortButton k="monat" label="Monat" />
        <SortButton k="funnel" label="Funnel" />
        <SortButton k="hwg" label="HWG" />
        <SortButton k="kanal" label="Kanal" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone">
              <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Monat</th>
              <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Titel</th>
              <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Kanal</th>
              <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Funnel</th>
              <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">HWG</th>
              <th className="text-left py-2 text-xs text-stahlgrau font-medium">Keyword</th>
            </tr>
          </thead>
          <tbody>
            {themes.map((t, i) => (
              <tr key={i} className="border-b border-stone/50 hover:bg-stone/30">
                <td className="py-2 pr-4 text-stahlgrau whitespace-nowrap">{t.monat}</td>
                <td className="py-2 pr-4 font-medium">{t.seoTitel}</td>
                <td className="py-2 pr-4">
                  <span className="text-xs bg-stone px-2 py-0.5 rounded-full">
                    {KANAL_LABELS[t.kanal] ?? t.kanal}
                  </span>
                </td>
                <td className="py-2 pr-4 text-stahlgrau">{t.funnelStufe}</td>
                <td className="py-2 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${HWG_COLORS[t.hwgFlag] ?? ''}`}>
                    {t.hwgFlag}
                  </span>
                </td>
                <td className="py-2 text-stahlgrau text-xs">{t.keywordPrimaer}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {themes.length === 0 && (
          <p className="text-sm text-stahlgrau py-8 text-center">Keine Themen vorhanden</p>
        )}
      </div>
    </div>
  )
}

// ── Blog ──────────────────────────────────────────────────────────────────────

function BlogTab({
  projectId,
  results,
  allResults,
  saveStates,
  onUpdate,
  wpConfigured,
  hwgFlag,
}: {
  projectId: string
  results: StoredTextResult[]
  allResults: StoredTextResult[]
  saveStates: Record<number, SaveState>
  onUpdate: (index: number, updates: Partial<StoredTextResult>) => void
  wpConfigured: boolean
  hwgFlag?: string
}) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [seoOpen, setSeoOpen] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {results.map((r) => {
        const globalIndex = allResults.indexOf(r)
        const isOpen = expanded === globalIndex
        const isSeoOpen = seoOpen === globalIndex

        return (
          <div key={globalIndex} className="bg-white border border-stone rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone/20"
              onClick={() => setExpanded(isOpen ? null : globalIndex)}
            >
              <div>
                <p className="font-medium text-sm">{r.titel}</p>
                <p className="text-xs text-stahlgrau">{r.monat} · {r.blog?.wordCount ?? 0} Wörter</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusSelect
                  value={r.blogStatus ?? 'ausstehend'}
                  options={BLOG_STATUS_LABELS}
                  onChange={(v) => onUpdate(globalIndex, { blogStatus: v as BlogStatus })}
                />
                <span className="text-stahlgrau text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && r.blog && (
              <div className="border-t border-stone">
                <EditorView
                  projectId={projectId}
                  index={globalIndex}
                  result={r}
                  versionField="blog"
                  initialContent={r.blog.html}
                  saveState={saveStates[globalIndex] ?? 'idle'}
                  articleTitle={r.titel}
                  onUpdate={(updates) => onUpdate(globalIndex, updates)}
                />
                <div className="px-4 pb-4 flex items-center gap-3 flex-wrap">
                  <WordPressDraftButton
                    projectId={projectId}
                    blogMarkdown=""
                    blogHtml={r.blog.html}
                    wpConfigured={wpConfigured}
                    hwgFlag={hwgFlag}
                    initialStatus={r.blogStatus === 'in_wordpress' ? 'in_wordpress' : 'ausstehend'}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); setSeoOpen(isSeoOpen ? null : globalIndex) }}
                    className="text-xs text-tiefblau hover:underline"
                  >
                    {isSeoOpen ? 'SEO schließen' : 'SEO-Analyse'}
                  </button>
                </div>
                {isSeoOpen && (
                  <div className="border-t border-stone">
                    <SeoPanel
                      title={r.blog.titel}
                      html={r.blog.html}
                      defaultKeyword={r.blog.keyword ?? ''}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {results.length === 0 && (
        <p className="text-sm text-stahlgrau py-8 text-center">Keine Blog-Beiträge vorhanden</p>
      )}
    </div>
  )
}

// ── Newsletter ────────────────────────────────────────────────────────────────

function NewsletterTab({
  projectId,
  results,
  allResults,
  saveStates,
  onUpdate,
  ktConfigured,
  hwgFlag,
}: {
  projectId: string
  results: StoredTextResult[]
  allResults: StoredTextResult[]
  saveStates: Record<number, SaveState>
  onUpdate: (index: number, updates: Partial<StoredTextResult>) => void
  ktConfigured: boolean
  hwgFlag?: string
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {results.map((r) => {
        const globalIndex = allResults.indexOf(r)
        const isOpen = expanded === globalIndex
        const nl = r.newsletter!

        return (
          <div key={globalIndex} className="bg-white border border-stone rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone/20"
              onClick={() => setExpanded(isOpen ? null : globalIndex)}
            >
              <div>
                <p className="font-medium text-sm">{r.titel}</p>
                <p className="text-xs text-stahlgrau">{r.monat}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusSelect
                  value={r.newsletterStatus ?? 'ausstehend'}
                  options={NEWSLETTER_STATUS_LABELS}
                  onChange={(v) =>
                    onUpdate(globalIndex, { newsletterStatus: v as NewsletterStatus })
                  }
                />
                <span className="text-stahlgrau text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-stone p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Betreff A">
                    <input
                      className="w-full text-sm border border-stone rounded-lg px-3 py-1.5 focus:outline-none focus:border-tiefblau"
                      defaultValue={nl.betreffA}
                      onChange={(e) =>
                        onUpdate(globalIndex, {
                          newsletter: { ...nl, betreffA: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="Betreff B">
                    <input
                      className="w-full text-sm border border-stone rounded-lg px-3 py-1.5 focus:outline-none focus:border-tiefblau"
                      defaultValue={nl.betreffB}
                      onChange={(e) =>
                        onUpdate(globalIndex, {
                          newsletter: { ...nl, betreffB: e.target.value },
                        })
                      }
                    />
                  </Field>
                </div>
                <Field label={`Preheader (${nl.preheader.length}/100)`}>
                  <input
                    className="w-full text-sm border border-stone rounded-lg px-3 py-1.5 focus:outline-none focus:border-tiefblau"
                    defaultValue={nl.preheader}
                    maxLength={100}
                    onChange={(e) =>
                      onUpdate(globalIndex, {
                        newsletter: { ...nl, preheader: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Body (Rich-Text + KI-Chat)">
                  <EditorView
                    projectId={projectId}
                    index={globalIndex}
                    result={r}
                    versionField="newsletter"
                    initialContent={nl.body}
                    saveState={saveStates[globalIndex] ?? 'idle'}
                    articleTitle={r.titel}
                    onUpdate={(updates) => onUpdate(globalIndex, updates)}
                  />
                </Field>
                <div className="pt-2">
                  <KlickTippButton
                    projectId={projectId}
                    subjectA={nl.betreffA}
                    subjectB={nl.betreffB}
                    preheader={nl.preheader}
                    newsletterMarkdown={nl.body}
                    ktConfigured={ktConfigured}
                    hwgFlag={hwgFlag}
                    initialStatus={
                      r.newsletterStatus === 'kt_kampagne' ? 'kt_kampagne' : 'ausstehend'
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
      {results.length === 0 && (
        <p className="text-sm text-stahlgrau py-8 text-center">Keine Newsletter vorhanden</p>
      )}
    </div>
  )
}

// ── Social ────────────────────────────────────────────────────────────────────

const KANAL_LABELS: Record<string, string> = {
  SOCIAL_INSTAGRAM: 'Instagram',
  SOCIAL_FACEBOOK: 'Facebook',
  SOCIAL_LINKEDIN: 'LinkedIn',
}
const CHAR_LIMITS: Record<string, number> = {
  SOCIAL_INSTAGRAM: 200,
  SOCIAL_FACEBOOK: 80,
  SOCIAL_LINKEDIN: 700,
}

function SocialTab({
  results,
  allResults,
  onUpdate,
}: {
  results: StoredTextResult[]
  allResults: StoredTextResult[]
  onUpdate: (index: number, updates: Partial<StoredTextResult>) => void
}) {
  return (
    <div className="space-y-4">
      {results.map((r) => {
        const globalIndex = allResults.indexOf(r)

        return (
          <div key={globalIndex} className="bg-white border border-stone rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-sm">{r.titel}</p>
                <p className="text-xs text-stahlgrau">{r.monat}</p>
              </div>
              <StatusSelect
                value={r.socialStatus ?? 'ausstehend'}
                options={SOCIAL_STATUS_LABELS}
                onChange={(v) => onUpdate(globalIndex, { socialStatus: v as SocialStatus })}
              />
            </div>

            <div className="space-y-3">
              {r.socialPosts?.map((post, pi) => {
                const limit = CHAR_LIMITS[post.kanal] ?? 999
                const count = post.text.length
                const overLimit = count > limit

                return (
                  <div key={pi}>
                    <p className="text-xs font-medium text-stahlgrau mb-1">
                      {KANAL_LABELS[post.kanal] ?? post.kanal}
                      <span className={`ml-2 ${overLimit ? 'text-red-600' : ''}`}>
                        {count}/{limit}
                      </span>
                    </p>
                    <textarea
                      className={`w-full text-sm border rounded-lg p-3 min-h-[80px] focus:outline-none ${
                        overLimit ? 'border-red-300 focus:border-red-500' : 'border-stone focus:border-tiefblau'
                      }`}
                      defaultValue={post.text}
                      onChange={(e) => {
                        const updatedPosts = [...(r.socialPosts ?? [])]
                        updatedPosts[pi] = { ...post, text: e.target.value }
                        onUpdate(globalIndex, { socialPosts: updatedPosts })
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      {results.length === 0 && (
        <p className="text-sm text-stahlgrau py-8 text-center">Keine Social-Posts vorhanden</p>
      )}
    </div>
  )
}

// ── Textentwürfe ──────────────────────────────────────────────────────────────

function TextentwuerfeTab({ results }: { results: StoredTextResult[] }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const withText = results.filter((r) => r.blog ?? r.newsletter)

  return (
    <div className="space-y-3">
      {withText.map((r, i) => {
        const isOpen = expanded === i
        const preview = r.blog
          ? r.blog.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
          : r.newsletter?.body.slice(0, 200) ?? ''

        return (
          <div key={i} className="bg-white border border-stone rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone/20"
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              <div>
                <p className="font-medium text-sm">{r.titel}</p>
                <p className="text-xs text-stahlgrau">
                  {r.monat} · {r.blog ? 'Blog' : 'Newsletter'} · {r.blog ? `${r.blog.wordCount} Wörter` : ''}
                </p>
              </div>
              <span className="text-stahlgrau text-xs ml-4">{isOpen ? '▲' : '▼'}</span>
            </div>
            {!isOpen && (
              <p className="px-4 pb-3 text-xs text-stahlgrau line-clamp-2">{preview}…</p>
            )}
            {isOpen && (
              <div className="border-t border-stone p-4">
                {r.blog && (
                  <div
                    className="prose prose-sm max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: r.blog.html }}
                  />
                )}
                {r.newsletter && !r.blog && (
                  <div className="whitespace-pre-wrap text-sm text-anthrazit">{r.newsletter.body}</div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {withText.length === 0 && (
        <p className="text-sm text-stahlgrau py-8 text-center">Keine Textentwürfe vorhanden</p>
      )}
    </div>
  )
}

// ── Bildbriefings ─────────────────────────────────────────────────────────────

function ImageBriefTab({ results }: { results: StoredTextResult[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {results.map((r, i) => {
        const brief = r.imageBrief
        if (!brief) return null

        return (
          <div key={i} className="bg-white border border-stone rounded-xl p-4">
            <p className="font-medium text-sm mb-1">{r.titel}</p>
            <p className="text-xs text-stahlgrau mb-3">{r.monat} · {r.kanal}</p>
            <div className="space-y-2 text-sm">
              <BriefRow label="Motiv" value={brief.motiv} />
              <BriefRow label="Stil" value={brief.stil} />
              <BriefRow label="Farbwelt" value={brief.farbwelt} />
              <BriefRow label="Textoverlay" value={brief.textoverlay} />
              <BriefRow label="Canva-Empfehlung" value={brief.canvaAssetEmpfehlung} />
              {brief.hwgHinweis && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  HWG: {brief.hwgHinweis}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {results.length === 0 && (
        <p className="text-sm text-stahlgrau py-8 text-center col-span-2">Keine Bildbriefings vorhanden</p>
      )}
    </div>
  )
}

// ── Hilfselemente ─────────────────────────────────────────────────────────────

function StatusSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Record<T, string>
  onChange: (v: T) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      onClick={(e) => e.stopPropagation()}
      className="text-xs border border-stone rounded-lg px-2 py-1 bg-white text-anthrazit focus:outline-none focus:border-tiefblau"
    >
      {(Object.entries(options) as [T, string][]).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-stahlgrau mb-1">{label}</p>
      {children}
    </div>
  )
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs text-stahlgrau w-32 flex-shrink-0">{label}</span>
      <span className="text-xs">{value}</span>
    </div>
  )
}
