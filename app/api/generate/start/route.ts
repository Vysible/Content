import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { createJob } from '@/lib/generation/job-store'
import { runGenerationPipeline } from '@/lib/generation/pipeline'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  await requireAuth()

  const { projectId } = await req.json()
  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const job = createJob(projectId)

  // Fire-and-forget: Pipeline läuft asynchron
  runGenerationPipeline(job.id, project).catch((err) => {
    console.error('[Vysible] Unhandled pipeline error:', err)
  })

  return NextResponse.json({ jobId: job.id })
}
