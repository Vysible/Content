import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
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
    },
  })

  if (!project) notFound()

  const totalCost = project.costEntries.reduce((sum: number, e: { costEur: number }) => sum + e.costEur, 0)

  const hasBlog       = project.channels.includes('BLOG')
  const hasNewsletter = project.channels.includes('NEWSLETTER')
  const hasMeta       = project.channels.some((c: string) => c === 'SOCIAL_FACEBOOK' || c === 'SOCIAL_INSTAGRAM')
  const hasLinkedIn   = project.channels.includes('SOCIAL_LINKEDIN')
  const hasConnections = hasBlog || hasNewsletter || hasMeta || hasLinkedIn

  return (
    <div className="space-y-8">
      <Header
        title={project.name}
        subtitle={`${project.praxisName ?? project.praxisUrl}`}
      />

      {project.status === 'ACTIVE' && (
        <Link
          href={`/projects/${project.id}/results`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-tiefblau text-white rounded-lg hover:bg-nachtblau transition font-medium"
        >
          Ergebnisse ansehen →
        </Link>
      )}

      {project.hedyImportHighlight && (
        <HedyImportHighlightBanner projectId={project.id} />
      )}

      {/* Generierung */}
      <GenerateSection projectId={project.id} />

      {/* Kanäle + Kosten (read-only) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-stone rounded-xl p-4">
          <p className="text-xs text-stahlgrau mb-1.5">Kanäle</p>
          <div className="flex flex-wrap gap-1">
            {project.channels.map((ch: string) => (
              <span key={ch} className="text-xs bg-stone text-anthrazit px-2 py-0.5 rounded-full">
                {CHANNEL_LABELS[ch] ?? ch}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white border border-stone rounded-xl p-4">
          <p className="text-xs text-stahlgrau mb-1">KI-Kosten</p>
          <p className="text-sm font-semibold text-nachtblau">{totalCost.toFixed(4)} EUR</p>
          <p className="text-xs text-stahlgrau">{project.costEntries.length} Einträge</p>
        </div>
        <div className="bg-white border border-stone rounded-xl p-4">
          <p className="text-xs text-stahlgrau mb-1">Status</p>
          <span className="text-sm font-medium">{project.status}</span>
        </div>
      </div>

      {/* ── Grunddaten ──────────────────────────────────────── */}
      <section>
        <SectionHeader title="Grunddaten" />
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
      </section>

      {/* ── Inhalte ─────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Inhalte" subtitle="Positionierung, Keywords und Themen für die KI-Generierung." />
        <div className="space-y-4">
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
      </section>

      {/* ── Kanal-Verbindungen ──────────────────────────────── */}
      {hasConnections && (
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
          </div>
        </section>
      )}

      {/* ── Analytics ───────────────────────────────────────── */}
      <section>
        <SectionHeader title="Analytics" subtitle="Systemzugang zentral konfiguriert — hier nur Projekt-IDs eintragen." />
        <div className="space-y-4">
          <ProjectGA4Settings projectId={project.id} />
          <ProjectGoogleAdsSettings projectId={project.id} />
        </div>
      </section>

      {/* ── Design & Assets ─────────────────────────────────── */}
      <section>
        <SectionHeader title="Design & Assets" />
        <ProjectCanvaSettings
          projectId={project.id}
          initialCanvaFolderId={project.canvaFolderId ?? null}
        />
      </section>

      {/* ── Review & Compliance ─────────────────────────────── */}
      <ReviewPanel
        projectId={project.id}
        reviewMode={project.reviewMode as 'SIMPLE' | 'COMPLETE'}
        hwgFlag={project.hwgFlag}
      />

      {/* ── Aktivitätsprotokoll ─────────────────────────────── */}
      <div className="bg-white border border-stone rounded-xl p-4">
        <p className="text-xs text-stahlgrau font-medium uppercase tracking-wide mb-3">Aktivitätsprotokoll</p>
        <AuditLogTab projectId={project.id} />
      </div>

      <div className="flex gap-3 pb-8">
        <Link href="/projects" className="px-4 py-2 text-sm text-stahlgrau hover:text-anthrazit border border-stone rounded-lg transition">
          ← Alle Projekte
        </Link>
        {project.status === 'ACTIVE' && (
          <Link
            href={`/projects/${project.id}/results`}
            className="px-4 py-2 text-sm bg-tiefblau text-white rounded-lg hover:bg-nachtblau transition font-medium"
          >
            Ergebnisse ansehen →
          </Link>
        )}
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
