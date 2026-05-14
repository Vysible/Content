import { describe, it, expect } from 'vitest'
import { deriveFilePrefix } from '@/lib/export/zip'

describe('deriveFilePrefix', () => {
  it('WAR für "Zahnzentrum Warendorf"', () => {
    expect(deriveFilePrefix('Zahnzentrum Warendorf')).toBe('WAR')
  })

  it('MUE für "Praxis München"', () => {
    expect(deriveFilePrefix('Praxis München')).toBe('MUE')
  })

  it('HAU für "Dr. Hausmann"', () => {
    expect(deriveFilePrefix('Dr. Hausmann')).toBe('HAU')
  })

  it('PRX als Fallback bei leerem Namen', () => {
    expect(deriveFilePrefix('')).toBe('PRX')
  })

  it('PRX bei reinen Sonderzeichen', () => {
    expect(deriveFilePrefix('!!! ---')).toBe('PRX')
  })

  it('erstes Wort wenn kein signifikantes Wort', () => {
    // "Zahnarzt" ist generisch, kein zweites Wort → nimmt erstes
    expect(deriveFilePrefix('Zahnarzt')).toBe('ZAH')
  })

  it('MAX für "Maximal Zahnklinik Berlin"', () => {
    expect(deriveFilePrefix('Maximal Zahnklinik Berlin')).toBe('MAX')
  })
})
