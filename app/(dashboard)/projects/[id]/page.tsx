import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GenerateSection } from './GenerateSection'
import { ReviewPanel } from '@/components/project/ReviewPanel'
import { AuditLogTab } from '@/components/project/AuditLogTab'
import { HedyImportHighlightBanner } from '@/components/project/HedyImportHighlightBanner'
import { ProjectGeneralSettings } from '@/components/project/ProjectGeneralSettings'
import { ProjectPositioningSettings } from '@/components/project/ProjectPositioningSettings'
import { ProjectContentSettings } from '@/components/project/ProjectContentSettings'
import { ProjectCanvaSettings } from '@/components/project/ProjectCanvaSettings'
import { ProjectGA4Settings } from './settings/ProjectGA4Settings'
import { ProjectGoogleAdsSettings } from './settings/ProjectGoogleAdsSettings'
import { KlickTippIntegration } from '@/components/project/integrations/KlickTippIntegration'
import { WordPressIntegration } from '@/components/project/integrations/WordPressIntegration'
import { MetaIntegration } from '@/components/project/integrations/MetaIntegration'
import { LinkedInIntegration } from '@/components/project/integrations/LinkedInIntegration'

const CHANNEL_LABELS: Record<string, string> = {
  BLOG: 'Blog',
  NEWSLETTER: 'Newsletter',
  SOCIAL_INSTAGRAM: 'Instagram',
  SOCIAL_FACEBOOK: 'Facebook',
  SOCIAL_LINKEDIN: 'LinkedIn',
}

