import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const TEST_SECRET = 'a'.repeat(64)

vi.stubEnv('ENCRYPTION_SECRET', TEST_SECRET)

describe('loadCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('wirft wenn kein Eintrag vorhanden', async () => {
    vi.mocked(prisma.projectIntegration.findUnique).mockResolvedValue(null)
    const { loadCredentials } = await import('@/lib/integrations/store')
    await expect(loadCredentials('proj-1', 'META')).rejects.toThrow('Keine META-Zugangsdaten')
  })

  it('entschlüsselt und gibt Credentials zurück', async () => {
    const { encrypt } = await import('@/lib/crypto/aes')
    const creds = { pageAccessToken: 'tok123' }
    vi.mocked(prisma.projectIntegration.findUnique).mockResolvedValue({
      credentials: encrypt(JSON.stringify(creds)),
    } as never)

    const { loadCredentials } = await import('@/lib/integrations/store')
    const result = await loadCredentials<{ pageAccessToken: string }>('proj-1', 'META')
    expect(result.pageAccessToken).toBe('tok123')
  })

  it('wirft bei korrupten Credentials', async () => {
    vi.mocked(prisma.projectIntegration.findUnique).mockResolvedValue({
      credentials: 'kein-valides-ciphertext',
    } as never)
    const { loadCredentials } = await import('@/lib/integrations/store')
    await expect(loadCredentials('proj-1', 'LINKEDIN')).rejects.toThrow('konnten nicht entschlüsselt werden')
  })
})

describe('saveIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('verschlüsselt Credentials vor dem Speichern', async () => {
    vi.mocked(prisma.projectIntegration.upsert).mockResolvedValue({} as never)
    const { saveIntegration } = await import('@/lib/integrations/store')
    await saveIntegration('proj-1', 'WORDPRESS', { url: 'https://wp.de', username: 'admin', appPassword: 'secret' })

    const upsertCall = vi.mocked(prisma.projectIntegration.upsert).mock.calls[0]?.[0]
    const storedCredentials = upsertCall?.create?.credentials as string
    // gespeicherter Wert muss v1: Präfix haben (verschlüsselt)
    expect(storedCredentials).toMatch(/^v1:/)
    // und darf den Klartext nicht enthalten
    expect(storedCredentials).not.toContain('secret')
  })
})

describe('getIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt connected: false zurück wenn kein Eintrag', async () => {
    vi.mocked(prisma.projectIntegration.findUnique).mockResolvedValue(null)
    const { getIntegration } = await import('@/lib/integrations/store')
    const result = await getIntegration('proj-1', 'KLICKTIPP')
    expect(result.connected).toBe(false)
    expect(result.config).toBeNull()
  })

  it('gibt connected: true und config zurück wenn Eintrag vorhanden', async () => {
    vi.mocked(prisma.projectIntegration.findUnique).mockResolvedValue({
      config: { listId: '42' },
    } as never)
    const { getIntegration } = await import('@/lib/integrations/store')
    const result = await getIntegration('proj-1', 'KLICKTIPP')
    expect(result.connected).toBe(true)
    expect(result.config).toEqual({ listId: '42' })
  })
})
