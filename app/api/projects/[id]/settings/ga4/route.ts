import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

const patchSchema = z.object({
  ga4PropertyId: z.string(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, ga4PropertyId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ ga4PropertyId: project.ga4PropertyId ?? '' })
  } catch (err) {
    logger.error({ err, projectId: params.id }, 'GA4 Settings GET: Fehler')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Felder' }, { status: 400 })
  }

  try {
    const updated = await prisma.project.update({
      where: { id: params.id },
      data: { ga4PropertyId: parsed.data.ga4PropertyId || null },
      select: { id: true, ga4PropertyId: true },
    })

    logger.info({ projectId: params.id }, 'GA4 Property ID aktualisiert')

    return NextResponse.json({ ga4PropertyId: updated.ga4PropertyId ?? '' })
  } catch (err) {
    logger.error({ err, projectId: params.id }, 'GA4 Settings PATCH: Fehler')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
