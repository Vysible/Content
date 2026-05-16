import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { fetchGoogleAdsMetrics } from '@/lib/google-ads/client'

const REQUIRED_ENV_VARS = [
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN',
]

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const missingEnv = REQUIRED_ENV_VARS.find((v) => !process.env[v])
  if (missingEnv) {
    return NextResponse.json(
      { error: 'Google Ads nicht konfiguriert' },
      { status: 503 },
    )
  }

  let project: { id: string; googleAdsCustomerId: string | null } | null

  try {
    project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, googleAdsCustomerId: true },
    })
  } catch (err) {
    logger.error({ err, projectId: params.id }, 'Google Ads: DB-Fehler beim Laden des Projekts')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  if (!project.googleAdsCustomerId) {
    return NextResponse.json(
      { error: 'Keine Google Ads Customer-ID hinterlegt' },
      { status: 422 },
    )
  }

  try {
    const metrics = await fetchGoogleAdsMetrics(project.googleAdsCustomerId)
    return NextResponse.json(metrics)
  } catch (err) {
    logger.error(
      { err, projectId: params.id, customerId: project.googleAdsCustomerId },
      'Google Ads Metriken-Abruf fehlgeschlagen',
    )
    const message = err instanceof Error ? err.message : 'Google Ads Fehler'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
