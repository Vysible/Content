/**
 * Konfigurierbare Schwellwerte für die Themen-Qualitätsprüfung.
 * Defaults entsprechen den plan.md-Spezifikationen (Sektion Themes-Quality-Gate).
 * Können per ENV-Override angepasst werden ohne Deployment.
 *
 * @forge-scan factory-only — kein IO, nur Konfigurationswerte.
 */
export const THEMES_CONFIG = {
  /**
   * Mindestanteil praxisspezifischer Themen (0–1).
   * ENV: THEMES_MIN_PRAXIS_QUOTE (z.B. "0.7" für 70%)
   * Default: 0.8 (plan.md Spec)
   */
  minPraxisQuote: parseFloat(process.env.THEMES_MIN_PRAXIS_QUOTE ?? '0.8'),

  /**
   * Mindestanteil SEO-Titel als Frage oder mit Primärkeyword (0–1).
   * Unterschreitung → Warning, kein Hard-Fail.
   * ENV: THEMES_MIN_SEO_QUOTE (z.B. "0.4" für 40%)
   * Default: 0.5 (plan.md Spec)
   */
  minSeoQuote: parseFloat(process.env.THEMES_MIN_SEO_QUOTE ?? '0.5'),
} as const
