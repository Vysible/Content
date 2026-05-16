import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { AnalyticsTabView } from '@/components/analytics/AnalyticsTabView'

export default async function AnalyticsPage() {
  await requireAuth()

  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, ga4PropertyId: true, googleAdsCustomerId: true },
  })

  const ga4Configured = !!process.env.GA4_SERVICE_ACCOUNT_JSON
  const googleAdsConfigured = !!(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN
  )

  return (
    <div>
      <Header title="Analysen" subtitle="Web-Analytics, Google Ads & Social Media pro Projekt" />
      <AnalyticsTabView
        projects={projects}
        ga4Configured={ga4Configured}
        googleAdsConfigured={googleAdsConfigured}
      />
    </div>
  )
}
