'use client'

import { useState, useRef } from 'react'

const MAX_POSITIONING_CHARS = 4_000 * 4

interface Props {
  projectId: string
  initialDocument: string
}

export function ProjectPositioningSettings({ projectId, initialDocument }: Props) {
  const [activeTab, setActiveTab] = useState<'eingeben' | 'hochladen'>('eingeben')
  const [document, setDocument] = useState(initialDocument)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const charCount = document.length
  const estimatedTokens = Math.round(charCount / 4)
  const isTruncated = charCount > MAX_POSITIONING_CHARS

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Datei zu groß (max. 10 MB)')
      return
    }

    if (file.name.endsWith('.pdf') || file.name.endsWith('.docx')) {
      const formData = new FormData()
      formData.append('file', file)
      setIsUploading(true)
      try {
        const res = await fetch('/api/projects/parse-document', { method: 'POST', body: formData })
        const data = await res.json() as { text?: string; truncated?: boolean; error?: string }
        if (!res.ok || !data.text) {
          setUploadError(data.error ?? 'Extraktion fehlgeschlagen')
          return
        }
        setDocument(data.text)
        setActiveTab('eingeben')
      } catch (err: unknown) {
        console.warn('[Vysible] parse-document Fehler:', err)
        setUploadError('Upload fehlgeschlagen. Bitte erneut versuchen.')
      } finally {
        setIsUploading(false)
        // Reset file input so the same file can be re-uploaded
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setDocument(ev.target?.result as string ?? '')
      setActiveTab('eingeben')
    }
    reader.readAsText(file, 'utf-8')
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positioningDocument: document }),
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

  return (
    <div className="bg-white rounded-2xl border border-stone p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-nachtblau">Positionierungsdokument</h2>
        <p className="text-sm text-stahlgrau mt-0.5">
          USPs, Zielgruppe, Tonalität und Differenzierung — je mehr Kontext, desto praxisspezifischer der generierte Content.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-stone/50 rounded-xl p-1.5 mb-4">
        {(['eingeben', 'hochladen'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === tab
                ? 'bg-brombeer text-anthrazit shadow-sm'
                : 'text-stahlgrau hover:text-anthrazit hover:bg-white/60'
            }`}
          >
            {tab === 'eingeben' ? 'Text eingeben' : 'Datei hochladen'}
          </button>
        ))}
        {charCount > 0 && (
          <span className={`ml-auto self-center text-xs pb-1 ${isTruncated ? 'text-bordeaux font-semibold' : 'text-stahlgrau'}`}>
            ~{estimatedTokens.toLocaleString('de')} Tokens{isTruncated ? ' (wird auf 4.000 gekürzt)' : ''}
          </span>
        )}
      </div>

      {activeTab === 'eingeben' ? (
        <textarea
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          rows={8}
          placeholder="USPs, Zielgruppe, Tonalität, Differenzierung zum Wettbewerb …"
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux resize-none"
        />
      ) : (
        <div>
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed rounded-lg transition bg-creme ${
              isUploading
                ? 'border-stone cursor-wait opacity-70'
: 'border-stone cursor-pointer hover:border-brombeer'            }`}
          >
            {isUploading ? (
              <p className="text-sm text-stahlgrau">Dokument wird verarbeitet …</p>
            ) : (
              <>
                <span className="text-2xl">⇪</span>
                <p className="text-sm text-stahlgrau">TXT, MD, PDF oder DOCX (max. 10 MB)</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,.pdf,.docx"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </div>
          {uploadError && (
            <p className="text-xs text-bordeaux mt-1">{uploadError}</p>
          )}
        </div>
      )}

      {charCount === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          Noch kein Positionierungsdokument hinterlegt. Ohne dieses ist der generierte Content weniger praxisspezifisch.
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || isUploading}
          className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau disabled:opacity-50 transition"
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
        {saved && <p className="text-sm text-green-600">Gespeichert ✓</p>}
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      </div>
    </div>
  )
}
