import { describe, it, expect } from 'vitest'
import { lintSocialText } from '@/lib/social/preview-lint'

describe('lintSocialText', () => {
  it('meldet Hinweis bei leerem Text', () => {
    const issues = lintSocialText('', 'SOCIAL_INSTAGRAM')
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe('info')
  })

  it('meldet keine Probleme bei kurzem Text innerhalb des Preview-Cutoffs', () => {
    const issues = lintSocialText('Kurzer Text ohne Hashtags.', 'SOCIAL_INSTAGRAM')
    expect(issues).toEqual([])
  })

  it('Instagram: meldet Abschneide-Hinweis über dem Preview-Cutoff', () => {
    const text = 'x'.repeat(200)
    const issues = lintSocialText(text, 'SOCIAL_INSTAGRAM')
    expect(issues.some((i) => i.severity === 'info' && i.message.includes('mehr anzeigen'))).toBe(true)
  })

  it('Instagram: meldet Fehler über dem harten Limit (2200)', () => {
    const text = 'x'.repeat(2_300)
    const issues = lintSocialText(text, 'SOCIAL_INSTAGRAM')
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('Limit'))).toBe(true)
  })

  it('Instagram: meldet zu viele Hashtags (>30)', () => {
    const text = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(' ')
    const issues = lintSocialText(text, 'SOCIAL_INSTAGRAM')
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('Hashtags'))).toBe(true)
  })

  it('Facebook: nutzt eigenen Preview-Cutoff (477)', () => {
    const text = 'x'.repeat(500)
    const issues = lintSocialText(text, 'SOCIAL_FACEBOOK')
    expect(issues.some((i) => i.message.includes('Facebook'))).toBe(true)
  })

  it('LinkedIn: meldet Fehler über dem harten Limit (3000)', () => {
    const text = 'x'.repeat(3_100)
    const issues = lintSocialText(text, 'SOCIAL_LINKEDIN')
    expect(issues.some((i) => i.severity === 'error')).toBe(true)
  })
})
