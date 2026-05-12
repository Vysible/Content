'use client'

import { useState, useRef } from 'react'
import type { WizardData } from './NewProjectWizard'

// Geschätzte Tokens: 1 Token ≈ 4 Zeichen (Deutsch)
const MAX_POSITIONING_CHARS = 4_000 * 4

const FACHGEBIETE = [
  { value: '', label: 'Kein Template (manuell)' },
  { value: 'ZAHNARZT', label: 'Zahnarzt (Phase 3)' },
  { value: 'KFO', label: 'Kieferorthopädie (Phase 3)' },
  { value: 'GYNAEKOLOGE', label: 'Gynäkologie (Phase 3)' },
  { value: 'DERMATOLOGE', label: 'Dermatologie (Phase 3)' },
  { value: 'INTERNIST', label: 'Innere Medizin (Phase 3)' },
  { value: 'ALLGEMEINMEDIZIN', label: 'Allgemeinmedizin (Phase 3)' },
]

interface Step3Props {
  data: WizardData
  onChange: (updates: Partial<WizardData>) => void
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
}

export function Step3Context({ data, onChange, onBack, onSubmit, submitting }: Step3Props) {
  const [keywordInput, setKeywordInput] = useState('')
  const [activeTab, setActiveTab] = useState<'eingeben' | 'hochladen'>('eingeben')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const positioningLength = data.positioningDocument.length
  const positioningTruncated = positioningLength > MAX_POSITIONING_CHARS
  const estimatedTokens = Math.round(positioningLength / 4)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.name.endsWith('.pdf') || file.name.endsWith('.docx')) {
      alert('PDF/DOCX-Import kommt in einem späteren Update. Bitte Text direkt einfügen.')
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

  function addKeyword() {
    const kw = keywordInput.trim()
    if (kw && !data.keywords.includes(kw)) {
      onChange({ keywords: [...data.keywords, kw] })
    }
    setKeywordInput('')
  }

  function removeKeyword(kw: string) {
    onChange({ keywords: data.keywords.filter((k) => k !== kw) })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-nachtblau mb-1">Schritt 3: Kontext <span className="text-stahlgrau font-normal text-sm">(optional)</span></h2>
        <p className="text-sm text-stahlgrau">Je mehr Kontext, desto praxisspezifischer der generierte Content.</p>
      </div>

      {/* Fachgebiet-Template (Platzhalter Slice 25) */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">Fachgebiet-Template</label>
        <select
          value={data.fachgebiet}
          onChange={(e) => onChange({ fachgebiet: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac"
        >
          {FACHGEBIETE.map((f) => (
            <option key={f.value} value={f.value} disabled={f.value !== ''}>
              {f.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-stahlgrau mt-1">Vorbelegte Themen-Pools nach Fachgebiet – verfügbar ab Phase 3.</p>
      </div>

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
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed border-stone rounded-lg cursor-pointer hover:border-cognac transition bg-creme"
          >
            <span className="text-2xl">⇪</span>
            <p className="text-sm text-stahlgrau">TXT oder MD hochladen</p>
            <p className="text-xs text-stahlgrau">PDF/DOCX-Import folgt in einem späteren Update</p>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.markdown" className="hidden" onChange={handleFileUpload} />
          </div>
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

      {/* Hedy-Import-Button (Platzhalter Slice 20) */}
      <div className="flex items-center gap-3 p-3 bg-stone rounded-lg">
        <span className="text-lg">🎙</span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-anthrazit">Positionierung aus Hedy-Transkript</p>
          <p className="text-xs text-stahlgrau">Importiert Positionierungsworkshop-Transkript und erstellt das Dokument per KI.</p>
        </div>
        <button
          disabled
          title="Verfügbar ab Phase 3 (Slice 20)"
          className="px-3 py-1.5 text-xs bg-stone border border-stone rounded-lg text-stahlgrau cursor-not-allowed opacity-60"
        >
          Phase 3
        </button>
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-xs font-medium text-anthrazit mb-1">Keywords <span className="text-stahlgrau font-normal">(optional)</span></label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword() } }}
            placeholder="Keyword eingeben, Enter oder Komma"
            className="flex-1 px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac"
          />
          <button onClick={addKeyword} disabled={!keywordInput.trim()} className="px-3 py-2 bg-stone hover:bg-gray-200 text-sm rounded-lg transition disabled:opacity-50">
            +
          </button>
        </div>
        {data.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.keywords.map((kw) => (
              <span key={kw} className="flex items-center gap-1 px-2 py-0.5 bg-tiefblau text-white text-xs rounded-full">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="hover:text-stone transition leading-none">×</button>
              </span>
            ))}
          </div>
        )}
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

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 text-sm text-stahlgrau hover:text-anthrazit transition">
          ← Zurück
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="px-6 py-2 bg-cognac hover:bg-cognacDark text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
        >
          {submitting ? 'Projekt wird erstellt …' : 'Projekt erstellen'}
        </button>
      </div>
    </div>
  )
}
