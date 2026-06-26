import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const TEST_SECRET = 'a'.repeat(64)
vi.stubEnv('ENCRYPTION_SECRET', TEST_SECRET)

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'test@vysible.de', role: 'ADMIN' },
  }),
}))

vi.mock('@/lib/audit/logger', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const baseBody = {
  name: 'Testprojekt',
  praxisUrl: 'https://praxis.de',
  praxisName: 'Testpraxis',
  planningStart: '2026-07-01',
  planningEnd: '2026-12-31',
  channels: ['BLOG'],
}

describe('POST /api/projects — positioningDocument-Verschlüsselung', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.project.create).mockResolvedValue({ id: 'proj-new', name: 'Testprojekt' } as never)
  })

  it('speichert positioningDocument verschlüsselt (v1: Präfix)', async () => {
    const { POST } = await import('@/app/api/projects/route')
    const res = await POST(makeRequest({ ...baseBody, positioningDocument: 'USPs der Praxis' }))
    expect(res.status).toBe(201)

    const createCall = vi.mocked(prisma.project.create).mock.calls[0]?.[0]
    const stored = createCall?.data?.positioningDocument as string
    expect(stored).toMatch(/^v1:/)
    expect(stored).not.toContain('USPs der Praxis')
  })

  it('speichert null wenn kein positioningDocument übergeben', async () => {
    const { POST } = await import('@/app/api/projects/route')
    await POST(makeRequest({ ...baseBody }))

    const createCall = vi.mocked(prisma.project.create).mock.calls[0]?.[0]
    expect(createCall?.data?.positioningDocument).toBeNull()
  })
})
