import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { GA4Dashboard } from '@/components/analytics/GA4Dashboard'
import { GoogleAdsDashboard } from '@/components/google-ads/GoogleAdsDashboard'
import { SocialDashboard } from '@/components/analytics/SocialDashboard'

export default async function ProjectAnalyticsPage({ params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      ga4PropertyId: true,
      googleAdsCustomerId: true,
      integrations: { select: { provider: true } },
    },
  })

  if (!project) notFound()

  const hasGA4    = !!project.ga4PropertyId
  const hasAds    = !!project.googleAdsCustomerId
  const hasSocial = project.integrations.some(
    (i: { provider: string }) => i.provider === 'META' || i.provider === 'LINKEDIN',
  )

  return (
    <div className="space-y-10">

      {/* Google Analytics 4 */}
      <section>
        <SectionHeader
          title="Web-Analytics"
          subtitle="Google Analytics 4"
          settingsHref={!hasGA4 ? `/projects/${project.id}/connections` : undefined}
          settingsLabel="Property-ID eintragen →"
        />
        {hasGA4 ? (
          <GA4Dashboard projectId={project.id} />
        ) : (
          <EmptyCard text="Keine GA4 Property-ID hinterlegt." href={`/projects/${project.id}/connections`} />
        )}
      </section>

      {/* Google Ads */}
      <section>
        <SectionHeader
          title="Google Ads"
          subtitle="Kampagnen, Keywords & Conversions"
          settingsHref={!hasAds ? `/projects/${project.id}/connections` : undefined}
          settingsLabel="Customer-ID eintragen →"
        />
        {hasAds ? (
          <GoogleAdsDashboard projectId={project.id} />
        ) : (
          <EmptyCard text="Keine Google Ads Customer-ID hinterlegt." href={`/projects/${project.id}/connections`} />
        )}
      </section>

      {/* Social Media */}
      <section>
        <SectionHeader
          title="Social Media"
          subtitle="Facebook · Instagram · LinkedIn"
          settingsHref={!hasSocial ? `/projects/${project.id}/connections` : undefined}
          settingsLabel="Zugangsdaten eintragen →"
        />
        {hasSocial ? (
          <SocialDashboard projectId={project.id} />
        ) : (
          <EmptyCard text="Keine Social-Verbindung konfiguriert." href={`/projects/${project.id}/connections`} />
        )}
      </section>

    </div>
  )
}

function SectionHeader({
  title,
  subtitle,
  settingsHref,
  settingsLabel,
}: {
  title: string
  subtitle: string
  settingsHref?: string
  settingsLabel?: string
}) {
  return (
    <div className="flex items-end justify-between mb-4 pb-2 border-b border-stone">
      <div>
        <h2 className="text-sm font-semibold text-nachtblau uppercase tracking-wide">{title}</h2>
        <p className="text-xs text-stahlgrau mt-0.5">{subtitle}</p>
      </div>
      {settingsHref && settingsLabel && (
        <a href={settingsHref} className="text-xs text-tiefblau hover:underline flex-shrink-0 ml-4">
          {settingsLabel}
        </a>
      )}
    </div>
  )
}

function EmptyCard({ text, href }: { text: string; href: string }) {
  return (
    <div className="bg-white border border-stone rounded-xl p-5">
      <p className="text-sm text-stahlgrau">
        {text}{' '}
        <a href={href} className="text-tiefblau hover:underline">
          Jetzt einrichten →
        </a>
      </p>
    </div>
  )
}
