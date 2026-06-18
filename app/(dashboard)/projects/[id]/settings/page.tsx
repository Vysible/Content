import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ProjectApiKeySettings } from './ProjectApiKeySettings'
import { ProjectKlickTippSettings } from './ProjectKlickTippSettings'
import { ProjectGA4Settings } from './ProjectGA4Settings'
import { ProjectGoogleAdsSettings } from './ProjectGoogleAdsSettings'
import { ProjectSocialSettings } from './ProjectSocialSettings'
import { ProjectCanvaSettings } from '@/components/project/ProjectCanvaSettings'
import { ProjectPositioningSettings } from '@/components/project/ProjectPositioningSettings'
import { KlickTippIntegration } from '@/components/project/integrations/KlickTippIntegration'
import { WordPressIntegration } from '@/components/project/integrations/WordPressIntegration'
import { MetaIntegration } from '@/components/project/integrations/MetaIntegration'
import { LinkedInIntegration } from '@/components/project/integrations/LinkedInIntegration'

export default async function ProjectSettingsPage({ params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, apiKeyId: true, socialExamples: true, channels: true, canvaFolderId: true, positioningDocument: true },
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
        <ProjectGoogleAdsSettings projectId={project.id} />
        {project.channels.some((c) => c.startsWith('SOCIAL_')) && (
          <ProjectSocialSettings
            projectId={project.id}
            initialSocialExamples={project.socialExamples ?? ''}
          />
        )}
        <ProjectPositioningSettings
          projectId={project.id}
          initialDocument={project.positioningDocument ?? ''}
        />
        <ProjectCanvaSettings
          projectId={project.id}
          initialCanvaFolderId={project.canvaFolderId ?? null}
        />
        {/* Pro-Projekt Integrationen */}
        <div>
          <h2 className="text-sm font-semibold text-nachtblau px-1 mb-3">Kanal-Verbindungen</h2>
          <div className="space-y-4">
            <KlickTippIntegration projectId={project.id} />
            <WordPressIntegration projectId={project.id} />
            {project.channels.some((c) => c === 'SOCIAL_FACEBOOK' || c === 'SOCIAL_INSTAGRAM') && (
              <MetaIntegration projectId={project.id} />
            )}
            {project.channels.some((c) => c === 'SOCIAL_LINKEDIN') && (
              <LinkedInIntegration projectId={project.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
