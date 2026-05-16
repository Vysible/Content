'use client'

import { useState, useRef } from 'react'
import type { WizardData } from './NewProjectWizard'
import { HedyImport } from './HedyImport'
import { TemplateSelector, type FachgebietApiItem } from './TemplateSelector'
import { KeywordReview } from './KeywordReview'
import { CanvaFolderSelector } from './CanvaFolderSelector'

// Geschätzte Tokens: 1 Token ≈ 4 Zeichen (Deutsch)
const MAX_POSITIONING_CHARS = 4_000 * 4

interface Step3Props {
  data: WizardData
  onChange: (updates: Partial<WizardData>) => void
  projectIdForKeywordReview?: string
  locationForKeywordReview?: string
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
}

export function Step3Context({
  data,
  onChange,
  projectIdForKeywordReview,
  locationForKeywordReview,
  onBack,
  onSubmit,
  submitting,
}: Step3Props) {
  const [activeTab, setActiveTab] = useState<'eingeben' | 'hochladen'>('eingeben')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [truncatedHint, setTruncatedHint] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const positioningLength = data.positioningDocument.length
  const positioningTruncated = positioningLength > MAX_POSITIONING_CHARS
  const estimatedTokens = Math.round(positioningLength / 4)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setTruncatedHint(false)

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
        onChange({ positioningDocument: data.text })
        setActiveTab('eingeben')
        if (data.truncated) {
          setTruncatedHint(true)
        }
      } catch (err: unknown) {
        console.warn('[Vysible] parse-document Fehler:', err)
        setUploadError('Upload fehlgeschlagen. Bitte erneut versuchen.')
      } finally {
        setIsUploading(false)
      }
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      onChange({ positioningDocument: text ?? '' })
      setActiveTab('eingeben')
    }
    reader.readAsText(file, 'utf-8')
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-nachtblau mb-1">Schritt 3: Kontext <span className="text-stahlgrau font-normal text-sm">(optional)</span></h2>
        <p className="text-sm text-stahlgrau">Je mehr Kontext, desto praxisspezifischer der generierte Content.</p>
      </div>

      {/* Fachgebiet-Template (Slice 25) */}
      <TemplateSelector
        onSelect={(tpl: FachgebietApiItem | null) => {
          if (!tpl) {
            onChange({ fachgebiet: '', keywords: [] })
            return
          }
          onChange({
            fachgebiet: tpl.specialty,
            keywords: tpl.defaultKeywords,
          })
        }}
      />

      {/* Positionierungsdokument */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-anthrazit">Positionierungsdokument</label>
          {positioningLength > 0 && (
            <span className={`text-xs ${positioningTruncated ? 'text-bordeaux font-semibold' : 'text-stahlgrau'}`}>
              ~{estimatedTokens.toLocaleString('de')} Tokens {positioningTruncated && '(wird auf 4.000 gekürzt)'}
            </span>
          )}
        </div>

        {/* Tab: Eingeben / Hochladen */}
        <div className="flex border-b border-stone mb-2">
          {(['eingeben', 'hochladen'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-medium capitalize transition border-b-2 -mb-px ${
                activeTab === tab ? 'border-cognac text-cognac' : 'border-transparent text-stahlgrau hover:text-anthrazit'
              }`}
            >
              {tab === 'eingeben' ? 'Text eingeben' : 'Datei hochladen'}
            </button>
          ))}
        </div>

        {activeTab === 'eingeben' ? (
          <textarea
            value={data.positioningDocument}
            onChange={(e) => onChange({ positioningDocument: e.target.value })}
            rows={6}
            placeholder="USPs, Zielgruppe, Tonalität, Differenzierung zum Wettbewerb …"
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac resize-none"
          />
        ) : (
          <>
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed rounded-lg transition bg-creme ${
                isUploading
                  ? 'border-stone cursor-wait opacity-70'
                  : 'border-stone cursor-pointer hover:border-cognac'
              }`}
            >
              {isUploading ? (
                <p className="text-sm text-stahlgrau">Dokument wird verarbeitet …</p>
              ) : (
                <>
                  <span className="text-2xl">⇪</span>
                  <p className="text-sm text-stahlgrau">TXT, MD, PDF oder DOCX hochladen (max. 10 MB)</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".txt,.md,.markdown,.pdf,.docx" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </div>
            {uploadError && (
              <p className="text-xs text-bordeaux mt-1">[FAIL] {uploadError}</p>
            )}
            {truncatedHint && (
              <p className="text-xs text-amber-700 mt-1">[WARN] Dokument wurde auf ~4.000 Tokens gekürzt.</p>
            )}
          </>
        )}

        {positioningTruncated && (
          <p className="text-xs text-bordeaux mt-1">
            ⚠ Das Dokument überschreitet 4.000 Tokens und wird automatisch gekürzt.
          </p>
        )}

        {/* Warnung: fehlendes Positionierungsdokument */}
        {positioningLength === 0 && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <strong>Empfehlung:</strong> Ohne Positionierungsdokument ist der generierte Content weniger praxisspezifisch.
            {' '}Alternativ: <span className="font-semibold">Hedy-Import nutzen</span> (Schritt unten).
          </div>
        )}
      </div>

      {/* Hedy-Import (Slice 20) */}
      <div className="p-4 bg-stone/40 rounded-xl border border-stone">
        <p className="text-xs font-semibold text-anthrazit mb-2">Positionierung aus Hedy-Transkript generieren</p>
        <HedyImport onImported={(positioning) => onChange({ positioningDocument: positioning })} />
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">Keywords <span className="text-stahlgrau font-normal">(optional)</span></label>
        <KeywordReview
          projectId={projectIdForKeywordReview}
          location={locationForKeywordReview}
          initialKeywords={data.keywords}
          onConfirm={({ keywords, paaQuestions }) => {
            const merged = Array.from(new Set([...keywords, ...paaQuestions]))
            onChange({ keywords: merged })
          }}
        />
      </div>

      {/* Themen-Pool */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">
          Themen-Pool <span className="text-stahlgrau font-normal">(optional)</span>
        </label>
        <textarea
          value={data.themenPool}
          onChange={(e) => onChange({ themenPool: e.target.value })}
          rows={3}
          placeholder="Bevorzugte Themen, Saisonales, Aktionen der Praxis …"
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac resize-none"
        />
      </div>

      {/* Canva-Ordner (Slice 17) */}
      <CanvaFolderSelector
        value={data.canvaFolderId}
        onChange={(folderId, folderName) => onChange({ canvaFolderId: folderId, canvaFolderName: folderName })}
      />

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 text-sm text-stahlgrau hover:text-anthrazit transition">
          ← Zurück
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="px-6 py-2 bg-cognac hover:bg-cognacDark text-black text-sm font-semibold rounded-lg transition disabled:opacity-60"
        >
          {submitting ? 'Projekt wird erstellt …' : 'Projekt erstellen'}
        </button>
      </div>
    </div>
  )
}
