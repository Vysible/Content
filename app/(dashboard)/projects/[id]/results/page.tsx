import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ResultsTabs } from '@/components/results/ResultsTabs'
import { ExportButton } from '@/components/results/ExportButton'
import { SharePanel } from '@/components/results/SharePanel'
import type { StoredTextResult } from '@/lib/generation/results-store'
import type { ThemenItem } from '@/lib/generation/themes-schema'

export default async function ResultsPage({ params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      praxisName: true,
      praxisUrl: true,
      channels: true,
      themeResults: true,
      textResults: true,
      status: true,
    },
  })

  if (!project) notFound()

  if (!project.themeResults) {
    redirect(`/projects/${params.id}`)
  }

  const themes = (project.themeResults as unknown as ThemenItem[]) ?? []
  const textResults = (project.textResults as unknown as StoredTextResult[]) ?? []

  return (
    <div>
      <Header
        title={`Ergebnisse: ${project.name}`}
        subtitle={project.praxisName ?? project.praxisUrl}
      />

      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${params.id}`} className="text-sm text-stahlgrau hover:text-anthrazit">
            ← Zurück zum Projekt
          </Link>
          <Link href={`/projects/${params.id}/calendar`} className="text-sm text-tiefblau hover:underline">
            📅 Kalender
          </Link>
        </div>
        <div className="flex items-center gap-3 relative">
          <SharePanel projectId={params.id} />
          <ExportButton projectId={params.id} textResults={textResults} />
        </div>
      </div>

      <ResultsTabs
        projectId={params.id}
        themes={themes}
        textResults={textResults}
        channels={project.channels}
      />
    </div>
  )
}
