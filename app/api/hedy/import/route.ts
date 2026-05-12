import { requireAuth } from '@/lib/auth/session'
import { generatePositioningFromTranscript } from '@/lib/hedy/client'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  await requireAuth()

  const { projectId, transcript } = await req.json()
  if (!transcript) {
    return NextResponse.json({ error: 'transcript erforderlich' }, { status: 400 })
  }

  const positioning = await generatePositioningFromTranscript(transcript, projectId ?? 'wizard')

  if (projectId) {
    await prisma.project.update({
      where: { id: projectId },
      data: { positioningDocument: positioning },
    })
  }

  return NextResponse.json({ positioning })
}
