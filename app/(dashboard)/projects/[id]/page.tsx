export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { decryptIfEncrypted } from '@/lib/crypto/aes'
import Link from 'next/link'
import { GenerateSection } from './GenerateSection'
import { ReviewPanel } from '@/components/project/ReviewPanel'
import { AuditLogTab } from '@/components/project/AuditLogTab'
import { HedyImportHighlightBanner } from '@/components/project/HedyImportHighlightBanner'
import { ProjectGeneralSettings } from '@/components/project/ProjectGeneralSettings'
import { ProjectPositioningSettings } from '@/components/project/ProjectPositioningSettings'
import { ProjectContentSettings } from '@/components/project/ProjectContentSettings'

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
      geplantThemen: true,
      status: true,
      reviewMode: true,
      hwgFlag: true,
      hedyImportHighlight: true,
      costEntries: { select: { costEur: true }, orderBy: { timestamp: 'desc' }, take: 10 },
    },
  })

  if (!project) notFound()

  const totalCost = project.costEntries.reduce((sum: number, e: { costEur: number }) => sum + e.costEur, 0)

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
      </div>

      {/* Generierung */}
      <GenerateSection projectId={project.id} />

      {/* Praxis-Daten */}
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
            initialChannels={project.channels}
          />
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
