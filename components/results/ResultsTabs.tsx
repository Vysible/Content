'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { EditorView, type SaveState } from '@/components/editor/EditorView'
import { SeoScoreCard } from '@/components/results/SeoScoreCard'
import { WordPressDraftButton } from '@/components/results/WordPressDraftButton'
import { KlickTippButton } from '@/components/results/KlickTippButton'
import { SocialPostButton } from '@/components/results/SocialPostButton'
import { ImageBriefCard } from '@/components/results/ImageBriefCard'
import { RegenerateButton } from '@/components/results/RegenerateButton'
import { ResultsOverview } from '@/components/results/ResultsOverview'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type {
  StoredTextResult,
  StoredSeoResult,
  BlogStatus,
  NewsletterStatus,
  SocialStatus,
} from '@/lib/generation/results-store'
import {
  BLOG_STATUS_LABELS,
  NEWSLETTER_STATUS_LABELS,
  SOCIAL_STATUS_LABELS,
} from '@/lib/generation/results-store'

type Tab = 'uebersicht' | 'blog' | 'newsletter' | 'social' | 'bildbriefings' | 'plaene'
type SortKey = 'monat' | 'funnel' | 'hwg' | 'kanal'

interface Props {
  projectId: string
  themes: ThemenItem[]
  textResults: StoredTextResult[]
  channels: string[]
  wpConfigured?: boolean
  ktConfigured?: boolean
  metaConfigured?: boolean
  linkedInConfigured?: boolean
  hwgFlag?: string
}

