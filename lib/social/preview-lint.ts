/**
 * Statische Prüfung von Social-Post-Texten gegen plattformtypische
 * Darstellungs-Grenzen (Abschneide-Punkt "mehr anzeigen", harte Zeichen-Limits,
 * Hashtag-Obergrenzen). Die Abschneide-Werte sind branchenübliche Richtwerte,
 * keine offiziellen, dokumentierten Plattform-Konstanten — sie schwanken je nach
 * Gerät/Client geringfügig.
 */

export type LintSeverity = 'error' | 'warning' | 'info'

export interface LintIssue {
  severity: LintSeverity
  message: string
}

export type SocialKanal = 'SOCIAL_INSTAGRAM' | 'SOCIAL_FACEBOOK' | 'SOCIAL_LINKEDIN'

interface PlatformLimits {
  /** Ca. Zeichen bis "mehr anzeigen"/"see more" im Feed erscheint. */
  previewCutoff: number
  /** Harte Obergrenze der Plattform. */
  hardMax: number
  /** Empfohlene Hashtag-Obergrenze. */
  maxHashtags?: number
}

const LIMITS: Record<SocialKanal, PlatformLimits> = {
  SOCIAL_INSTAGRAM: { previewCutoff: 125, hardMax: 2_200, maxHashtags: 30 },
  SOCIAL_FACEBOOK: { previewCutoff: 477, hardMax: 63_206 },
  SOCIAL_LINKEDIN: { previewCutoff: 210, hardMax: 3_000 },
}

const PLATFORM_LABELS: Record<SocialKanal, string> = {
  SOCIAL_INSTAGRAM: 'Instagram',
  SOCIAL_FACEBOOK: 'Facebook',
  SOCIAL_LINKEDIN: 'LinkedIn',
}

export function lintSocialText(text: string, kanal: SocialKanal): LintIssue[] {
  const issues: LintIssue[] = []
  const limits = LIMITS[kanal]
  const label = PLATFORM_LABELS[kanal]
  const trimmed = text.trim()

  if (!trimmed) {
    issues.push({ severity: 'info', message: 'Noch kein Text vorhanden.' })
    return issues
  }

  if (trimmed.length > limits.hardMax) {
    issues.push({
      severity: 'error',
      message: `${label}: ${trimmed.length} Zeichen — über dem Limit von ${limits.hardMax}.`,
    })
  } else if (trimmed.length > limits.previewCutoff) {
    issues.push({
      severity: 'info',
      message: `${label}: Text wird im Feed ab ca. ${limits.previewCutoff} Zeichen hinter „mehr anzeigen" abgeschnitten — die wichtigste Aussage sollte vorher stehen.`,
    })
  }

  if (limits.maxHashtags) {
    const hashtagCount = (trimmed.match(/#[A-Za-z0-9_äöüÄÖÜß]+/g) ?? []).length
    if (hashtagCount > limits.maxHashtags) {
      issues.push({
        severity: 'error',
        message: `${label}: ${hashtagCount} Hashtags — über dem Limit von ${limits.maxHashtags}.`,
      })
    }
  }

  return issues
}
