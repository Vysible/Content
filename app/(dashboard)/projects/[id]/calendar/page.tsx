import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { StoredTextResult } from '@/lib/generation/results-store'

const ContentCalendar = dynamic(
  () => import('@/components/calendar/ContentCalendar').then((m) => m.ContentCalendar),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-64 bg-stone rounded-xl" />,
  },
)

export default async function CalendarPage({ params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, praxisName: true, praxisUrl: true, textResults: true },
  })

  if (!project) notFound()
  if (!project.textResults) redirect(`/projects/${params.id}`)

  const textResults = (project.textResults as unknown as StoredTextResult[]) ?? []

  return (
    <div>
      <Header
        title={`Kalender: ${project.name}`}
        subtitle={project.praxisName ?? project.praxisUrl}
      />
      <div className="mb-4">
        <Link href={`/projects/${params.id}/results`} className="text-sm text-stahlgrau hover:text-anthrazit">
          ← Zurück zu Ergebnissen
        </Link>
      </div>
      <ContentCalendar projectId={params.id} textResults={textResults} />
    </div>
  )
}
