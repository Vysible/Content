'use client'

import { useState } from 'react'
import type { StoredTextResult } from '@/lib/generation/results-store'

interface Props {
  result: StoredTextResult
}

export function ImageBriefCard({ result }: Props) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const b = result.imageBrief

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
      {/* Header / Collapsible */}
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
          <span className="text-stahlgrau text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="border-t border-stone p-4 space-y-4">
          {/* Kompakte Karte: Motiv, Stil, Farbwelt */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InfoField label="Motiv" value={b.motiv} />
            <InfoField label="Stil" value={b.stil} />
            <InfoField label="Farbwelt" value={b.farbwelt} />
          </div>

          <InfoField label="Textoverlay" value={b.textoverlay} />
          <InfoField label="Canva-Empfehlung" value={b.canvaAssetEmpfehlung} />

          {/* Stock-Suchbegriffe als Chips */}
          {b.stockSuchbegriffe.length > 0 && (
            <div>
              <p className="text-xs text-stahlgrau mb-1.5">Stock-Suchbegriffe</p>
              <div className="flex flex-wrap gap-1.5">
                {b.stockSuchbegriffe.map((kw) => (
                  <span
                    key={kw}
                    className="text-xs bg-stone px-2 py-0.5 rounded-full text-anthrazit"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* HWG-Hinweis */}
          {b.hwgParagraph11Check && b.hwgHinweis && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <span className="font-semibold">HWG §11: </span>{b.hwgHinweis}
            </div>
          )}

          {/* DALL-E Prompt */}
          {b.dallePrompt && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-stahlgrau">DALL-E 3 Prompt</p>
                <button
                  onClick={handleCopy}
                  className="text-xs text-tiefblau hover:underline"
                >
                  {copied ? 'Kopiert!' : 'Kopieren'}
                </button>
              </div>
              <pre className="text-xs bg-stone/50 border border-stone rounded-lg p-3 whitespace-pre-wrap font-mono">
                {b.dallePrompt}
              </pre>
            </div>
          )}

          {/* Unsplash-Links */}
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
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-stahlgrau mb-0.5">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}
