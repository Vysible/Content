import { describe, it, expect } from 'vitest'
import { checkHwgGate } from '@/lib/compliance/hwg-gate'

describe('checkHwgGate', () => {
  it('hwgFlag true → blocked mit Grund hwg_flag_set', () => {
    expect(checkHwgGate(true)).toEqual({ blocked: true, reason: 'hwg_flag_set' })
  })

  it('hwgFlag false → nicht blockiert', () => {
    expect(checkHwgGate(false)).toEqual({ blocked: false })
  })
})
