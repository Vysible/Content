'use client'

import { useMemo, useState } from 'react'
import { lintNewsletterHtml, type EspProfile, type LintIssue } from '@/lib/newsletter/esp-lint'

const WIDTHS = {
  desktop: 620,
  mobile: 375,
} as const

type Width = keyof typeof WIDTHS

const SEVERITY_STYLES: Record<LintIssue['severity'], string> = {
  error: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  info: 'bg-stone/40 border-stone text-stahlgrau',
}

const SEVERITY_LABELS: Record<LintIssue['severity'], string> = {
  error: 'Fehler',
  warning: 'Warnung',
  info: 'Hinweis',
}

interface Props {
  html: string
  espProfile?: EspProfile
}

/**
 * Rendert das fertige Newsletter-HTML in einem sandboxed iframe, mit
 * Desktop/Mobile-Breitenumschaltung, plus die Kompatibilitäts-Hinweise aus
 * lintNewsletterHtml darunter.
 */
export function NewsletterHtmlPreview({ html, espProfile = 'klicktipp-api' }: Props) {
  const [width, setWidth] = useState<Width>('desktop')
  const issues = useMemo(() => lintNewsletterHtml(html, espProfile), [html, espProfile])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-stahlgrau font-medium mr-1">Ansicht:</span>
        {(Object.keys(WIDTHS) as Width[]).map((w) => (
          <button
            key={w}
            onClick={() => setWidth(w)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              width === w
                ? 'bg-tiefblau text-white border-tiefblau'
                : 'bg-white border-stone text-stahlgrau hover:border-tiefblau'
            }`}
          >
            {w === 'desktop' ? 'Desktop (620px)' : 'Mobile (375px)'}
          </button>
        ))}
      </div>

      <div className="border border-stone rounded-xl bg-stone/20 p-4 overflow-x-auto">
        <iframe
          title="Newsletter-HTML-Vorschau"
          srcDoc={html}
          sandbox=""
          style={{ width: WIDTHS[width], height: 640 }}
          className="bg-white border border-stone/60 rounded-lg shadow-sm mx-auto block"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-stahlgrau uppercase tracking-wide">
          Kompatibilitäts-Check {issues.length === 0 && <span className="text-emerald-600 normal-case">— keine Probleme gefunden</span>}
        </p>
        {issues.map((issue, i) => (
          <div key={i} className={`text-xs border rounded-lg px-3 py-2 ${SEVERITY_STYLES[issue.severity]}`}>
            <span className="font-semibold">{SEVERITY_LABELS[issue.severity]}:</span> {issue.message}
          </div>
        ))}
      </div>
    </div>
  )
}
