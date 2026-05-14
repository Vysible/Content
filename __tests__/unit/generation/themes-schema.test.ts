import { describe, it, expect } from 'vitest'
import { ThemenItemSchema } from '@/lib/generation/themes-schema'

const validItem = {
  monat:                 '2027-01',
  thema:                 'Implantate für Angstpatienten',
  seoTitel:              'Schmerzfreie Implantate — Zahnzentrum Warendorf',
  kategorie:             'Implantologie',
  zielgruppe:            'Angstpatienten 40–65',
  funnelStufe:           'Consideration',
  keywordPrimaer:        'Implantate Warendorf',
  keywordSekundaer:      ['Implantate Angst', 'schmerzfreie Behandlung'],
  paaFragen:             ['Wie lange hält ein Implantat?'],
  kanal:                 'BLOG',
  contentWinkel:         'Erfahrungsbericht Angstpatienten',
  cta:                   'Beratungsgespräch vereinbaren',
  prioritaet:            'Hoch',
  positionierungGenutzt: true,
  canvaOrdnerGenutzt:    false,
  keywordsGenutzt:       true,
  hwgFlag:               'gruen',
  praxisspezifisch:      true,
  istFrage:              false,
}

describe('ThemenItemSchema Validierung', () => {
  it('valides ThemenItem wird akzeptiert', () => {
    const result = ThemenItemSchema.safeParse(validItem)
    expect(result.success).toBe(true)
  })

  it('fehlendes Pflichtfeld thema → Fehler', () => {
    const { thema: _omit, ...withoutThema } = validItem
    const result = ThemenItemSchema.safeParse(withoutThema)
    expect(result.success).toBe(false)
  })

  it('ungültiger funnelStufe-Wert → Fehler', () => {
    const result = ThemenItemSchema.safeParse({ ...validItem, funnelStufe: 'Ungültig' })
    expect(result.success).toBe(false)
  })

  it('ungültiger kanal-Wert → Fehler', () => {
    const result = ThemenItemSchema.safeParse({ ...validItem, kanal: 'TIKTOK' })
    expect(result.success).toBe(false)
  })

  it('falsch formatiertes monat (nicht YYYY-MM) → Fehler', () => {
    const result = ThemenItemSchema.safeParse({ ...validItem, monat: 'Januar 2027' })
    expect(result.success).toBe(false)
  })
})
