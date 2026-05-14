import { requireAuth } from '@/lib/auth/session'
import { getJob } from '@/lib/generation/job-store'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  await requireAuth()

  const job = await getJob(params.jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json({
    status: job.status,
    completedSteps: job.completedSteps,
    events: job.events,
    lastError: job.lastError,
    failedStep: job.failedStep,
    queuePosition: job.queuePosition,
  })
}
