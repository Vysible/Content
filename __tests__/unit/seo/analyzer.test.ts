import { describe, it, expect } from 'vitest'
import { analyzeSeo } from '@/lib/seo/analyzer'

const SAMPLE_HTML = `
  <h1>Implantate beim Zahnarzt: Alles über Zahnimplantate</h1>
  <p>Zahnimplantate sind eine moderne Lösung für fehlende Zähne. Ein Zahnimplantat
  besteht aus einem Titanstift, der in den Kieferknochen eingesetzt wird. Zahnimplantate
  halten ein Leben lang, wenn sie gut gepflegt werden. Das Zahnimplantat ist die
  beste Option für viele Patienten. Weitere Informationen zu Zahnimplantaten finden
  Sie in unserer Praxis. Wir beraten Sie gern zu Zahnimplantaten.</p>
`

describe('analyzeSeo', () => {
  it('erkennt Keyword im Titel', () => {
    const result = analyzeSeo({
      title: 'Zahnimplantat Kosten und Vorteile',
      html: SAMPLE_HTML,
      keyword: 'zahnimplantat',
    })
    expect(result.titlePresent).toBe(true)
  })

  it('berechnet positive Keyword-Dichte', () => {
    const result = analyzeSeo({
      title: 'Zahnimplantate',
      html: SAMPLE_HTML,
      keyword: 'zahnimplantat',
    })
    expect(result.density).toBeGreaterThan(0)
    expect(result.occurrences).toBeGreaterThan(0)
  })

  it('meldet fehlendes Keyword im Titel', () => {
    const result = analyzeSeo({
      title: 'Moderne Zahnmedizin',
      html: SAMPLE_HTML,
      keyword: 'zahnimplantat',
    })
    expect(result.titlePresent).toBe(false)
    expect(result.suggestions.some((s) => s.includes('fehlt im Titel'))).toBe(true)
  })

  it('bewertet Title-Länge korrekt', () => {
    const shortTitle = 'Kurz'
    const okTitle = 'Zahnimplantat Kosten Vorteile Berlin'   // ~36 chars - too short
    const perfectTitle = 'Zahnimplantat Kosten: Alles was Patienten wissen müssen' // 56 chars
    const longTitle = 'Zahnimplantat Kosten Vorteile Risiken Alternativen Pflege Dauer Hamburg'

    expect(analyzeSeo({ title: shortTitle, html: '<p>text</p>', keyword: 'test' }).titleLengthOk).toBe(false)
    expect(analyzeSeo({ title: perfectTitle, html: '<p>text</p>', keyword: 'test' }).titleLengthOk).toBe(true)
    expect(analyzeSeo({ title: longTitle, html: '<p>text</p>', keyword: 'test' }).titleLengthOk).toBe(false)
  })

  it('bewertet Meta-Description-Länge korrekt', () => {
    const shortMeta = 'Zu kurz'
    const okMeta = 'Zahnimplantate sind die beste Lösung für fehlende Zähne. Erfahren Sie alles über Kosten, Ablauf und Vorteile. Jetzt Termin vereinbaren!'

    expect(analyzeSeo({ title: 't', html: '<p>x</p>', keyword: 'k', metaDescription: shortMeta }).metaDescriptionOk).toBe(false)
    expect(analyzeSeo({ title: 't', html: '<p>x</p>', keyword: 'k', metaDescription: okMeta }).metaDescriptionOk).toBe(true)
  })

  it('gibt Score > 0 zurück', () => {
    const result = analyzeSeo({
      title: 'Zahnimplantat Kosten: Was Patienten wissen müssen',
      html: SAMPLE_HTML,
      keyword: 'zahnimplantat',
    })
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('pure function: gleicher Input → gleicher Output', () => {
    const opts = { title: 'Implantate', html: SAMPLE_HTML, keyword: 'zahnimplantat' }
    expect(analyzeSeo(opts)).toEqual(analyzeSeo(opts))
  })

  it('zählt Wörter korrekt', () => {
    const result = analyzeSeo({
      title: 'Test',
      html: '<p>eins zwei drei vier fünf</p>',
      keyword: 'zwei',
    })
    expect(result.wordCount).toBe(5)
    expect(result.occurrences).toBe(1)
    expect(result.density).toBeCloseTo(20, 0)
  })
})
