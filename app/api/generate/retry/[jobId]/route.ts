import { requireAuth } from '@/lib/auth/session'
import { getJob } from '@/lib/generation/job-store'
import { retryPipeline } from '@/lib/generation/pipeline'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import type { GenerationStep } from '@/lib/generation/types'

export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  await requireAuth()

  const job = await getJob(params.jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job nicht gefunden' }, { status: 404 })
  }

  if (job.status !== 'error') {
    return NextResponse.json({ error: 'Job ist nicht im Fehler-Status' }, { status: 400 })
  }

  if (!job.failedStep) {
    return NextResponse.json({ error: 'Kein fehlgeschlagener Schritt bekannt' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({ where: { id: job.projectId } })
  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  retryPipeline(params.jobId, job.failedStep as GenerationStep, project).catch((err: unknown) => {
    console.error('[Vysible] [FAIL] Unhandled retry error:', err)
  })

  return NextResponse.json({ ok: true })
}
