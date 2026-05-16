import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

const patchSchema = z.object({
  googleAdsCustomerId: z.string(),
})

function normalizeCustomerId(id: string): string {
  return id.replace(/-/g, '')
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, googleAdsCustomerId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ googleAdsCustomerId: project.googleAdsCustomerId ?? '' })
  } catch (err) {
    logger.error({ err, projectId: params.id }, 'Google Ads Settings GET: Fehler')
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

  const normalized = parsed.data.googleAdsCustomerId
    ? normalizeCustomerId(parsed.data.googleAdsCustomerId)
    : null

  try {
    const updated = await prisma.project.update({
      where: { id: params.id },
      data: { googleAdsCustomerId: normalized || null },
      select: { id: true, googleAdsCustomerId: true },
    })

    logger.info({ projectId: params.id }, 'Google Ads Customer-ID aktualisiert')

    return NextResponse.json({ googleAdsCustomerId: updated.googleAdsCustomerId ?? '' })
  } catch (err) {
    logger.error({ err, projectId: params.id }, 'Google Ads Settings PATCH: Fehler')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
