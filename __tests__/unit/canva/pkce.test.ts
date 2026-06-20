import { describe, it, expect } from 'vitest'
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/canva/pkce'
import crypto from 'crypto'

describe('PKCE', () => {
  describe('generateCodeVerifier', () => {
    it('liefert einen String der Länge 43 (32 Bytes base64url)', () => {
      const v = generateCodeVerifier()
      expect(typeof v).toBe('string')
      // 32 Bytes base64url = 43 Zeichen
      expect(v.length).toBe(43)
    })

    it('enthält nur base64url-Zeichen', () => {
      const v = generateCodeVerifier()
      expect(/^[A-Za-z0-9_-]+$/.test(v)).toBe(true)
    })

    it('ist bei jedem Aufruf einzigartig', () => {
      const a = generateCodeVerifier()
      const b = generateCodeVerifier()
      expect(a).not.toBe(b)
    })
  })

  describe('generateCodeChallenge', () => {
    it('erzeugt SHA-256 base64url-Digest des Verifiers', () => {
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
      const expected = crypto.createHash('sha256').update(verifier).digest('base64url')
      expect(generateCodeChallenge(verifier)).toBe(expected)
    })

    it('ist deterministisch', () => {
      const v = generateCodeVerifier()
      expect(generateCodeChallenge(v)).toBe(generateCodeChallenge(v))
    })

    it('enthält nur base64url-Zeichen', () => {
      const challenge = generateCodeChallenge(generateCodeVerifier())
      expect(/^[A-Za-z0-9_-]+$/.test(challenge)).toBe(true)
    })
  })
})
