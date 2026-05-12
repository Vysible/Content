import { requireAuth } from '@/lib/auth/session'
import { generateImageBrief } from '@/lib/image/brief-generator'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  await requireAuth()

  const { projectId, thema, praxisName, kanal, canvaOrdner, generateDalle } = await req.json()
  if (!projectId || !thema || !praxisName || !kanal) {
    return NextResponse.json({ error: 'projectId, thema, praxisName und kanal erforderlich' }, { status: 400 })
  }

  const brief = await generateImageBrief({ projectId, thema, praxisName, kanal, canvaOrdner, generateDalle })
  return NextResponse.json(brief)
}
