'use client'

import { useState } from 'react'

export function CopyButton({ href }: { href: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const fullUrl = window.location.origin + href
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch((err: unknown) => {
      console.warn('[Vysible] Clipboard-Kopie fehlgeschlagen:', err)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-3 py-1.5 border border-stone rounded-lg bg-stone/20 hover:bg-stone/40 text-anthrazit transition"
    >
      {copied ? '✓ Kopiert' : 'Link kopieren'}
    </button>
  )
}
