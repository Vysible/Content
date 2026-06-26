import { requireAuth } from '@/lib/auth/session'
import { getJob, getEmitter } from '@/lib/generation/job-store'
import type { GenerationEvent } from '@/lib/generation/types'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

function formatSSE(event: GenerationEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  await requireAuth()

  const { jobId } = params
  const job = await getJob(jobId)

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

      // Keepalive-Ping alle 20s — verhindert Nginx/Traefik proxy_read_timeout (default 60s)
      // SSE-Kommentare sind für EventSource unsichtbar, halten aber die Verbindung offen.
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(keepalive)
        }
      }, 20_000)

      const onEvent = (event: GenerationEvent) => {
        try {
          controller.enqueue(encoder.encode(formatSSE(event)))
        } catch (err: unknown) {
          logger.warn({ err, jobId }, '[Vysible] SSE enqueue fehlgeschlagen — Client getrennt')
        }

        if (event.type === 'texts_done' || event.type === 'error') {
          clearInterval(keepalive)
          emitter.off('event', onEvent)
          try {
            controller.close()
          } catch (err: unknown) {
            logger.warn({ err, jobId }, '[Vysible] SSE controller.close fehlgeschlagen — bereits geschlossen')
          }
        }
      }

      emitter.on('event', onEvent)

      req.signal.addEventListener('abort', () => {
        logger.info({ jobId }, '[Vysible] SSE-Verbindung geschlossen (Client-Disconnect)')
        clearInterval(keepalive)
        emitter.off('event', onEvent)
        try {
          controller.close()
        } catch (err: unknown) {
          logger.warn({ err, jobId }, '[Vysible] SSE controller.close bei abort fehlgeschlagen — bereits geschlossen')
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
