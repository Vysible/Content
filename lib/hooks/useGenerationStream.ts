'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { GenerationEvent, JobStatus, GenerationStep } from '@/lib/generation/types'

interface StreamState {
  status: JobStatus | null
  events: GenerationEvent[]
  completedSteps: GenerationStep[]
  lastError: string | undefined
  failedStep: GenerationStep | undefined
}

const POLL_INTERVAL_MS = 3_000

export function useGenerationStream(jobId: string | null) {
  const [state, setState] = useState<StreamState>({
    status: null,
    events: [],
    completedSteps: [],
    lastError: undefined,
    failedStep: undefined,
  })

  const esRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isTerminal = state.status === 'complete' || state.status === 'error'

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    if (!jobId || pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/status/${jobId}`)
        if (!res.ok) return
        const data = await res.json()
        setState({
          status: data.status,
          events: data.events ?? [],
          completedSteps: data.completedSteps ?? [],
          lastError: data.lastError,
          failedStep: data.failedStep,
        })
        if (data.status === 'complete' || data.status === 'error') {
          stopPolling()
        }
      } catch (err: unknown) {
        console.warn('[Vysible] useGenerationStream: Polling-Netzwerkfehler — nächstes Intervall wird es erneut versuchen', err)
      }
    }, POLL_INTERVAL_MS)
  }, [jobId, stopPolling])

  useEffect(() => {
    if (!jobId) return

    // EventSource primär versuchen
    const es = new EventSource(`/api/generate/stream/${jobId}`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const event: GenerationEvent = JSON.parse(e.data)
        setState((prev) => {
          const newEvents = [...prev.events, event]
          const newCompleted =
            event.type !== 'error' &&
            event.type !== 'complete' &&
            event.type !== 'connected' &&
            event.type !== 'queue_position' &&
            !prev.completedSteps.includes(event.type as GenerationStep)
              ? [...prev.completedSteps, event.type as GenerationStep]
              : prev.completedSteps

          let newStatus: JobStatus | null = prev.status
          if (event.type === 'texts_done') newStatus = 'complete'
          if (event.type === 'error') newStatus = 'error'

          return {
            status: newStatus,
            events: newEvents,
            completedSteps: newCompleted,
            lastError: event.type === 'error' ? event.error : prev.lastError,
            failedStep: event.type === 'error' ? event.failedStep : prev.failedStep,
          }
        })

        if (event.type === 'texts_done' || event.type === 'error') {
          es.close()
          stopPolling()
        }
      } catch (err: unknown) {
        console.warn('[Vysible] useGenerationStream: Ungültiges JSON in SSE-Nachricht ignoriert', err)
      }
    }

    es.onerror = () => {
      // SSE fehlgeschlagen → Polling-Fallback
      es.close()
      startPolling()
    }

    return () => {
      es.close()
      stopPolling()
    }
  }, [jobId, startPolling, stopPolling])

  const retry = useCallback(async () => {
    if (!jobId) return
    await fetch(`/api/generate/retry/${jobId}`, { method: 'POST' })
    setState((prev) => ({ ...prev, status: 'running', lastError: undefined }))
    // Neuer SSE-Stream wird durch Re-Mount getriggert — Parent muss jobId stabil halten
  }, [jobId])

  return { ...state, isTerminal, retry }
}
