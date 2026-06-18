'use client'

import { useState } from 'react'
import type { StoredTextResult } from '@/lib/generation/results-store'

interface CanvaAsset {
  id: string
  name: string
  type: string
  thumbnailUrl?: string
}

interface Props {
  result: StoredTextResult
  canvaAssets?: CanvaAsset[]
}

export function ImageBriefCard({ result, canvaAssets = [] }: Props) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const b = result.imageBrief
  const hasCanva = canvaAssets.length > 0

  function handleCopy() {
    if (!b.dallePrompt) return
    navigator.clipboard.writeText(b.dallePrompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    }).catch((err: unknown) => {
      console.warn('[Vysible] Clipboard-Kopie fehlgeschlagen:', err)
    })
  }

  return (
    <div className="bg-white border border-stone rounded-xl overflow-hidden">

      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone/20"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <p className="font-medium text-sm">{result.titel}</p>
          <p className="text-xs text-stahlgrau">{result.monat} · {result.kanal}</p>
        </div>
        <div className="flex items-center gap-2">
          {b.hwgParagraph11Check && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
              HWG §11
            </span>
          )}
          {hasCanva && !open && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
              {canvaAssets.length} Templates
            </span>
          )}
          <span className="text-stahlgrau text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className={`border-t border-stone ${hasCanva ? 'grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone' : ''}`}>

          {/* ── Linke Spalte: Briefing-Inhalt ── */}
          <div className="p-5 space-y-4">
            <p className="text-xs font-semibold text-nachtblau uppercase tracking-wide">Bildbriefing</p>

            <div className="grid grid-cols-3 gap-3">
              <InfoField label="Motiv" value={b.motiv} />
              <InfoField label="Stil" value={b.stil} />
              <InfoField label="Farbwelt" value={b.farbwelt} />
            </div>

            <InfoField label="Textoverlay" value={b.textoverlay} />

            <div>
              <p className="text-xs text-stahlgrau mb-1">Canva-Empfehlung</p>
              <p className="text-sm bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-violet-900 leading-relaxed">
                {b.canvaAssetEmpfehlung}
              </p>
            </div>

            {b.stockSuchbegriffe.length > 0 && (
              <div>
                <p className="text-xs text-stahlgrau mb-1.5">Stock-Suchbegriffe</p>
                <div className="flex flex-wrap gap-1.5">
                  {b.stockSuchbegriffe.map((kw) => (
                    <span key={kw} className="text-xs bg-stone px-2 py-0.5 rounded-full text-anthrazit">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {b.hwgParagraph11Check && b.hwgHinweis && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <span className="font-semibold">HWG §11: </span>{b.hwgHinweis}
              </div>
            )}

            {b.dallePrompt && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-stahlgrau">DALL-E 3 Prompt</p>
                  <button onClick={handleCopy} className="text-xs text-tiefblau hover:underline">
                    {copied ? 'Kopiert!' : 'Kopieren'}
                  </button>
                </div>
                <pre className="text-xs bg-stone/50 border border-stone rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed">
                  {b.dallePrompt}
                </pre>
              </div>
            )}

            {b.unsplashLinks && b.unsplashLinks.length > 0 && (
              <div>
                <p className="text-xs text-stahlgrau mb-1.5">Unsplash-Empfehlungen</p>
                <div className="space-y-1">
                  {b.unsplashLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-tiefblau hover:underline truncate"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Rechte Spalte: Canva-Templates ── */}
          {hasCanva && (
            <div className="p-5">
              <p className="text-xs font-semibold text-nachtblau uppercase tracking-wide mb-4">
                Canva-Templates
              </p>
              <div className="space-y-3">
                {canvaAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="group rounded-xl overflow-hidden border border-stone hover:border-tiefblau transition-colors"
                  >
                    {/* Thumbnail */}
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.name}
                        className="w-full aspect-video object-cover bg-stone/20"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-stone/30 flex items-center justify-center">
                        <span className="text-xs text-stahlgrau">Kein Vorschaubild</span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div className="min-w-0 mr-2">
                        <p className="text-xs font-medium text-anthrazit truncate">{asset.name}</p>
                        <p className="text-xs text-stahlgrau capitalize">{asset.type}</p>
                      </div>
                      <a
                        href={`https://www.canva.com/design/${asset.id}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 px-3 py-1.5 text-xs bg-tiefblau text-white rounded-lg hover:bg-nachtblau transition whitespace-nowrap"
                      >
                        In Canva öffnen
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-stahlgrau mb-0.5">{label}</p>
      <p className="text-sm text-anthrazit leading-relaxed">{value}</p>
    </div>
  )
}
