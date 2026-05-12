import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { createJob } from '@/lib/generation/job-store'
import { runGenerationPipeline } from '@/lib/generation/pipeline'
import { tryEnqueue } from '@/lib/generation/queue'
import { rateLimit } from '@/lib/ratelimit'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await requireAuth()
  const userId = (session as { user?: { id?: string } }).user?.id ?? 'unknown'

  if (!rateLimit(`generate:${userId}`, 3, 60_000)) {
    return NextResponse.json({ error: 'Zu viele Anfragen — bitte 1 Minute warten' }, { status: 429 })
  }

  const { projectId } = await req.json()
  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  // Pre-flight: Praxis-URL vorhanden?
  if (!project.praxisUrl) {
    return NextResponse.json({ error: 'Praxis-URL fehlt – bitte im Projekt ergänzen' }, { status: 422 })
  }

  // Pre-flight: Aktiver Anthropic-Key vorhanden?
  const hasKey = await prisma.apiKey.findFirst({
    where: { provider: 'ANTHROPIC', active: true },
    select: { id: true },
  })
  if (!hasKey) {
    return NextResponse.json(
      { error: 'Kein aktiver Anthropic-API-Key konfiguriert – bitte unter Einstellungen hinterlegen' },
      { status: 422 }
    )
  }

  const job = createJob(projectId)

  tryEnqueue(job.id, () => runGenerationPipeline(job.id, project))

  return NextResponse.json({ jobId: job.id })
}
