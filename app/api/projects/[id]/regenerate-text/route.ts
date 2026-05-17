import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import {
  generateBlogOutlines,
  generateTexts,
} from '@/lib/generation/texts'
import { buildContext } from '@/lib/ai/context-builder'
import { logger } from '@/lib/utils/logger'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type { StoredTextResult } from '@/lib/generation/results-store'

const bodySchema = z.object({ monat: z.string().min(1) })

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return new Response(
      `data: ${JSON.stringify({ error: 'monat erforderlich' })}\n\n`,
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }
  const { monat } = parsed.data

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) {
    return new Response(
      `data: ${JSON.stringify({ error: 'Projekt nicht gefunden' })}\n\n`,
      { status: 404, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  const themes = (project.themeResults as unknown as ThemenItem[] | null) ?? []
  const theme = themes.find((t) => t.monat === monat)
  if (!theme) {
    return new Response(
      `data: ${JSON.stringify({ error: `Thema für "${monat}" nicht gefunden` })}\n\n`,
      { status: 404, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Heartbeat every 15s to keep nginx proxy alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          // stream already closed
        }
      }, 15_000)

      try {
        const { systemContext: positioningContext } = buildContext({
          positioningDocument: project.positioningDocument ?? undefined,
          keywords: project.keywords,
          themenPool: project.themenPool ?? undefined,
        })

        const blogOutlines: Record<string, string> = {}
        if (theme.kanal === 'BLOG') {
          const outlineResults = await generateBlogOutlines({
            themes: [theme],
            project,
            positioningContext,
          })
          if (outlineResults[monat]) blogOutlines[monat] = outlineResults[monat]
        }

        const [newResult] = await generateTexts({
          project,
          themes: [theme],
          positioningContext,
          blogOutlines,
        })

        const existing = (project.textResults as unknown as StoredTextResult[] | null) ?? []
        const idx = existing.findIndex((r) => r.monat === monat)
        const merged: StoredTextResult[] = idx >= 0
          ? existing.map((r, i) => i === idx ? { ...r, ...newResult } : r)
          : [...existing, newResult as StoredTextResult]

        await prisma.project.update({
          where: { id: params.id },
          data: { textResults: merged as unknown as Prisma.InputJsonValue },
        })

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ok: true, result: newResult })}\n\n`))
      } catch (err) {
        logger.error({ err, projectId: params.id, monat }, 'Neugenerierung fehlgeschlagen')
        const message = err instanceof Error ? err.message : 'Generierung fehlgeschlagen'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    },
  })
}
