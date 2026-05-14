import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    auditLog:      { create: vi.fn() },
    project:       { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    generationJob: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    apiKey:        { create: vi.fn(), delete: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  },
}))
