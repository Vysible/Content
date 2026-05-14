import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

// 64 Hex-Zeichen = 32 Bytes = gültiger AES-256-Schlüssel
const TEST_SECRET = 'a'.repeat(64)

describe('AES-256-GCM encrypt/decrypt', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('ENCRYPTION_SECRET', TEST_SECRET)
  })

  it('erzeugt Format v1:iv:tag:cipher (4 Teile)', async () => {
    const { encrypt } = await import('@/lib/crypto/aes')
    const result = encrypt('Hallo Welt')
    const parts = result.split(':')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('v1')
  })

  it('Roundtrip: decrypt(encrypt(x)) === x', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto/aes')
    const plain = 'test@praxis.de'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  it('wirft bei fehlendem ENCRYPTION_SECRET', async () => {
    vi.resetModules()
    vi.stubEnv('ENCRYPTION_SECRET', '')
    const { encrypt } = await import('@/lib/crypto/aes')
    expect(() => encrypt('test')).toThrow('ENCRYPTION_SECRET')
  })

  it('wirft bei zu kurzem ENCRYPTION_SECRET', async () => {
    vi.resetModules()
    vi.stubEnv('ENCRYPTION_SECRET', 'abc')
    const { encrypt } = await import('@/lib/crypto/aes')
    expect(() => encrypt('test')).toThrow('ENCRYPTION_SECRET')
  })

  it('wirft bei korruptem Ciphertext (falsches Format)', async () => {
    const { decrypt } = await import('@/lib/crypto/aes')
    expect(() => decrypt('nicht:valide')).toThrow()
  })

  it('erzeugt unterschiedliche IVs bei gleichen Plaintexts (Zufälligkeit)', async () => {
    const { encrypt } = await import('@/lib/crypto/aes')
    const c1 = encrypt('gleicher Text')
    const c2 = encrypt('gleicher Text')
    expect(c1).not.toBe(c2)
  })
})
