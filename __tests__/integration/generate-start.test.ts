import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'test@vysible.de', role: 'ADMIN' },
  }),
}))

vi.mock('@/lib/generation/job-store', () => ({
  createJob: vi.fn().mockResolvedValue({ id: 'job-123' }),
}))

vi.mock('@/lib/generation/queue', () => ({
  tryEnqueue: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/generation/pipeline', () => ({
  runGenerationPipeline: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/ratelimit', () => ({
  rateLimit: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/audit/logger', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

const mockProject = {
  id:          'project-1',
  praxisUrl:   'https://praxis.de',
  channels:    ['BLOG'],
  name:        'Testpraxis',
  praxisName:  'Testpraxis',
}

const mockApiKey = { id: 'key-1' }

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/generate/start', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

describe('POST /api/generate/start', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(mockApiKey as never)
  })

  it('valider Request → 200 mit jobId', async () => {
    const { POST } = await import('@/app/api/generate/start/route')
    const res = await POST(makeRequest({ projectId: 'project-1' }))
    const body = await res.json() as { jobId: string }

    expect(res.status).toBe(200)
    expect(body.jobId).toBe('job-123')
  })

  it('fehlende projectId → 400', async () => {
    const { POST } = await import('@/app/api/generate/start/route')
    const res = await POST(makeRequest({}))

    expect(res.status).toBe(400)
  })

  it('nicht-existierendes Projekt → 404', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)
    const { POST } = await import('@/app/api/generate/start/route')
    const res = await POST(makeRequest({ projectId: 'nonexistent' }))

    expect(res.status).toBe(404)
  })

  it('Projekt ohne praxisUrl → 422', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ ...mockProject, praxisUrl: null } as never)
    const { POST } = await import('@/app/api/generate/start/route')
    const res = await POST(makeRequest({ projectId: 'project-1' }))

    expect(res.status).toBe(422)
  })
})
