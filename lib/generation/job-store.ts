import { EventEmitter } from 'events'
import type { JobState, JobStatus, GenerationEvent, GenerationStep } from './types'

// EventEmitter separat vom serialisierbaren State halten
const stateMap = new Map<string, JobState>()
const emitterMap = new Map<string, EventEmitter>()

// Globaler Singleton (überlebt HMR in dev + Next.js module caching)
const g = globalThis as unknown as {
  _vysibleJobStates?: Map<string, JobState>
  _vysibleJobEmitters?: Map<string, EventEmitter>
}

if (!g._vysibleJobStates) g._vysibleJobStates = stateMap
if (!g._vysibleJobEmitters) g._vysibleJobEmitters = emitterMap

const states: Map<string, JobState> = g._vysibleJobStates
const emitters: Map<string, EventEmitter> = g._vysibleJobEmitters

const JOB_TTL_MS = 2 * 60 * 60 * 1000 // 2 Stunden

export function createJob(projectId: string): JobState {
  const id = crypto.randomUUID()
  const now = new Date()

  const state: JobState = {
    id,
    projectId,
    status: 'pending',
    completedSteps: [],
    events: [],
    createdAt: now,
    updatedAt: now,
  }

  const emitter = new EventEmitter()
  emitter.setMaxListeners(20)

  states.set(id, state)
  emitters.set(id, emitter)

  // Auto-Cleanup
  setTimeout(() => {
    states.delete(id)
    emitters.delete(id)
  }, JOB_TTL_MS)

  return state
}

export function getJob(id: string): JobState | undefined {
  return states.get(id)
}

export function getEmitter(id: string): EventEmitter | undefined {
  return emitters.get(id)
}

export function setStatus(jobId: string, status: JobStatus): void {
  const state = states.get(jobId)
  if (!state) return
  state.status = status
  state.updatedAt = new Date()
}

export function emitEvent(jobId: string, event: GenerationEvent): void {
  const state = states.get(jobId)
  const emitter = emitters.get(jobId)
  if (!state || !emitter) return

  state.events.push(event)
  state.updatedAt = new Date()

  // Abgeschlossene Schritte tracken (für Retry)
  if (
    event.type !== 'error' &&
    event.type !== 'complete' &&
    event.type !== 'connected' &&
    event.type !== 'queue_position'
  ) {
    const step = event.type as GenerationStep
    if (!state.completedSteps.includes(step)) {
      state.completedSteps.push(step)
    }
  }

  if (event.type === 'error') {
    state.status = 'error'
    state.lastError = event.error
    state.failedStep = event.failedStep
  }

  if (event.type === 'texts_done') {
    state.status = 'complete'
  }

  emitter.emit('event', event)
}

export function resetForRetry(jobId: string, fromStep: GenerationStep): void {
  const state = states.get(jobId)
  if (!state) return

  const { GENERATION_STEPS } = require('./types')
  const retryFromIndex = GENERATION_STEPS.indexOf(fromStep)

  // Erledigte Schritte bis zum Fehlerpunkt behalten
  state.completedSteps = state.completedSteps.filter(
    (s) => GENERATION_STEPS.indexOf(s) < retryFromIndex
  )

  // Events bis zum Fehlerpunkt behalten
  state.events = state.events.filter(
    (e) =>
      e.type === 'connected' ||
      e.type === 'queue_position' ||
      (e.type !== 'error' &&
        GENERATION_STEPS.indexOf(e.type as GenerationStep) < retryFromIndex)
  )

  state.status = 'running'
  state.lastError = undefined
  state.failedStep = undefined
  state.updatedAt = new Date()
}
