import { z } from 'zod'

export const ThemenItemSchema = z.object({
  // Pflichtfelder (plan.md)
  monat: z.string().regex(/^\d{4}-\d{2}$/),              // "2026-01"
  thema: z.string().min(3),                              // Kurzbezeichnung des Oberthemas
  seoTitel: z.string().min(5),                           // SEO-optimierter Titel
  kategorie: z.string(),                                 // z.B. "Prophylaxe", "Implantologie"
  zielgruppe: z.string(),                                // Primäre Zielgruppe
  funnelStufe: z.enum(['Awareness', 'Consideration', 'Decision', 'Retention']),
  keywordPrimaer: z.string(),
  keywordSekundaer: z.array(z.string()).default([]),
  paaFragen: z.array(z.string()).min(1),                 // People-Also-Ask → als H2 im Blog
  kanal: z.enum(['BLOG', 'NEWSLETTER', 'SOCIAL_INSTAGRAM', 'SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN']),
  contentWinkel: z.string(),                             // Blickwinkel / Perspektive
  cta: z.string(),                                       // Call-to-Action
  prioritaet: z.enum(['Hoch', 'Mittel', 'Niedrig']),
  positionierungGenutzt: z.boolean(),
  canvaOrdnerGenutzt: z.boolean(),
  keywordsGenutzt: z.boolean(),
  hwgFlag: z.enum(['gruen', 'gelb', 'rot']),

  // Qualitätsprüfungsfelder (intern)
  praxisspezifisch: z.boolean(),
  istFrage: z.boolean(),                                  // seoTitel ist Frage oder enthält Keyword
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
