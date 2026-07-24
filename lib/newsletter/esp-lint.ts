/**
 * Statische Prüfung von Newsletter-HTML gegen E-Mail-Client- und ESP-Regeln.
 * Regeln sind aus dokumentierten Kundenprojekten (klicktipp-Blockeditor) und
 * allgemeinen E-Mail-Client-Einschränkungen destilliert — siehe
 * .claude/skills/newsletter-html-generator/reference/esp-klicktipp.md
 */

export type LintSeverity = 'error' | 'warning' | 'info'

export interface LintIssue {
  severity: LintSeverity
  message: string
}

export type EspProfile = 'klicktipp-api' | 'klicktipp-block-editor' | 'generic'

const BLOCK_EDITOR_ALLOWED_TAGS = new Set(['table', 'tr', 'td', 'span', 'strong', 'img', 'a', 'br'])

/** Extrahiert alle öffnenden Tag-Namen aus einem HTML-String (grobe Regex-Prüfung, kein vollständiger Parser). */
function extractTagNames(html: string): string[] {
  return Array.from(html.matchAll(/<\/?([a-z0-9]+)(?=[\s/>])/gi)).map((m) => m[1].toLowerCase())
}

export function lintNewsletterHtml(html: string, profile: EspProfile = 'klicktipp-api'): LintIssue[] {
  const issues: LintIssue[] = []

  const hasMsoFallback = /<!--\[if\s+mso\]>/i.test(html)
  if (/position\s*:\s*absolute/i.test(html) && !hasMsoFallback) {
    issues.push({
      severity: 'warning',
      message: 'position:absolute ohne MSO-Fallback (<!--[if mso]>) gefunden — rendert in Outlook nicht zuverlässig.',
    })
  }

  if (/src\s*=\s*["']data:/i.test(html)) {
    issues.push({
      severity: 'error',
      message: 'Base64-Bild (data:-URI) gefunden — viele Mail-Clients und Spamfilter blockieren eingebettete Bilder.',
    })
  }

  const imgTags = Array.from(html.matchAll(/<img\b[^>]*>/gi)).map((m) => m[0])
  const imgsWithoutAlt = imgTags.filter((tag) => !/\balt\s*=/i.test(tag))
  if (imgsWithoutAlt.length > 0) {
    issues.push({
      severity: 'info',
      message: `${imgsWithoutAlt.length} von ${imgTags.length} <img>-Tags ohne alt-Text.`,
    })
  }

  if (!/unsubscribe|abbestellen|abmelden/i.test(html)) {
    issues.push({
      severity: 'error',
      message: 'Kein Abmelde-/Unsubscribe-Hinweis gefunden (DSGVO-Pflicht).',
    })
  }

  if (!/name=["']viewport["']/i.test(html)) {
    issues.push({
      severity: 'warning',
      message: 'Kein <meta name="viewport"> gefunden — Mobile-Skalierung ungetestet.',
    })
  }

  const widthMatches = Array.from(html.matchAll(/width\s*=\s*["']?(\d+)/gi)).map((m) => Number(m[1]))
  const maxWidth = widthMatches.length > 0 ? Math.max(...widthMatches) : 0
  if (maxWidth > 640) {
    issues.push({
      severity: 'warning',
      message: `Breite von ${maxWidth}px gefunden — Standard für E-Mail-Layouts ist ≤ 640px (empfohlen 600–620px).`,
    })
  }

  if (profile === 'klicktipp-block-editor') {
    const forbiddenTags = Array.from(new Set(extractTagNames(html))).filter((tag) => !BLOCK_EDITOR_ALLOWED_TAGS.has(tag))
    if (forbiddenTags.length > 0) {
      issues.push({
        severity: 'error',
        message: `klicktipp-Blockeditor erlaubt nur table/tr/td/span/strong/img/a/br — nicht erlaubt: ${forbiddenTags.join(', ')}.`,
      })
    }
  }

  return issues
}
