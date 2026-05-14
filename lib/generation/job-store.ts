import { EventEmitter } from 'events'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { GenerationEvent, GenerationStep, JobState, JobStatus } from './types'
import { GENERATION_STEPS } from './types'

// EventEmitters leben ausschliesslich im Speicher (nicht serialisierbar).
// Der persistierbare JobState wird in der DB gespeichert (GenerationJob-Tabelle).
const emitterMap = new Map<string, EventEmitter>()

const g = globalThis as unknown as {
  _vysibleJobEmitters?: Map<string, EventEmitter>
}
if (!g._vysibleJobEmitters) g._vysibleJobEmitters = emitterMap
const emitters: Map<string, EventEmitter> = g._vysibleJobEmitters

// DB-Status → TypeScript-JobStatus
function dbStatusToJobStatus(
  dbStatus: 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETE' | 'ERROR',
): JobStatus {
  return dbStatus.toLowerCase() as JobStatus
}

// TypeScript-JobStatus → DB-Enum-String
function jobStatusToDb(
  status: JobStatus,
): 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETE' | 'ERROR' {
  return status.toUpperCase() as 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETE' | 'ERROR'
}

function dbRecordToJobState(record: {
  id: string
  projectId: string
  status: string
  completedSteps: string[]
  events: unknown
  lastError: string | null
  failedStep: string | null
  queuePosition: number | null
  createdAt: Date
  updatedAt: Date
}): JobState {
  return {
    id: record.id,
    projectId: record.projectId,
    status: dbStatusToJobStatus(record.status as 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETE' | 'ERROR'),
    completedSteps: record.completedSteps as GenerationStep[],
    events: ((record.events as unknown) as GenerationEvent[]) ?? [],
    lastError: record.lastError ?? undefined,
    failedStep: (record.failedStep as GenerationStep | null) ?? undefined,
    queuePosition: record.queuePosition ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function getOrCreateEmitter(jobId: string): EventEmitter {
  let emitter = emitters.get(jobId)
  if (!emitter) {
    emitter = new EventEmitter()
    emitter.setMaxListeners(20)
    emitters.set(jobId, emitter)
  }
  return emitter
}

export async function createJob(projectId: string): Promise<JobState> {
  const record = await prisma.generationJob.create({
    data: {
      projectId,
      status: 'PENDING',
      completedSteps: [],
      events: [],
    },
  })

  getOrCreateEmitter(record.id)
  return dbRecordToJobState(record)
}

export async function getJob(id: string): Promise<JobState | undefined> {
  const record = await prisma.generationJob.findUnique({ where: { id } })
  if (!record) return undefined
  return dbRecordToJobState(record)
}

export function getEmitter(id: string): EventEmitter | undefined {
  return emitters.get(id)
}

export async function setStatus(jobId: string, status: JobStatus): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: jobStatusToDb(status) },
  })
}

export async function emitEvent(jobId: string, event: GenerationEvent): Promise<void> {
  const record = await prisma.generationJob.findUnique({ where: { id: jobId } })
  if (!record) return

  const events = [...(((record.events as unknown) as GenerationEvent[]) ?? []), event]

  const completedSteps = [...record.completedSteps] as GenerationStep[]
  if (
    event.type !== 'error' &&
    event.type !== 'complete' &&
    event.type !== 'connected' &&
    event.type !== 'queue_position'
  ) {
    const step = event.type as GenerationStep
    if (!completedSteps.includes(step)) {
      completedSteps.push(step)
    }
  }

  const serializedEvents = JSON.parse(JSON.stringify(events)) as Prisma.InputJsonValue

  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      events: serializedEvents,
      completedSteps,
      ...(event.type === 'error' && {
        status: 'ERROR' as const,
        lastError: event.error ?? null,
        failedStep: event.failedStep ?? null,
      }),
      ...(event.type === 'texts_done' && { status: 'COMPLETE' as const }),
    },
  })

  const emitter = emitters.get(jobId)
  emitter?.emit('event', event)
}

export async function resetForRetry(jobId: string, fromStep: GenerationStep): Promise<void> {
  const record = await prisma.generationJob.findUnique({ where: { id: jobId } })
  if (!record) return

  const retryFromIndex = GENERATION_STEPS.indexOf(fromStep)

  const completedSteps = (record.completedSteps as GenerationStep[]).filter(
    (s) => GENERATION_STEPS.indexOf(s) < retryFromIndex,
  )

  const events = (((record.events as unknown) as GenerationEvent[]) ?? []).filter(
    (e) =>
      e.type === 'connected' ||
      e.type === 'queue_position' ||
      (e.type !== 'error' && GENERATION_STEPS.indexOf(e.type as GenerationStep) < retryFromIndex),
  )

  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: 'RUNNING',
      completedSteps,
      events: JSON.parse(JSON.stringify(events)),
      lastError: null,
      failedStep: null,
    },
  })
}
