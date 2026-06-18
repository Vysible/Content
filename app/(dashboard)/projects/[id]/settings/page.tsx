import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ProjectApiKeySettings } from './ProjectApiKeySettings'
import { ProjectGA4Settings } from './ProjectGA4Settings'
import { ProjectGoogleAdsSettings } from './ProjectGoogleAdsSettings'
import { ProjectSocialSettings } from './ProjectSocialSettings'
import { ProjectCanvaSettings } from '@/components/project/ProjectCanvaSettings'
import { ProjectPositioningSettings } from '@/components/project/ProjectPositioningSettings'
import { KlickTippIntegration } from '@/components/project/integrations/KlickTippIntegration'
import { WordPressIntegration } from '@/components/project/integrations/WordPressIntegration'
import { MetaIntegration } from '@/components/project/integrations/MetaIntegration'
import { LinkedInIntegration } from '@/components/project/integrations/LinkedInIntegration'

export default async function ProjectSettingsPage({ params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      apiKeyId: true,
      socialExamples: true,
      channels: true,
      canvaFolderId: true,
      positioningDocument: true,
    },
  })

  if (!project) notFound()

  const apiKeys = await prisma.apiKey.findMany({
    where: { active: true, provider: { in: ['ANTHROPIC', 'OPENAI'] } },
    orderBy: [{ provider: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, provider: true },
  })

  const hasBlog       = project.channels.includes('BLOG')
  const hasNewsletter = project.channels.includes('NEWSLETTER')
  const hasMeta       = project.channels.some((c) => c === 'SOCIAL_FACEBOOK' || c === 'SOCIAL_INSTAGRAM')
  const hasLinkedIn   = project.channels.includes('SOCIAL_LINKEDIN')
  const hasSocial     = hasMeta || hasLinkedIn

  return (
    <div>
      <Header
        title={`Einstellungen — ${project.name}`}
        subtitle="Projekt-spezifische Konfiguration"
      />

      <div className="space-y-10">

        {/* ── 1. KI & Inhalt ────────────────────────────────────── */}
        <section>
          <SectionHeader title="KI & Inhalt" />
          <div className="space-y-4">
            <ProjectApiKeySettings
              projectId={project.id}
              initialApiKeyId={project.apiKeyId}
              apiKeys={apiKeys}
            />
            <ProjectPositioningSettings
              projectId={project.id}
              initialDocument={project.positioningDocument ?? ''}
            />
          </div>
        </section>

        {/* ── 2. Kanal-Verbindungen ─────────────────────────────── */}
        <section>
          <SectionHeader
            title="Kanal-Verbindungen"
            subtitle="Zugangsdaten werden AES-256-verschlüsselt gespeichert."
          />
          <div className="space-y-4">
            {hasNewsletter && <KlickTippIntegration projectId={project.id} />}
            {hasBlog       && <WordPressIntegration projectId={project.id} />}
            {hasMeta       && <MetaIntegration      projectId={project.id} />}
            {hasLinkedIn   && <LinkedInIntegration   projectId={project.id} />}
            {!hasNewsletter && !hasBlog && !hasMeta && !hasLinkedIn && (
              <p className="text-sm text-stahlgrau px-1">
                Keine verbindbaren Kanäle für dieses Projekt konfiguriert.
              </p>
            )}
          </div>
        </section>

        {/* ── 3. Analytics ──────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Analytics"
            subtitle="Systemzugang ist zentral konfiguriert — hier nur die Projekt-IDs eintragen."
          />
          <div className="space-y-4">
            <ProjectGA4Settings projectId={project.id} />
            <ProjectGoogleAdsSettings projectId={project.id} />
          </div>
        </section>

        {/* ── 4. Design & Assets ────────────────────────────────── */}
        <section>
          <SectionHeader title="Design & Assets" />
          <div className="space-y-4">
            <ProjectCanvaSettings
              projectId={project.id}
              initialCanvaFolderId={project.canvaFolderId ?? null}
            />
            {hasSocial && (
              <ProjectSocialSettings
                projectId={project.id}
                initialSocialExamples={project.socialExamples ?? ''}
              />
            )}
          </div>
        </section>

      </div>
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 pb-2 border-b border-stone">
      <h2 className="text-sm font-semibold text-nachtblau uppercase tracking-wide">{title}</h2>
      {subtitle && <p className="text-xs text-stahlgrau mt-0.5">{subtitle}</p>}
    </div>
  )
}
