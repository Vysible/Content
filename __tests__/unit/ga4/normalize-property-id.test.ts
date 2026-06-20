import { describe, it, expect } from 'vitest'
import { normalizeGa4PropertyId } from '@/lib/ga4/normalize-property-id'

describe('normalizeGa4PropertyId', () => {
  it('akzeptiert reine Zahl', () => {
    expect(normalizeGa4PropertyId('123456789')).toBe('123456789')
  })

  it('entfernt properties/-Präfix', () => {
    expect(normalizeGa4PropertyId('properties/123456789')).toBe('123456789')
  })

  it('trimmt Leerzeichen', () => {
    expect(normalizeGa4PropertyId('  properties/123  ')).toBe('123')
  })

  it('ist idempotent', () => {
    const once = normalizeGa4PropertyId('properties/456')
    expect(normalizeGa4PropertyId(once)).toBe('456')
  })

  it('wirft bei alphabetischem Inhalt', () => {
    expect(() => normalizeGa4PropertyId('abc')).toThrow()
  })

  it('wirft bei leerem String', () => {
    expect(() => normalizeGa4PropertyId('')).toThrow()
  })

  it('wirft bei properties/ ohne Zahl', () => {
    expect(() => normalizeGa4PropertyId('properties/')).toThrow()
  })
})
