import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const TEST_SECRET = 'a'.repeat(64)
vi.stubEnv('ENCRYPTION_SECRET', TEST_SECRET)

vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'test@vysible.de', role: 'ADMIN' },
  }),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/projects/proj-1/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/projects/[id]/settings — positioningDocument-Verschlüsselung', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.project.update).mockResolvedValue({ id: 'proj-1' } as never)
  })

  it('verschlüsselt positioningDocument beim Update', async () => {
    const { PATCH } = await import('@/app/api/projects/[id]/settings/route')
    const res = await PATCH(
      makeRequest({ positioningDocument: 'Neue Positionierung' }),
      { params: { id: 'proj-1' } },
    )
    expect(res.status).toBe(200)

    const updateCall = vi.mocked(prisma.project.update).mock.calls[0]?.[0]
    const stored = updateCall?.data?.positioningDocument as string
    expect(stored).toMatch(/^v1:/)
    expect(stored).not.toContain('Neue Positionierung')
  })

  it('setzt positioningDocument auf null bei leerem String', async () => {
    const { PATCH } = await import('@/app/api/projects/[id]/settings/route')
    await PATCH(
      makeRequest({ positioningDocument: '' }),
      { params: { id: 'proj-1' } },
    )

    const updateCall = vi.mocked(prisma.project.update).mock.calls[0]?.[0]
    expect(updateCall?.data?.positioningDocument).toBeNull()
  })

  it('ändert positioningDocument nicht wenn nicht im Body', async () => {
    const { PATCH } = await import('@/app/api/projects/[id]/settings/route')
    await PATCH(
      makeRequest({ name: 'Neuer Name' }),
      { params: { id: 'proj-1' } },
    )

    const updateCall = vi.mocked(prisma.project.update).mock.calls[0]?.[0]
    expect(updateCall?.data).not.toHaveProperty('positioningDocument')
  })
})
