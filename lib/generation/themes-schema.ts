import { z } from 'zod'

export const ThemenItemSchema = z.object({
  monat: z.string().regex(/^\d{4}-\d{2}$/), // z.B. "2026-01"
  titel: z.string().min(5),
  kanal: z.enum(['BLOG', 'NEWSLETTER', 'SOCIAL_INSTAGRAM', 'SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN']),
  funnel: z.enum(['awareness', 'consideration', 'decision', 'retention']),
  hwg: z.enum(['gruen', 'gelb', 'rot']),
  keyword: z.string(),
  beschreibung: z.string().optional(),
  praxisspezifisch: z.boolean(),
  istFrage: z.boolean(), // Titel ist Frage oder enthält Keyword
})

export type ThemenItem = z.infer<typeof ThemenItemSchema>

export const ThemenListSchema = z.array(ThemenItemSchema)

/** Prüft, ob die Qualitätskriterien laut plan.md erfüllt sind */
export function validateThemenQuality(items: ThemenItem[]): { ok: boolean; reason?: string } {
  if (items.length === 0) return { ok: false, reason: 'Leeres Themen-Array' }

  const praxisPct = items.filter((i) => i.praxisspezifisch).length / items.length
  if (praxisPct < 0.8) {
    return {
      ok: false,
      reason: `Nur ${Math.round(praxisPct * 100)}% praxisspezifisch (Minimum 80%)`,
    }
  }

  const seoPct = items.filter((i) => i.istFrage).length / items.length
  if (seoPct < 0.5) {
    return {
      ok: false,
      reason: `Nur ${Math.round(seoPct * 100)}% SEO-Titel als Frage/mit Keyword (Minimum 50%)`,
    }
  }

  return { ok: true }
}
