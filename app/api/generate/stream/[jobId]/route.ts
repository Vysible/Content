import { requireAuth } from '@/lib/auth/session'
import { getJob, getEmitter } from '@/lib/generation/job-store'
import type { GenerationEvent } from '@/lib/generation/types'

export const dynamic = 'force-dynamic'

function formatSSE(event: GenerationEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  await requireAuth()

  const { jobId } = params
  const job = getJob(jobId)

  if (!job) {
    return new Response('Job nicht gefunden', { status: 404 })
  }

  const emitter = getEmitter(jobId)
  if (!emitter) {
    return new Response('Job-Emitter nicht gefunden', { status: 404 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Vergangene Events sofort abspielen (Reconnect-Support)
      for (const event of job.events) {
        controller.enqueue(encoder.encode(formatSSE(event)))
      }

      // Bereits abgeschlossene Jobs sofort schließen
      if (job.status === 'complete' || job.status === 'error') {
        controller.close()
        return
      }

      const onEvent = (event: GenerationEvent) => {
        try {
          controller.enqueue(encoder.encode(formatSSE(event)))
        } catch {
          // Client hat Verbindung getrennt
        }

        if (event.type === 'texts_done' || event.type === 'error') {
          emitter.off('event', onEvent)
          try {
            controller.close()
          } catch {
            // bereits geschlossen
          }
        }
      }

      emitter.on('event', onEvent)

      req.signal.addEventListener('abort', () => {
        emitter.off('event', onEvent)
        try {
          controller.close()
        } catch {
          // bereits geschlossen
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx/Cloudflare buffering deaktivieren
    },
  })
}
