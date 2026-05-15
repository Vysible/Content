'use client'

import { useMemo, useState } from 'react'

interface KeywordItem {
  keyword: string
  searchVolume: number | null
}

interface DataForSeoResponse {
  keywords?: Array<{ keyword?: string; searchVolume?: number | null }>
  paaQuestions?: string[]
  error?: string
}

interface KeywordReviewProps {
  projectId?: string
  location?: string
  initialKeywords: string[]
  initialPaaQuestions?: string[]
  onConfirm: (payload: { keywords: string[]; paaQuestions: string[] }) => void
}

const REQUEST_TIMEOUT_MS = 12_000

export function KeywordReview({
  projectId,
  location,
  initialKeywords,
  initialPaaQuestions = [],
  onConfirm,
}: KeywordReviewProps) {
  const [manualInput, setManualInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [fetchedKeywords, setFetchedKeywords] = useState<KeywordItem[]>([])
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(initialKeywords)
  const [paaQuestions, setPaaQuestions] = useState<string[]>(initialPaaQuestions)
  const [selectedPaa, setSelectedPaa] = useState<string[]>(initialPaaQuestions)

  const resolvedLocation = location?.trim() || 'Germany'

  const mergedKeywordDisplay = useMemo(() => {
    const map = new Map<string, KeywordItem>()

    for (const item of fetchedKeywords) {
      if (item.keyword.trim()) {
        map.set(item.keyword, item)
      }
    }

    for (const keyword of selectedKeywords) {
      if (!map.has(keyword)) {
        map.set(keyword, { keyword, searchVolume: null })
      }
    }

    return Array.from(map.values())
  }, [fetchedKeywords, selectedKeywords])

  function addManualKeyword() {
    const value = manualInput.trim()
    if (!value) return

    if (!selectedKeywords.includes(value)) {
      setSelectedKeywords((prev) => [...prev, value])
    }
    setManualInput('')
  }

  function removeKeyword(keyword: string) {
    setSelectedKeywords((prev) => prev.filter((entry) => entry !== keyword))
  }

  function togglePaa(question: string) {
    setSelectedPaa((prev) => (prev.includes(question) ? prev.filter((entry) => entry !== question) : [...prev, question]))
  }

  async function loadSuggestions() {
    if (selectedKeywords.length === 0) {
      setError('Bitte zuerst mindestens ein Keyword eingeben.')
      return
    }

    setError('')
    setIsLoading(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch('/api/dataseo/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: selectedKeywords.slice(0, 5),
          location: resolvedLocation,
          projectId,
        }),
        signal: controller.signal,
      })

      const payload = await response.json() as DataForSeoResponse

      if (!response.ok) {
        if (response.status === 422) {
          setError('DataForSEO nicht konfiguriert. Bitte API-Key unter /settings/api-keys hinterlegen.')
        } else {
          setError(payload.error ?? 'DataForSEO nicht erreichbar — Keywords manuell eingeben.')
        }
        return
      }

      const keywordItems = (payload.keywords ?? [])
        .map((item) => ({
          keyword: item.keyword?.trim() ?? '',
          searchVolume: item.searchVolume ?? null,
        }))
        .filter((item) => Boolean(item.keyword))

      const questionItems = (payload.paaQuestions ?? []).map((item) => item.trim()).filter(Boolean)

      setFetchedKeywords(keywordItems)
      setPaaQuestions(questionItems)
      setSelectedPaa(questionItems)

      if (keywordItems.length > 0) {
        setSelectedKeywords((prev) => {
          const merged = new Set(prev)
          for (const item of keywordItems) {
            merged.add(item.keyword)
          }
          return Array.from(merged)
        })
      }
    } catch (exc: unknown) {
      if (exc instanceof Error && exc.name === 'AbortError') {
        setError('DataForSEO-Timeout nach 12s — bitte manuell weiterarbeiten.')
      } else {
        console.warn('[Vysible] DataForSEO request failed', exc)
        setError('DataForSEO nicht erreichbar — Keywords manuell eingeben.')
      }
    } finally {
      clearTimeout(timeout)
      setIsLoading(false)
    }
  }

  function confirmSelection() {
    onConfirm({
      keywords: selectedKeywords,
      paaQuestions: selectedPaa,
    })
  }

  return (
    <div className="space-y-3 p-4 border border-stone rounded-xl bg-white">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-anthrazit">Keyword-Recherche (DataForSEO)</p>
        <button
          type="button"
          onClick={loadSuggestions}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cognac hover:bg-cognacDark text-black disabled:opacity-60"
        >
          {isLoading ? 'Abfrage läuft...' : 'Keyword-Daten abrufen'}
        </button>
      </div>

      <p className="text-xs text-stahlgrau">
        Abruf startet nur auf Klick. Bei Timeout ({REQUEST_TIMEOUT_MS / 1000}s) kannst du direkt manuell weiterarbeiten.
      </p>

      {error && (
        <p className="text-xs text-bordeaux bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={manualInput}
          onChange={(event) => setManualInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              addManualKeyword()
            }
          }}
          placeholder="Keyword eingeben, Enter oder Komma"
          className="flex-1 px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac"
        />
        <button
          type="button"
          onClick={addManualKeyword}
          disabled={!manualInput.trim()}
          className="px-3 py-2 bg-stone hover:bg-gray-200 text-sm rounded-lg transition disabled:opacity-50"
        >
          +
        </button>
      </div>

      {mergedKeywordDisplay.length > 0 && (
        <div className="space-y-1.5">
          {mergedKeywordDisplay.map((item) => (
            <div key={item.keyword} className="flex items-center justify-between rounded-lg border border-stone px-2 py-1.5 text-xs">
              <span className="font-medium text-anthrazit">{item.keyword}</span>
              <div className="flex items-center gap-2">
                <span className="text-stahlgrau">
                  {item.searchVolume == null ? 'SV: -' : `SV: ${item.searchVolume.toLocaleString('de-DE')}`}
                </span>
                <button
                  type="button"
                  onClick={() => removeKeyword(item.keyword)}
                  className="text-bordeaux hover:text-red-800 leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {paaQuestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-anthrazit">PAA-Fragen</p>
          <div className="flex flex-wrap gap-1.5">
            {paaQuestions.map((question) => {
              const selected = selectedPaa.includes(question)
              return (
                <button
                  key={question}
                  type="button"
                  onClick={() => togglePaa(question)}
                  className={`px-2 py-1 text-xs rounded-full border transition ${
                    selected
                      ? 'bg-tiefblau text-white border-tiefblau'
                      : 'bg-white text-anthrazit border-stone hover:border-cognac'
                  }`}
                >
                  {question}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={confirmSelection}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone hover:bg-stone/20"
        >
          Auswahl bestätigen
        </button>
      </div>
    </div>
  )
}