export function ResultsTabs({ projectId, themes, textResults, channels, wpConfigured = false, ktConfigured = false, metaConfigured = false, linkedInConfigured = false, hwgFlag }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('uebersicht')
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
    { key: 'uebersicht', label: 'Übersicht' },
    { key: 'blog', label: 'Blog' },
    { key: 'newsletter', label: 'Newsletter' },
    ...(hasSocial ? [{ key: 'social' as Tab, label: 'Social Media' }] : []),
    { key: 'bildbriefings', label: 'Bildbriefings' },
    { key: 'plaene', label: 'Pläne & Downloads' },
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

      {activeTab === 'uebersicht' && (
        <ResultsOverview
          projectId={projectId}
          themes={themes}
          textResults={results}
          channels={channels}
        />
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
          projectId={projectId}
          results={results.filter((r) => r.socialPosts?.length)}
          onUpdate={(index, updates) => autosave(index, updates)}
          allResults={results}
          metaConfigured={metaConfigured}
          linkedInConfigured={linkedInConfigured}
        />
      )}
      {activeTab === 'bildbriefings' && (
        <ImageBriefTab results={results} projectId={projectId} />
      )}
      {activeTab === 'plaene' && (
        <PlaeneTab projectId={projectId} themes={themes} results={results} />
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
                {!r.blog && (
                  <RegenerateButton
                    projectId={projectId}
                    monat={r.monat}
                    missing
                    onSuccess={(result) => onUpdate(globalIndex, result)}
                  />
                )}
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
                    {isSeoOpen ? 'SEO-Analyse schließen ▲' : `SEO-Analyse ${r.seo ? '▼' : '+'}`}
                  </button>
                  <RegenerateButton
                    projectId={projectId}
                    monat={r.monat}
                    onSuccess={(result) => onUpdate(globalIndex, result)}
                  />
                </div>
                {isSeoOpen && (
                  <div className="border-t border-stone">
                    <SeoScoreCard
                      projectId={projectId}
                      index={globalIndex}
                      seoData={r.seo}
                      onUpdate={(seo: StoredSeoResult) => onUpdate(globalIndex, { seo })}
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
                {!r.newsletter && (
                  <RegenerateButton
                    projectId={projectId}
                    monat={r.monat}
                    missing
                    onSuccess={(result) => onUpdate(globalIndex, result)}
                  />
                )}
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
                {/* Medienempfehlungen */}
                {(nl.bildEmpfehlungen?.length || nl.videoEmpfehlung || nl.linkEmpfehlungen?.length) && (
                  <div className="border border-stone rounded-xl p-4 space-y-3 bg-stone/20">
                    <p className="text-xs font-semibold text-stahlgrau uppercase tracking-wide">Medien & Links</p>
                    {nl.bildEmpfehlungen?.length ? (
                      <div>
                        <p className="text-xs font-medium text-anthrazit mb-1">📷 Bildempfehlungen</p>
                        <ul className="space-y-1">
                          {nl.bildEmpfehlungen.map((b, bi) => (
                            <li key={bi} className="text-sm text-anthrazit flex gap-2">
                              <span className="text-stahlgrau shrink-0">–</span>{b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {nl.videoEmpfehlung && (
                      <div>
                        <p className="text-xs font-medium text-anthrazit mb-1">🎬 Videoempfehlung</p>
                        <p className="text-sm text-anthrazit">{nl.videoEmpfehlung}</p>
                      </div>
                    )}
                    {nl.linkEmpfehlungen?.length ? (
                      <div>
                        <p className="text-xs font-medium text-anthrazit mb-1">🔗 Links</p>
                        <ul className="space-y-1">
                          {nl.linkEmpfehlungen.map((l, li) => (
                            <li key={li} className="text-sm text-anthrazit flex gap-2 flex-wrap">
                              <span className="font-medium">{l.anker}</span>
                              <span className="text-stahlgrau">→</span>
                              <span className="text-stahlgrau">{l.ziel}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="pt-2 flex items-center gap-3 flex-wrap">
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
                  <RegenerateButton
                    projectId={projectId}
                    monat={r.monat}
                    onSuccess={(result) => onUpdate(globalIndex, result)}
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
  SOCIAL_INSTAGRAM: 400,
  SOCIAL_FACEBOOK: 250,
  SOCIAL_LINKEDIN: 1_300,
}

interface CanvaAssetSocial {
  id: string
  name: string
  type: string
  thumbnailUrl?: string
}

function SocialTab({
  projectId,
  results,
  allResults,
  onUpdate,
  metaConfigured,
  linkedInConfigured,
}: {
  projectId: string
  results: StoredTextResult[]
  allResults: StoredTextResult[]
  onUpdate: (index: number, updates: Partial<StoredTextResult>) => void
  metaConfigured: boolean
  linkedInConfigured: boolean
}) {
  const [expiredProviders, setExpiredProviders] = useState<Set<string>>(new Set())
  const [canvaAssets, setCanvaAssets] = useState<CanvaAssetSocial[]>([])
  const [canvaOpen, setCanvaOpen] = useState(true)

  useEffect(() => {
    fetch('/api/tokens/status')
      .then((r) => r.json())
      .then((data: Array<{ provider: string; level: string }>) => {
        const expired = new Set(
          data.filter((t) => t.level === 'expired').map((t) => t.provider)
        )
        setExpiredProviders(expired)
      })
      .catch((err: unknown) => {
        console.warn('[Vysible] Token-Status konnte nicht geladen werden', err)
      })
  }, [])

  useEffect(() => {
    fetch(`/api/projects/${projectId}/canva`)
      .then((r) => r.json())
      .then((data: { assets?: CanvaAssetSocial[] }) => setCanvaAssets(data.assets ?? []))
      .catch((err: unknown) => console.warn('[Vysible] Canva-Assets nicht geladen:', err))
  }, [projectId])

  function isTokenExpired(kanal: string): boolean {
    if (kanal === 'SOCIAL_FACEBOOK' || kanal === 'SOCIAL_INSTAGRAM') return expiredProviders.has('META')
    if (kanal === 'SOCIAL_LINKEDIN') return expiredProviders.has('LINKEDIN')
    return false
  }

  function isConfigured(kanal: string): boolean {
    if (kanal === 'SOCIAL_FACEBOOK' || kanal === 'SOCIAL_INSTAGRAM') return metaConfigured
    if (kanal === 'SOCIAL_LINKEDIN') return linkedInConfigured
    return false
  }

  const [localTexts, setLocalTexts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    results.forEach((r, ri) => {
      r.socialPosts?.forEach((post, pi) => {
        map[`${ri}-${pi}`] = post.text
      })
    })
    return map
  })

  return (
    <div className="space-y-4">

      {/* Canva-Templates Panel */}
      {canvaAssets.length > 0 && (
        <div className="border border-violet-200 bg-violet-50/40 rounded-xl overflow-hidden">
          <button
            onClick={() => setCanvaOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-violet-50 transition"
          >
            <span className="text-xs font-semibold text-violet-800 uppercase tracking-wide">
              Canva-Templates ({canvaAssets.length})
            </span>
            <span className="text-xs text-violet-600">{canvaOpen ? '▲' : '▼'}</span>
          </button>
          {canvaOpen && (
            <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {canvaAssets.map((asset) => (
                <div key={asset.id} className="rounded-lg border border-violet-100 bg-white overflow-hidden">
                  {asset.thumbnailUrl ? (
                    <img src={asset.thumbnailUrl} alt={asset.name} className="w-full aspect-video object-cover" />
                  ) : (
                    <div className="w-full aspect-video bg-stone/30 flex items-center justify-center">
                      <span className="text-xs text-stahlgrau">Kein Vorschaubild</span>
                    </div>
                  )}
                  <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                    <p className="text-xs text-anthrazit truncate min-w-0">{asset.name}</p>
                    <a
                      href={`https://www.canva.com/design/${asset.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs px-2 py-1 bg-tiefblau text-white rounded-md hover:bg-nachtblau transition whitespace-nowrap"
                    >
                      Öffnen
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {results.map((r) => {
        const globalIndex = allResults.indexOf(r)

        return (
          <div key={globalIndex} className="bg-white border border-stone rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-sm">{r.titel}</p>
                <p className="text-xs text-stahlgrau">{r.monat}</p>
              </div>
              <div className="flex items-center gap-3">
                {!r.socialPosts?.length && (
                  <RegenerateButton
                    projectId={projectId}
                    monat={r.monat}
                    missing
                    onSuccess={(result) => onUpdate(globalIndex, result)}
                  />
                )}
                <StatusSelect
                  value={r.socialStatus ?? 'ausstehend'}
                  options={SOCIAL_STATUS_LABELS}
                  onChange={(v) => onUpdate(globalIndex, { socialStatus: v as SocialStatus })}
                />
              </div>
            </div>

            <div className="space-y-4">
              {r.socialPosts?.map((post, pi) => {
                const localKey = `${results.indexOf(r)}-${pi}`
                const liveText = localTexts[localKey] ?? post.text
                const limit = CHAR_LIMITS[post.kanal] ?? 999
                const count = liveText.length
                const overLimit = count > limit
                const configured = isConfigured(post.kanal)

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
                        setLocalTexts((prev) => ({ ...prev, [localKey]: e.target.value }))
                        const updatedPosts = [...(r.socialPosts ?? [])]
                        updatedPosts[pi] = { ...post, text: e.target.value }
                        onUpdate(globalIndex, { socialPosts: updatedPosts })
                      }}
                    />
                    <div className="mt-2">
                      {configured ? (
                        <SocialPostButton
                          projectId={projectId}
                          index={globalIndex}
                          kanal={post.kanal}
                          text={liveText}
                          currentStatus={r.socialStatus}
                          currentDraftId={r.socialDraftId}
                          currentPlatform={r.socialPlatform}
                          currentError={r.socialError}
                          tokenExpired={isTokenExpired(post.kanal)}
                          onResult={(updates) => onUpdate(globalIndex, updates)}
                        />
                      ) : (
                        <p className="text-xs text-stahlgrau italic">
                          {KANAL_LABELS[post.kanal]} nicht konfiguriert —{' '}
                          <a href={`/projects/${projectId}/connections`} className="text-tiefblau hover:underline">
                            Jetzt verbinden
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              {(r.socialPosts?.length ?? 0) > 0 && (
                <div className="pt-2">
                  <RegenerateButton
                    projectId={projectId}
                    monat={r.monat}
                    onSuccess={(result) => onUpdate(globalIndex, result)}
                  />
                </div>
              )}
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

interface CanvaAsset {
  id: string
  name: string
  type: string
  thumbnailUrl?: string
}

function ImageBriefTab({ results, projectId }: { results: StoredTextResult[]; projectId: string }) {
  const [canvaAssets, setCanvaAssets] = useState<CanvaAsset[]>([])

  useEffect(() => {
    fetch(`/api/projects/${projectId}/canva`)
      .then((r) => r.json())
      .then((data: { assets?: CanvaAsset[] }) => setCanvaAssets(data.assets ?? []))
      .catch((err: unknown) => console.warn('[Vysible] Canva-Assets nicht geladen:', err))
  }, [projectId])

  return (
    <div className="space-y-3">
      {results.map((r, i) => (
        <ImageBriefCard key={i} result={r} canvaAssets={canvaAssets} />
      ))}
      {results.length === 0 && (
        <p className="text-sm text-stahlgrau py-8 text-center">Keine Bildbriefings vorhanden</p>
      )}
    </div>
  )
}

// ── Pläne & Downloads ─────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeeksInMonth(yearMonth: string): number[] {
  const [year, month] = yearMonth.split('-').map(Number)
  const seen = new Set<number>()
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let day = 1; day <= daysInMonth; day++) {
    seen.add(getISOWeek(new Date(year, month - 1, day)))
  }
  return Array.from(seen).sort((a, b) => a - b)
}

function distributeToWeeks<T>(items: T[], weekNumbers: number[]): Array<{ kw: number; items: T[] }> {
  if (weekNumbers.length === 0) return []
  const buckets: Array<{ kw: number; items: T[] }> = weekNumbers.map((kw) => ({ kw, items: [] }))
  items.forEach((item, i) => { buckets[i % weekNumbers.length].items.push(item) })
  return buckets.filter((b) => b.items.length > 0)
}

function formatMonatLang(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

const FUNNEL_LABELS: Record<string, string> = {
  TOFU: 'Bekanntheit',
  MOFU: 'Interesse',
  BOFU: 'Entscheidung',
}
const FUNNEL_COLORS: Record<string, string> = {
  TOFU: 'bg-emerald-100 text-emerald-700',
  MOFU: 'bg-amber-100 text-amber-700',
  BOFU: 'bg-red-100 text-red-700',
}
const HWG_COLORS_PLAENE: Record<string, string> = {
  gruen: 'bg-green-100 text-green-700',
  gelb:  'bg-amber-100 text-amber-700',
  rot:   'bg-red-100 text-red-700',
}

function renderOutline(outline: string) {
  return outline.split('\n').map((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return null
    if (trimmed.startsWith('## ')) {
      return <p key={i} className="font-semibold text-sm text-anthrazit mt-3 first:mt-0">{trimmed.slice(3)}</p>
    }
    if (trimmed.startsWith('# ')) {
      return <p key={i} className="font-bold text-sm text-nachtblau mt-2 first:mt-0">{trimmed.slice(2)}</p>
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return <p key={i} className="text-sm text-anthrazit pl-3 before:content-['–'] before:mr-2 before:text-stahlgrau">{trimmed.slice(2)}</p>
    }
    return <p key={i} className="text-sm text-stahlgrau">{trimmed}</p>
  })
}

function PlanCard({
  titel,
  monat,
  children,
  open,
  onToggle,
}: {
  titel: string
  monat: string
  children: React.ReactNode
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-stone rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone/20"
        onClick={onToggle}
      >
        <div>
          <p className="font-medium text-sm">{titel}</p>
          <p className="text-xs text-stahlgrau">{monat}</p>
        </div>
        <span className="text-stahlgrau text-xs">{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="border-t border-stone p-4">{children}</div>}
    </div>
  )
}

function PlaeneTab({
  projectId,
  themes,
  results,
}: {
  projectId: string
  themes: ThemenItem[]
  results: StoredTextResult[]
}) {
  const [openBlog, setOpenBlog]         = useState<number | null>(null)
  const [openNewsletter, setOpenNewsletter] = useState<number | null>(null)

  const blogThemes       = themes.filter((t) => t.kanal === 'BLOG')
  const newsletterThemes = themes.filter((t) => t.kanal === 'NEWSLETTER')
  const socialResults    = results.filter((r) => r.socialPosts?.length)

  const blogResults       = results.filter((r) => r.blog)
  const newsletterResults = results.filter((r) => r.newsletter)

  // Group social results by month
  const socialByMonth = socialResults.reduce<Record<string, StoredTextResult[]>>((acc, r) => {
    const m = r.monat ?? 'Unbekannt'
    if (!acc[m]) acc[m] = []
    acc[m].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-10">

      {/* ── Download ── */}
      <div className="flex justify-end">
        <a
          href={`/api/projects/${projectId}/plans/download`}
          download
          className="text-xs px-3 py-1.5 bg-tiefblau text-creme rounded-lg hover:bg-anthrazit transition"
        >
          Alle Pläne als XLSX
        </a>
      </div>

      {/* ══ Blog-Plan ══ */}
      <section>
        <h2 className="font-semibold text-base mb-4 pb-2 border-b border-stone flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-stone border border-stahlgrau/40 inline-block" />
          Blog
        </h2>

        {/* Übersichtstabelle */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone">
                <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Monat</th>
                <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Titel</th>
                <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Keyword</th>
                <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Funnel</th>
                <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">HWG</th>
                <th className="text-left py-2 text-xs text-stahlgrau font-medium">CTA</th>
              </tr>
            </thead>
            <tbody>
              {blogThemes.map((t, i) => (
                <tr key={i} className="border-b border-stone/50 hover:bg-stone/30">
                  <td className="py-2 pr-4 text-stahlgrau whitespace-nowrap">{t.monat}</td>
                  <td className="py-2 pr-4 font-medium">{t.seoTitel}</td>
                  <td className="py-2 pr-4 text-stahlgrau text-xs">{t.keywordPrimaer}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${FUNNEL_COLORS[t.funnelStufe] ?? 'bg-stone text-stahlgrau'}`}>
                      {FUNNEL_LABELS[t.funnelStufe] ?? t.funnelStufe}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${HWG_COLORS_PLAENE[t.hwgFlag] ?? ''}`}>
                      {t.hwgFlag}
                    </span>
                  </td>
                  <td className="py-2 text-stahlgrau text-xs">{t.cta}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {blogThemes.length === 0 && (
            <p className="text-sm text-stahlgrau py-6 text-center">Keine Blog-Themen vorhanden</p>
          )}
        </div>

        {/* Gliederungen */}
        {blogResults.some((r) => r.blog?.outline) && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-stahlgrau uppercase tracking-wide mb-2">Gliederungen</p>
            {blogResults.filter((r) => r.blog?.outline).map((r, i) => (
              <PlanCard
                key={i}
                titel={r.titel}
                monat={r.monat}
                open={openBlog === i}
                onToggle={() => setOpenBlog(openBlog === i ? null : i)}
              >
                <div className="space-y-1">{renderOutline(r.blog!.outline!)}</div>
              </PlanCard>
            ))}
          </div>
        )}
      </section>

      {/* ══ Newsletter-Plan ══ */}
      <section>
        <h2 className="font-semibold text-base mb-4 pb-2 border-b border-stone flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          Newsletter
        </h2>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone">
                <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Monat</th>
                <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Titel</th>
                <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Keyword</th>
                <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">Funnel</th>
                <th className="text-left py-2 pr-4 text-xs text-stahlgrau font-medium">HWG</th>
                <th className="text-left py-2 text-xs text-stahlgrau font-medium">Betreff A</th>
              </tr>
            </thead>
            <tbody>
              {newsletterThemes.map((t, i) => {
                const matchResult = newsletterResults.find((r) => r.monat === t.monat)
                return (
                  <tr key={i} className="border-b border-stone/50 hover:bg-stone/30">
                    <td className="py-2 pr-4 text-stahlgrau whitespace-nowrap">{t.monat}</td>
                    <td className="py-2 pr-4 font-medium">{t.seoTitel}</td>
                    <td className="py-2 pr-4 text-stahlgrau text-xs">{t.keywordPrimaer}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${FUNNEL_COLORS[t.funnelStufe] ?? 'bg-stone text-stahlgrau'}`}>
                        {FUNNEL_LABELS[t.funnelStufe] ?? t.funnelStufe}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${HWG_COLORS_PLAENE[t.hwgFlag] ?? ''}`}>
                        {t.hwgFlag}
                      </span>
                    </td>
                    <td className="py-2 text-stahlgrau text-xs">{matchResult?.newsletter?.betreffA ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {newsletterThemes.length === 0 && (
            <p className="text-sm text-stahlgrau py-6 text-center">Keine Newsletter-Themen vorhanden</p>
          )}
        </div>

        {newsletterResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-stahlgrau uppercase tracking-wide mb-2">Betreff & Vorschau</p>
            {newsletterResults.map((r, i) => {
              const nl = r.newsletter!
              return (
                <PlanCard
                  key={i}
                  titel={r.titel}
                  monat={r.monat}
                  open={openNewsletter === i}
                  onToggle={() => setOpenNewsletter(openNewsletter === i ? null : i)}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-stahlgrau font-medium mb-1">Betreff A</p>
                        <p className="text-sm text-anthrazit bg-stone/30 rounded-lg px-3 py-2">{nl.betreffA}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stahlgrau font-medium mb-1">Betreff B</p>
                        <p className="text-sm text-anthrazit bg-stone/30 rounded-lg px-3 py-2">{nl.betreffB}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-stahlgrau font-medium mb-1">Preheader</p>
                      <p className="text-sm text-anthrazit bg-stone/30 rounded-lg px-3 py-2">{nl.preheader}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stahlgrau font-medium mb-1">Vorschau</p>
                      <p className="text-sm text-anthrazit leading-relaxed line-clamp-4">
                        {nl.body.replace(/[#*_`]/g, '').trim()}
                      </p>
                    </div>
                  </div>
                </PlanCard>
              )
            })}
          </div>
        )}
      </section>

      {/* ══ Social-Media-Plan ══ */}
      {socialResults.length > 0 && (
        <section>
          <h2 className="font-semibold text-base mb-4 pb-2 border-b border-stone flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            Social Media
          </h2>
          <div className="space-y-8">
            {Object.entries(socialByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([monat, monthResults]) => {
              const weeks = getWeeksInMonth(monat)
              const distributed = distributeToWeeks(monthResults, weeks)
              return (
                <div key={monat}>
                  <p className="text-sm font-semibold text-nachtblau mb-3">{formatMonatLang(monat)}</p>
                  <div className="space-y-4">
                    {distributed.map(({ kw, items }) => (
                      <div key={kw}>
                        <p className="text-xs font-semibold text-stahlgrau uppercase tracking-wide mb-2 flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400" />
                          KW {kw}
                        </p>
                        <div className="space-y-3 pl-3 border-l-2 border-purple-100">
                          {items.map((r, ri) => {
                            const metaPost = r.socialPosts?.find((p) => p.kanal === 'SOCIAL_FACEBOOK' || p.kanal === 'SOCIAL_INSTAGRAM')
                            const linkedInPost = r.socialPosts?.find((p) => p.kanal === 'SOCIAL_LINKEDIN')
                            return (
                              <div key={ri} className="border border-stone rounded-xl p-4 space-y-3 bg-white">
                                <p className="font-medium text-sm">{r.titel}</p>
                                {metaPost && (
                                  <div>
                                    <p className="text-xs font-medium text-stahlgrau mb-1.5 flex items-center gap-1.5">
                                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Facebook</span>
                                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Instagram</span>
                                    </p>
                                    <p className="text-sm text-anthrazit bg-stone/30 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                                      {metaPost.text}
                                    </p>
                                  </div>
                                )}
                                {linkedInPost && (
                                  <div>
                                    <p className="text-xs font-medium text-stahlgrau mb-1.5">
                                      <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">LinkedIn</span>
                                    </p>
                                    <p className="text-sm text-anthrazit bg-stone/30 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                                      {linkedInPost.text}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
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

