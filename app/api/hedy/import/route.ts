import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { listSessions, fetchTranscript, generatePositioningFromTranscript } from '@/lib/hedy/client'
import { prepareTranscriptForPrompt } from '@/lib/hedy/transcript-parser'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  await requireAuth()

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'HEDY', active: true },
  })
  if (!apiKey) {
    return NextResponse.json({ error: 'Hedy API-Key nicht konfiguriert' }, { status: 422 })
  }
  const hedyKey = decrypt(apiKey.encryptedKey)

  try {
    if (action === 'sessions') {
      const sessions = await listSessions(hedyKey)
      return NextResponse.json({ sessions })
    }

    if (action === 'transcript') {
      const sessionId = searchParams.get('id')
      if (!sessionId) return NextResponse.json({ error: 'id fehlt' }, { status: 400 })
      const transcript = await fetchTranscript(sessionId, hedyKey)
      return NextResponse.json({ transcript: prepareTranscriptForPrompt(transcript) })
    }

    return NextResponse.json({ error: 'Unbekannte action' }, { status: 400 })
  } catch (exc: unknown) {
    logger.error({ err: exc }, '[Vysible] Hedy API-Aufruf fehlgeschlagen')
    return NextResponse.json({ error: 'Hedy-Abruf fehlgeschlagen' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await requireAuth()

  const { projectId, transcript } = await req.json() as {
    projectId?: string
    transcript: string
  }

  if (!transcript?.trim()) {
    return NextResponse.json({ error: 'transcript erforderlich' }, { status: 400 })
  }

  try {
    const document = await generatePositioningFromTranscript(
      transcript,
      projectId ?? 'wizard',
    )

    if (projectId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { positioningDocument: document },
      })
    }

    return NextResponse.json({ document })
  } catch (exc: unknown) {
    logger.error({ err: exc }, '[Vysible] Hedy POST fehlgeschlagen')
    return NextResponse.json({ error: 'KI-Transformation fehlgeschlagen' }, { status: 500 })
  }
}
