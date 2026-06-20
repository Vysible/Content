/**
 * Normalisiert eine GA4 Property-ID auf das reine numerische Format.
 * Akzeptiert "123456789" und "properties/123456789" — gibt immer "123456789" zurück.
 */
export function normalizeGa4PropertyId(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(?:properties\/)?(\d+)$/)
  if (!match) {
    throw new Error(
      'Ungültige GA4 Property-ID — nur Ziffern erlaubt, z. B. 123456789',
    )
  }
  return match[1]
}
