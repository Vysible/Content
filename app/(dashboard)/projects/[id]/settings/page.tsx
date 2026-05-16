import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ProjectApiKeySettings } from './ProjectApiKeySettings'
import { ProjectKlickTippSettings } from './ProjectKlickTippSettings'
import { ProjectGA4Settings } from './ProjectGA4Settings'

export default async function ProjectSettingsPage({ params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, apiKeyId: true },
  })

  if (!project) notFound()

  const apiKeys = await prisma.apiKey.findMany({
    where: { active: true, provider: { in: ['ANTHROPIC', 'OPENAI'] } },
    orderBy: [{ provider: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, provider: true },
  })

  return (
    <div>
      <Header
        title={`Einstellungen — ${project.name}`}
        subtitle="Projekt-spezifische Konfiguration"
      />
      <div className="space-y-6">
        <ProjectApiKeySettings
          projectId={project.id}
          initialApiKeyId={project.apiKeyId}
          apiKeys={apiKeys}
        />
        <ProjectKlickTippSettings projectId={project.id} />
        <ProjectGA4Settings projectId={project.id} />
      </div>
    </div>
  )
}
