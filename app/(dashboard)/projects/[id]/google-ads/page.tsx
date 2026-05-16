import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { GoogleAdsDashboard } from '@/components/google-ads/GoogleAdsDashboard'
import Link from 'next/link'

export default async function ProjectGoogleAdsPage({ params }: { params: { id: string } }) {
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
        title={`Google Ads — ${project.name}`}
        subtitle="Kampagnen, Keywords & Ausgaben · letzte 30 Tage"
      />
      <GoogleAdsDashboard projectId={project.id} />
    </div>
  )
}