const CHANNEL_INTEGRATION: Record<string, string> = {
  NEWSLETTER:       'KLICKTIPP',
  BLOG:             'WORDPRESS',
  SOCIAL_FACEBOOK:  'META',
  SOCIAL_INSTAGRAM: 'META',
  SOCIAL_LINKEDIN:  'LINKEDIN',
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
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
      canvaFolderId: true,
      status: true,
      reviewMode: true,
      hwgFlag: true,
      hedyImportHighlight: true,
      costEntries: { select: { costEur: true }, orderBy: { timestamp: 'desc' }, take: 10 },
      integrations: { select: { provider: true } },
    },
  })

  if (!project) notFound()

  const totalCost = project.costEntries.reduce((sum: number, e: { costEur: number }) => sum + e.costEur, 0)
  const connectedProviders = new Set(project.integrations.map((i: { provider: string }) => i.provider))

  const hasBlog       = project.channels.includes('BLOG')
  const hasNewsletter = project.channels.includes('NEWSLETTER')
  const hasMeta       = project.channels.some((c: string) => c === 'SOCIAL_FACEBOOK' || c === 'SOCIAL_INSTAGRAM')
  const hasLinkedIn   = project.channels.includes('SOCIAL_LINKEDIN')
  const hasConnections = hasBlog || hasNewsletter || hasMeta || hasLinkedIn

  // Warnungen: Kanal aktiv, aber Anbindung fehlt
  const missingIntegrations = project.channels
    .map((ch: string) => CHANNEL_INTEGRATION[ch])
    .filter(Boolean)
    .filter((provider: string) => !connectedProviders.has(provider))
    .filter((provider: string, i: number, arr: string[]) => arr.indexOf(provider) === i) // unique

  const PROVIDER_LABEL: Record<string, string> = {
    KLICKTIPP: 'KlickTipp',
    WORDPRESS:  'WordPress',
    META:       'Meta (Facebook/Instagram)',
    LINKEDIN:   'LinkedIn',
  }

  return (
    <div className="space-y-8">

      {project.hedyImportHighlight && (
        <HedyImportHighlightBanner projectId={project.id} />
      )}

      {/* Status-Leiste */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-stone rounded-xl p-3">
          <p className="text-xs text-stahlgrau mb-1">Kanäle</p>
          <div className="flex flex-wrap gap-1">
            {project.channels.map((ch: string) => (
              <span key={ch} className="text-xs bg-stone text-anthrazit px-2 py-0.5 rounded-full">
                {CHANNEL_LABELS[ch] ?? ch}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white border border-stone rounded-xl p-3">
          <p className="text-xs text-stahlgrau mb-1">Status</p>
          <span className="text-sm font-medium">{project.status}</span>
        </div>
        <div className="bg-white border border-stone rounded-xl p-3">
          <p className="text-xs text-stahlgrau mb-1">KI-Kosten</p>
          <p className="text-sm font-semibold text-nachtblau">{totalCost.toFixed(4)} EUR</p>
        </div>
        {project.status === 'ACTIVE' && (
          <div className="bg-white border border-stone rounded-xl p-3 flex items-center">
            <Link
              href={`/projects/${project.id}/results`}
              className="w-full text-center px-3 py-2 text-sm bg-tiefblau text-white rounded-lg hover:bg-nachtblau transition font-medium"
            >
              Ergebnisse →
            </Link>
          </div>
        )}
      </div>

      {/* Generierung */}
      <GenerateSection projectId={project.id} />

      {/* ═══════════════════════════════════════════
          ABSCHNITT 1: PRAXIS
      ═══════════════════════════════════════════ */}
      <div>
        <SectionDivider title="Praxis" subtitle="Stammdaten, Positionierung und Inhaltsgrundlagen" />

        <div className="space-y-6">
          <ProjectGeneralSettings
            projectId={project.id}
            initialName={project.name}
            initialPraxisUrl={project.praxisUrl ?? ''}
            initialPraxisName={project.praxisName ?? ''}
            initialFachgebiet={project.fachgebiet ?? ''}
            initialAnsprache={project.ansprache ?? 'Sie'}
            initialPlanningStart={project.planningStart.toISOString()}
            initialPlanningEnd={project.planningEnd.toISOString()}
          />
          <ProjectPositioningSettings
            projectId={project.id}
            initialDocument={project.positioningDocument ?? ''}
          />
          <ProjectContentSettings
            projectId={project.id}
            initialKeywords={project.keywords}
            initialThemenPool={project.themenPool ?? ''}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          ABSCHNITT 2: ANBINDUNGEN
      ═══════════════════════════════════════════ */}
      <div>
        <SectionDivider
          title="Anbindungen"
          subtitle="Kanal-Verbindungen, Analytics und Design-Assets"
        />

        {/* Warnungen: fehlende Verbindungen */}
        {missingIntegrations.length > 0 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            <p className="text-xs font-semibold text-amber-900">Nicht verbundene Kanäle:</p>
            {missingIntegrations.map((provider: string) => (
              <p key={provider} className="text-xs text-amber-800">
                ⚠ <strong>{PROVIDER_LABEL[provider]}</strong> ist nicht verbunden —
                Veröffentlichung in diesen Kanal nicht möglich.
              </p>
            ))}
          </div>
        )}

        <div className="space-y-6">
          {/* Kanal-Verbindungen */}
          {hasConnections && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-stahlgrau uppercase tracking-wide">Kanal-Verbindungen</h3>
              <p className="text-xs text-stahlgrau -mt-2">Zugangsdaten werden AES-256-verschlüsselt gespeichert.</p>
              {hasNewsletter && <KlickTippIntegration projectId={project.id} />}
              {hasBlog       && <WordPressIntegration projectId={project.id} />}
              {hasMeta       && <MetaIntegration      projectId={project.id} />}
              {hasLinkedIn   && <LinkedInIntegration   projectId={project.id} />}
            </div>
          )}

          {/* Analytics */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-stahlgrau uppercase tracking-wide">Analytics-IDs</h3>
            <p className="text-xs text-stahlgrau -mt-2">System-Zugang zentral konfiguriert — hier nur die Projekt-IDs eintragen.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProjectGA4Settings projectId={project.id} />
              <ProjectGoogleAdsSettings projectId={project.id} />
            </div>
          </div>

          {/* Design */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-stahlgrau uppercase tracking-wide">Design & Assets</h3>
            <ProjectCanvaSettings
              projectId={project.id}
              initialCanvaFolderId={project.canvaFolderId ?? null}
            />
          </div>
        </div>
      </div>

      {/* Review & Compliance */}
      <ReviewPanel
        projectId={project.id}
        reviewMode={project.reviewMode as 'SIMPLE' | 'COMPLETE'}
        hwgFlag={project.hwgFlag}
      />

      {/* Aktivitätsprotokoll */}
      <div className="bg-white border border-stone rounded-xl p-4">
        <p className="text-xs text-stahlgrau font-medium uppercase tracking-wide mb-3">Aktivitätsprotokoll</p>
        <AuditLogTab projectId={project.id} />
      </div>

      <div className="pb-8">
        <Link href="/projects" className="text-sm text-stahlgrau hover:text-anthrazit transition">
          ← Alle Projekte
        </Link>
      </div>
    </div>
  )
}

function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5 pb-2 border-b-2 border-stone">
      <h2 className="text-base font-bold text-nachtblau">{title}</h2>
      {subtitle && <p className="text-xs text-stahlgrau mt-0.5">{subtitle}</p>}
    </div>
  )
}
