export function normalizeRecipients(rawRecipients: string[]): string[] {
  const normalized = rawRecipients
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  if (normalized.length === 0) {
    throw new Error('Mindestens ein Empfänger ist erforderlich')
  }
  if (normalized.length > 5) {
    throw new Error('Maximal 5 Empfänger erlaubt')
  }
  const invalid = normalized.find((value) => !value.includes('@'))
  if (invalid) {
    throw new Error(`Ungültige E-Mail-Adresse: ${invalid}`)
  }

  return normalized
}
