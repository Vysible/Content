import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { fetchGA4Metrics } from '@/lib/ga4/client'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  if (!process.env.GA4_SERVICE_ACCOUNT_JSON) {
    return NextResponse.json(
      { error: 'GA4 Service Account nicht konfiguriert' },
      { status: 503 },
    )
  }

  let project: { id: string; ga4PropertyId: string | null } | null

  try {
    project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, ga4PropertyId: true },
    })
  } catch (err) {
    logger.error({ err, projectId: params.id }, 'GA4 analytics: DB-Fehler beim Laden des Projekts')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  if (!project.ga4PropertyId) {
    return NextResponse.json(
      { error: 'Keine GA4-Property-ID hinterlegt' },
      { status: 422 },
    )
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate') ?? '28daysAgo'
  const endDate = searchParams.get('endDate') ?? 'today'

  try {
    const metrics = await fetchGA4Metrics(project.ga4PropertyId, startDate, endDate)
    return NextResponse.json(metrics)
  } catch (err) {
    logger.error({ err, projectId: params.id, propertyId: project.ga4PropertyId }, 'GA4 Metriken-Abruf fehlgeschlagen')
    const message = err instanceof Error ? err.message : 'GA4-Fehler'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
