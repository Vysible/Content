import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { decryptIfEncrypted } from '@/lib/crypto/aes'
import { Header } from '@/components/layout/header'
import { ProjectPositioningSettings } from '@/components/project/ProjectPositioningSettings'
import { ProjectGeneralSettings } from '@/components/project/ProjectGeneralSettings'
import { ProjectContentSettings } from '@/components/project/ProjectContentSettings'

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
      channelQuantities: true,
      positioningDocument: true,
      keywords: true,
      themenPool: true,
      geplantThemen: true,
    },
  })

  if (!project) notFound()

  let positioningDocument: string = ''
  try {
    positioningDocument = decryptIfEncrypted(project.positioningDocument) ?? ''
  } catch (err) {
    console.error('[Vysible] Positionierungsdokument konnte nicht entschlüsselt werden', { projectId: params.id, err })
  }

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
              initialDocument={positioningDocument}
            />
            <ProjectContentSettings
              projectId={project.id}
              initialKeywords={project.keywords}
              initialThemenPool={project.themenPool ?? ''}
              initialGeplantThemen={(project.geplantThemen as { monat: string; kanal: string; thema: string }[]) ?? []}
              initialChannelQuantities={(project.channelQuantities as import('@/lib/types/channel-quantities').ChannelQuantities | null) ?? {}}
              channels={project.channels}
              planningStart={project.planningStart.toISOString().slice(0, 7)}
              planningEnd={project.planningEnd.toISOString().slice(0, 7)}
            />
          </div>
        </section>

        {/* Credentials/IDs/Assets → Tab "Anbindungen" (/connections) */}

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
