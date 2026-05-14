import { getJob, setStatus, emitEvent } from './job-store'

const MAX_CONCURRENT = 3

const g = globalThis as unknown as {
  _vysibleQueue?: string[]
  _vysibleRunning?: number
}

if (!g._vysibleQueue) g._vysibleQueue = []
if (g._vysibleRunning === undefined) g._vysibleRunning = 0

const queue: string[] = g._vysibleQueue

function getRunning(): number {
  return g._vysibleRunning ?? 0
}
function setRunning(n: number): void {
  g._vysibleRunning = n
}

export function getQueueLength(): number {
  return queue.length
}

export function getRunningCount(): number {
  return getRunning()
}

/**
 * Versucht, den Job direkt zu starten. Falls alle Slots belegt sind,
 * wird der Job in die Warteschlange eingereiht und die Queue-Position
 * als SSE-Event gemeldet.
 */
export async function tryEnqueue(
  jobId: string,
  runner: () => Promise<void>,
): Promise<boolean> {
  if (getRunning() < MAX_CONCURRENT) {
    runNow(jobId, runner)
    return true
  }

  queue.push(jobId)
  const position = queue.length

  await setStatus(jobId, 'queued')
  await emitEvent(jobId, {
    type: 'queue_position',
    data: { position },
    timestamp: new Date().toISOString(),
  })

  runnerMap.set(jobId, runner)

  return false
}

const runnerMapG = globalThis as unknown as { _vysibleRunnerMap?: Map<string, () => Promise<void>> }
if (!runnerMapG._vysibleRunnerMap) runnerMapG._vysibleRunnerMap = new Map()
const runnerMap: Map<string, () => Promise<void>> = runnerMapG._vysibleRunnerMap

function runNow(jobId: string, runner: () => Promise<void>): void {
  setRunning(getRunning() + 1)
  runner().finally(() => {
    setRunning(Math.max(0, getRunning() - 1))
    dequeueNext()
  })
}

function dequeueNext(): void {
  if (queue.length === 0) return
  if (getRunning() >= MAX_CONCURRENT) return

  const nextJobId = queue.shift()!
  const runner = runnerMap.get(nextJobId)
  runnerMap.delete(nextJobId)

  if (!runner) return

  // Queue-Status und Positionen aktualisieren (fire-and-forget, unkritisch)
  getJob(nextJobId)
    .then((job) => {
      if (!job || job.status === 'error') return

      const updatePositions = queue.map((id, idx) =>
        emitEvent(id, {
          type: 'queue_position',
          data: { position: idx + 1 },
          timestamp: new Date().toISOString(),
        }),
      )
      return Promise.all(updatePositions)
    })
    .catch((err: unknown) => {
      console.warn('[Vysible] [WARN] Queue-Positions-Update fehlgeschlagen:', err)
    })

  runNow(nextJobId, runner)
}

export function estimatedQueueWaitSeconds(): number {
  return queue.length * 30
}
