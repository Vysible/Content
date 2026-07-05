import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { PortalAccess } from './PortalAccess'
import type { StoredTextResult } from '@/lib/generation/results-store'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type { GA4Metrics } from '@/lib/ga4/client'
import type { GoogleAdsMetrics } from '@/lib/google-ads/client'
import { fetchGA4Metrics } from '@/lib/ga4/client'
import { fetchGoogleAdsMetrics } from '@/lib/google-ads/client'
import { listFolderAssets } from '@/lib/canva/client'
import type { CanvaAsset } from '@/lib/canva/client'
import { logger } from '@/lib/utils/logger'

const ADS_ENV_VARS = [
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN',
]

export default async function PortalPage({ params }: { params: { token: string } }) {
  const link = await prisma.portalLink.findUnique({
    where: { token: params.token },
    include: {
      project: {
        select: {
          name: true,
          praxisName: true,
          praxisUrl: true,
          textResults: true,
          themeResults: true,
          ga4PropertyId: true,
          googleAdsCustomerId: true,
          canvaFolderId: true,
          clientId: true,
          createdById: true,
        },
      },
    },
  })

  if (!link) notFound()
  if (link.expiresAt < new Date()) notFound()

  const allResults = (link.project.textResults as unknown as StoredTextResult[] | null) ?? []
  const themes = (link.project.themeResults as unknown as ThemenItem[] | null) ?? []
  const portalItems = allResults
    .map((r, i) => ({ globalIndex: i, result: r }))
    .filter(({ result }) => result.portalVisible)

  let ga4: GA4Metrics | null = null
  let googleAds: GoogleAdsMetrics | null = null
  let canvaAssets: CanvaAsset[] = []

  if (link.showAnalytics) {
    const endDate = new Date().toISOString().slice(0, 10)
    const startDate = new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10)

    if (link.project.ga4PropertyId && process.env.GA4_SERVICE_ACCOUNT_JSON) {
      try {
        ga4 = await fetchGA4Metrics(link.project.ga4PropertyId, startDate, endDate)
      } catch (err) {
        logger.warn({ err, projectId: link.projectId }, '[portal] GA4-Daten konnten nicht geladen werden')
      }
    }

    const adsEnvOk = ADS_ENV_VARS.every((v) => !!process.env[v])
    if (link.project.googleAdsCustomerId && adsEnvOk) {
      try {
        googleAds = await fetchGoogleAdsMetrics(link.project.googleAdsCustomerId, startDate, endDate)
      } catch (err) {
        logger.warn({ err, projectId: link.projectId }, '[portal] Google Ads Daten konnten nicht geladen werden')
      }
    }
  }

  // Canva-Assets laden für Social-Post-Bildvorschau
  let canvaFolderId = link.project.canvaFolderId
  if (!canvaFolderId && link.project.clientId) {
    try {
      const client = await prisma.client.findUnique({
        where: { id: link.project.clientId },
        select: { canvaFolderId: true },
      })
      canvaFolderId = client?.canvaFolderId ?? null
    } catch (err) {
      logger.warn({ err, projectId: link.projectId }, '[portal] Kunden-Canva-Ordner konnte nicht geladen werden')
    }
  }
  if (canvaFolderId) {
    try {
      canvaAssets = await listFolderAssets(canvaFolderId, link.project.createdById)
    } catch (err) {
      logger.warn({ err, projectId: link.projectId }, '[portal] Canva-Assets konnten nicht geladen werden')
    }
  }

  return (
    <PortalAccess
      token={params.token}
      projectName={link.project.name}
      praxisName={link.project.praxisName ?? link.project.praxisUrl ?? ''}
      expiresAt={link.expiresAt.toISOString()}
      portalItems={portalItems}
      themes={themes}
      ga4={ga4}
      googleAds={googleAds}
      showAnalytics={link.showAnalytics}
      canvaAssets={canvaAssets}
    />
  )
}
