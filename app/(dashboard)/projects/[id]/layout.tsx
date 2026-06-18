import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ProjectTabs } from '@/components/project/ProjectTabs'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, praxisName: true },
  })

  if (!project) notFound()

  return (
    <div>
      <Header
        title={project.name}
        subtitle={project.praxisName ?? ''}
      />
      <ProjectTabs projectId={project.id} />
      {children}
    </div>
  )
}
