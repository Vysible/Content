import { z } from 'zod'
import { THEMES_CONFIG } from './config'

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
  istFrage: z.boolean().optional().default(false),       // seoTitel ist Frage oder enthält Keyword (post-parse berechnet)
})

export type ThemenItem = z.infer<typeof ThemenItemSchema>

export const ThemenListSchema = z.array(ThemenItemSchema)

/** Prüft, ob die Qualitätskriterien laut plan.md erfüllt sind */
export function validateThemenQuality(items: ThemenItem[]): { ok: boolean; reason?: string; warning?: string } {
  if (items.length === 0) return { ok: false, reason: 'Leeres Themen-Array' }

  const praxisPct = items.filter((i) => i.praxisspezifisch).length / items.length
  const minPraxis = THEMES_CONFIG.minPraxisQuote
  if (praxisPct < minPraxis) {
    return {
      ok: false,
      reason: `Nur ${Math.round(praxisPct * 100)}% praxisspezifisch (Minimum ${Math.round(minPraxis * 100)}%)`,
    }
  }

  const seoPct = items.filter((i) => i.istFrage).length / items.length
  const minSeo = THEMES_CONFIG.minSeoQuote
  const warning = seoPct < minSeo
    ? `Nur ${Math.round(seoPct * 100)}% SEO-Titel als Frage/mit Keyword (Empfehlung: ≥${Math.round(minSeo * 100)}%)`
    : undefined

  return { ok: true, warning }
}
