'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ChatPanel } from './ChatPanel'

import type { StoredTextResult, ContentVersion } from '@/lib/generation/results-store'

const RichTextEditor = dynamic(
  () => import('./RichTextEditor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-48 bg-stone rounded" />,
  },
)

export type SaveState = 'saved' | 'saving' | 'error' | 'idle'

interface Props {
  projectId: string
  index: number
  result: StoredTextResult
  versionField: 'blog' | 'newsletter'
  initialContent: string
  saveState: SaveState
  articleTitle?: string
  onUpdate: (updates: Partial<StoredTextResult>) => void
}

export function EditorView({
  projectId,
  index,
  result,
  versionField,
  initialContent,
  saveState,
  articleTitle,
  onUpdate,
}: Props) {
  const [content, setContent] = useState(initialContent)
  const [versions, setVersions] = useState<ContentVersion[]>(
    (versionField === 'blog' ? result.blogVersions : result.newsletterVersions) ?? []
  )

  // Sync when parent regenerates content (initialContent changes from outside)
  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  function handleChange(html: string) {
    setContent(html)
    const updates: Partial<StoredTextResult> =
      versionField === 'blog'
        ? { blog: { ...result.blog!, html } }
        : { newsletter: { ...result.newsletter!, body: html } }
    onUpdate(updates)
  }

  function handleRevised(newContent: string, newVersions: ContentVersion[]) {
    setContent(newContent)
    setVersions(newVersions)
    const vKey = versionField === 'blog' ? 'blogVersions' : 'newsletterVersions'
    const updates: Partial<StoredTextResult> =
      versionField === 'blog'
        ? { blog: { ...result.blog!, html: newContent }, [vKey]: newVersions }
        : { newsletter: { ...result.newsletter!, body: newContent }, [vKey]: newVersions }
    onUpdate(updates)
  }

  return (
    <div className="flex h-[600px] gap-0 overflow-hidden rounded-xl border border-stone">
      {/* Editor (links) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-stone bg-white">
          <span className="text-xs font-medium text-anthrazit">
            {versionField === 'blog' ? 'Blog-Beitrag' : 'Newsletter'}
          </span>
          <SaveIndicator state={saveState} />
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          <RichTextEditor
            key={content.slice(0, 50)}
            content={content}
            onChange={handleChange}
            minHeight="100%"
          />
        </div>
      </div>

      {/* Chat-Panel (rechts) */}
      <div className="w-72 flex-shrink-0">
        <ChatPanel
          projectId={projectId}
          index={index}
          versionField={versionField}
          currentContent={content}
          versions={versions}
          articleTitle={articleTitle}
          onRevised={handleRevised}
        />
      </div>
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null
  const map: Record<SaveState, { text: string; cls: string }> = {
    idle:   { text: '',            cls: '' },
    saving: { text: 'Speichert…', cls: 'text-stahlgrau' },
    saved:  { text: 'Gespeichert', cls: 'text-green-600' },
    error:  { text: 'Fehler beim Speichern', cls: 'text-red-600' },
  }
  const { text, cls } = map[state]
  return <span className={`text-xs ${cls}`}>{text}</span>
}
