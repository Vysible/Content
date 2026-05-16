import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { GA4Dashboard } from '@/components/analytics/GA4Dashboard'
import Link from 'next/link'

export default async function ProjectAnalyticsPage({ params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true },
  })

  if (!project) notFound()

  return (
    <div>
      <div className="mb-2">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-stahlgrau hover:text-nachtblau transition"
        >
          ← Zurück zum Projekt
        </Link>
      </div>
      <Header
        title={`Web-Analytics — ${project.name}`}
        subtitle="Google Analytics 4 · letzte 28 Tage"
      />
      <GA4Dashboard projectId={project.id} />
    </div>
  )
}
