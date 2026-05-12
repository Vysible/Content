'use client'

import { useGenerationStream } from '@/lib/hooks/useGenerationStream'
import { GENERATION_STEPS, STEP_LABELS } from '@/lib/generation/types'

interface Props {
  jobId: string
  onComplete?: () => void
}

export function GenerationProgress({ jobId, onComplete }: Props) {
  const { status, completedSteps, lastError, failedStep, isTerminal, retry, events } =
    useGenerationStream(jobId)

  if (status === 'complete' && onComplete) {
    onComplete()
  }

  // Queue-Position aus dem letzten queue_position-Event ermitteln
  const queueEvent = [...events].reverse().find((e) => e.type === 'queue_position')
  const queuePosition = queueEvent?.data?.position as number | undefined

  return (
    <div className="bg-white border border-stone rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-nachtblau">
          {status === 'queued' ? 'In Warteschlange' : 'Generierung läuft'}
        </h3>
        <StatusBadge status={status} />
      </div>

      {status === 'queued' && queuePosition && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Position {queuePosition} in der Warteschlange – wird gestartet, sobald ein Slot frei ist.
        </div>
      )}

      <ol className="space-y-2">
        {GENERATION_STEPS.map((step, i) => {
          const done = completedSteps.includes(step)
          const active =
            !done &&
            status === 'running' &&
            (i === 0 || completedSteps.includes(GENERATION_STEPS[i - 1]))
          const failed = failedStep === step

          return (
            <li key={step} className="flex items-center gap-3 text-sm">
              <StepIcon done={done} active={active} failed={failed} index={i} />
              <span
                className={
                  done
                    ? 'text-green-700 font-medium'
                    : active
                      ? 'text-tiefblau font-medium'
                      : failed
                        ? 'text-red-600 font-medium'
                        : 'text-stahlgrau'
                }
              >
                {STEP_LABELS[step]}
              </span>
            </li>
          )
        })}
      </ol>

      {lastError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium mb-2">Fehler aufgetreten</p>
          <p className="text-xs text-red-600 mb-3">{lastError}</p>
          {failedStep && (
            <button
              onClick={retry}
              className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Ab „{STEP_LABELS[failedStep as keyof typeof STEP_LABELS]}" wiederholen
            </button>
          )}
        </div>
      )}

      {status === 'complete' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-medium">Generierung abgeschlossen!</p>
        </div>
      )}

      {!isTerminal && (
        <div className="mt-4">
          <ProgressBar total={GENERATION_STEPS.length} done={completedSteps.length} />
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    pending: 'bg-stone text-stahlgrau',
    queued: 'bg-amber-100 text-amber-700',
    running: 'bg-blue-100 text-tiefblau',
    complete: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    pending: 'Wartend',
    queued: 'In Warteschlange',
    running: 'Läuft',
    complete: 'Abgeschlossen',
    error: 'Fehler',
  }
  const cls = (status && map[status]) ?? 'bg-stone text-stahlgrau'
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {(status && labels[status]) ?? '–'}
    </span>
  )
}

function StepIcon({
  done,
  active,
  failed,
  index,
}: {
  done: boolean
  active: boolean
  failed: boolean
  index: number
}) {
  if (done) {
    return (
      <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">
        ✓
      </span>
    )
  }
  if (failed) {
    return (
      <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">
        ✕
      </span>
    )
  }
  if (active) {
    return (
      <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-tiefblau animate-pulse" />
      </span>
    )
  }
  return (
    <span className="w-6 h-6 rounded-full bg-stone flex items-center justify-center text-stahlgrau text-xs flex-shrink-0">
      {index + 1}
    </span>
  )
}

function ProgressBar({ total, done }: { total: number; done: number }) {
  const pct = Math.round((done / total) * 100)
  return (
    <div className="w-full bg-stone rounded-full h-1.5">
      <div
        className="bg-tiefblau h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
