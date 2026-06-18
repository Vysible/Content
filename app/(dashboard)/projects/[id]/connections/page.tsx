import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { KlickTippIntegration } from '@/components/project/integrations/KlickTippIntegration'
import { WordPressIntegration } from '@/components/project/integrations/WordPressIntegration'
import { MetaIntegration } from '@/components/project/integrations/MetaIntegration'
import { LinkedInIntegration } from '@/components/project/integrations/LinkedInIntegration'
import { ProjectGA4Settings } from '../settings/ProjectGA4Settings'
import { ProjectGoogleAdsSettings } from '../settings/ProjectGoogleAdsSettings'
import { ProjectCanvaSettings } from '@/components/project/ProjectCanvaSettings'

const CHANNEL_INTEGRATION: Record<string, string> = {
  NEWSLETTER:       'KLICKTIPP',
  BLOG:             'WORDPRESS',
  SOCIAL_FACEBOOK:  'META',
  SOCIAL_INSTAGRAM: 'META',
  SOCIAL_LINKEDIN:  'LINKEDIN',
}

const PROVIDER_LABEL: Record<string, string> = {
  KLICKTIPP: 'KlickTipp',
  WORDPRESS:  'WordPress',
  META:       'Meta (Facebook/Instagram)',
  LINKEDIN:   'LinkedIn',
}

export default async function ConnectionsPage({ params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      channels: true,
      canvaFolderId: true,
      integrations: { select: { provider: true } },
    },
  })

  if (!project) notFound()

  const connectedProviders = new Set(project.integrations.map((i: { provider: string }) => i.provider))

  const hasBlog       = project.channels.includes('BLOG')
  const hasNewsletter = project.channels.includes('NEWSLETTER')
  const hasMeta       = project.channels.some((c: string) => c === 'SOCIAL_FACEBOOK' || c === 'SOCIAL_INSTAGRAM')
  const hasLinkedIn   = project.channels.includes('SOCIAL_LINKEDIN')
  const hasChannelConnections = hasBlog || hasNewsletter || hasMeta || hasLinkedIn

  const missingIntegrations = project.channels
    .map((ch: string) => CHANNEL_INTEGRATION[ch])
    .filter(Boolean)
    .filter((provider: string) => !connectedProviders.has(provider))
    .filter((provider: string, i: number, arr: string[]) => arr.indexOf(provider) === i)

  return (
    <div className="space-y-8">

      {/* Warnungen */}
      {missingIntegrations.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <p className="text-xs font-semibold text-amber-900">Nicht verbundene Kanäle:</p>
          {missingIntegrations.map((provider: string) => (
            <p key={provider} className="text-xs text-amber-800">
              ⚠ <strong>{PROVIDER_LABEL[provider]}</strong> ist nicht verbunden —
              Veröffentlichung in diesen Kanal nicht möglich.
            </p>
          ))}
        </div>
      )}

      {/* Kanal-Verbindungen */}
      {hasChannelConnections && (
        <div>
          <SectionHeading
            title="Kanal-Verbindungen"
            subtitle="Zugangsdaten werden AES-256-verschlüsselt gespeichert."
          />
          <div className="space-y-4">
            {hasNewsletter && <KlickTippIntegration projectId={project.id} />}
            {hasBlog       && <WordPressIntegration projectId={project.id} />}
            {hasMeta       && <MetaIntegration      projectId={project.id} />}
            {hasLinkedIn   && <LinkedInIntegration   projectId={project.id} />}
          </div>
        </div>
      )}

      {/* Analytics-IDs */}
      <div>
        <SectionHeading
          title="Analytics-IDs"
          subtitle="System-Zugang zentral konfiguriert — hier nur die Projekt-IDs eintragen."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProjectGA4Settings projectId={project.id} />
          <ProjectGoogleAdsSettings projectId={project.id} />
        </div>
      </div>

      {/* Design & Assets */}
      <div>
        <SectionHeading title="Design & Assets" />
        <ProjectCanvaSettings
          projectId={project.id}
          initialCanvaFolderId={project.canvaFolderId ?? null}
        />
      </div>

    </div>
  )
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 pb-2 border-b border-stone">
      <h2 className="text-sm font-semibold text-nachtblau uppercase tracking-wide">{title}</h2>
      {subtitle && <p className="text-xs text-stahlgrau mt-0.5">{subtitle}</p>}
    </div>
  )
}
