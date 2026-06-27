import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { decryptIfEncrypted } from '@/lib/crypto/aes'
import { Header } from '@/components/layout/header'
import { ProjectGA4Settings } from './ProjectGA4Settings'
import { ProjectGoogleAdsSettings } from './ProjectGoogleAdsSettings'
import { ProjectCanvaSettings } from '@/components/project/ProjectCanvaSettings'
import { ProjectPositioningSettings } from '@/components/project/ProjectPositioningSettings'
import { ProjectGeneralSettings } from '@/components/project/ProjectGeneralSettings'
import { ProjectContentSettings } from '@/components/project/ProjectContentSettings'
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
      praxisUrl: true,
      praxisName: true,
      fachgebiet: true,
      ansprache: true,
      planningStart: true,
      planningEnd: true,
      channels: true,
      positioningDocument: true,
      keywords: true,
      themenPool: true,
      geplantThemen: true,
      canvaFolderId: true,
    },
  })

  if (!project) notFound()

  const hasBlog       = project.channels.includes('BLOG')
  const hasNewsletter = project.channels.includes('NEWSLETTER')
  const hasMeta       = project.channels.some((c) => c === 'SOCIAL_FACEBOOK' || c === 'SOCIAL_INSTAGRAM')
  const hasLinkedIn   = project.channels.includes('SOCIAL_LINKEDIN')
  const hasChannelConnections = hasBlog || hasNewsletter || hasMeta || hasLinkedIn

  return (
    <div>
      <Header
        title={`Einstellungen — ${project.name}`}
        subtitle="Projekt-spezifische Konfiguration"
      />

      <div className="space-y-10">

        {/* ── 1. Grunddaten ─────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Grunddaten"
            subtitle="Projektname, Praxis, Fachgebiet und Planungszeitraum."
          />
          <ProjectGeneralSettings
            projectId={project.id}
            initialName={project.name}
            initialPraxisUrl={project.praxisUrl ?? ''}
            initialPraxisName={project.praxisName ?? ''}
            initialFachgebiet={project.fachgebiet ?? ''}
            initialAnsprache={project.ansprache ?? 'Sie'}
            initialPlanningStart={project.planningStart.toISOString()}
            initialPlanningEnd={project.planningEnd.toISOString()}
            initialChannels={project.channels}
          />
        </section>

        {/* ── 2. Inhalte ────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Inhalte"
            subtitle="Positionierung, Keywords und Themen-Pool für die KI-Generierung."
          />
          <div className="space-y-4">
            <ProjectPositioningSettings
              projectId={project.id}
              initialDocument={decryptIfEncrypted(project.positioningDocument) ?? ''}
            />
            <ProjectContentSettings
              projectId={project.id}
              initialKeywords={project.keywords}
              initialThemenPool={project.themenPool ?? ''}
              initialGeplantThemen={(project.geplantThemen as { monat: string; thema: string }[]) ?? []}
              planningStart={project.planningStart.toISOString().slice(0, 7)}
              planningEnd={project.planningEnd.toISOString().slice(0, 7)}
            />
          </div>
        </section>

        {/* ── 3. Kanal-Verbindungen ─────────────────────────────── */}
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
            {!hasChannelConnections && (
              <p className="text-sm text-stahlgrau px-1">
                Keine verbindbaren Kanäle für dieses Projekt konfiguriert.
              </p>
            )}
          </div>
        </section>

        {/* ── 4. Analytics ──────────────────────────────────────── */}
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

        {/* ── 5. Design & Assets ────────────────────────────────── */}
        <section>
          <SectionHeader title="Design & Assets" />
          <ProjectCanvaSettings
            projectId={project.id}
            initialCanvaFolderId={project.canvaFolderId ?? null}
          />
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
