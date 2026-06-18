import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { GA4Dashboard } from '@/components/analytics/GA4Dashboard'
import { GoogleAdsDashboard } from '@/components/google-ads/GoogleAdsDashboard'

export default async function ProjectAnalyticsPage({ params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, ga4PropertyId: true, googleAdsCustomerId: true },
  })

  if (!project) notFound()

  const hasGA4  = !!project.ga4PropertyId
  const hasAds  = !!project.googleAdsCustomerId

  return (
    <div className="space-y-8">

      {!hasGA4 && !hasAds && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <p className="font-semibold mb-1">Keine Analytics-IDs hinterlegt</p>
          <p>Trage unter <strong>Übersicht → Anbindungen</strong> die GA4 Property-ID und/oder Google Ads Customer-ID ein, um Daten anzuzeigen.</p>
        </div>
      )}

      {/* Google Analytics 4 */}
      <section>
        <div className="mb-4 pb-2 border-b border-stone">
          <h2 className="text-sm font-semibold text-nachtblau uppercase tracking-wide">Web-Analytics</h2>
          <p className="text-xs text-stahlgrau mt-0.5">Google Analytics 4 · letzte 28 Tage</p>
        </div>
        {hasGA4 ? (
          <GA4Dashboard projectId={project.id} />
        ) : (
          <p className="text-sm text-stahlgrau px-1">
            Keine GA4 Property-ID hinterlegt.{' '}
            <a href={`/projects/${project.id}#anbindungen`} className="text-tiefblau hover:underline">
              Jetzt eintragen →
            </a>
          </p>
        )}
      </section>

      {/* Google Ads */}
      <section>
        <div className="mb-4 pb-2 border-b border-stone">
          <h2 className="text-sm font-semibold text-nachtblau uppercase tracking-wide">Google Ads</h2>
          <p className="text-xs text-stahlgrau mt-0.5">Kampagnen, Keywords & Ausgaben · letzte 30 Tage</p>
        </div>
        {hasAds ? (
          <GoogleAdsDashboard projectId={project.id} />
        ) : (
          <p className="text-sm text-stahlgrau px-1">
            Keine Google Ads Customer-ID hinterlegt.{' '}
            <a href={`/projects/${project.id}#anbindungen`} className="text-tiefblau hover:underline">
              Jetzt eintragen →
            </a>
          </p>
        )}
      </section>

    </div>
  )
}
