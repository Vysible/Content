import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { PortalAccess } from './PortalAccess'
import type { StoredTextResult } from '@/lib/generation/results-store'

export default async function PortalPage({ params }: { params: { token: string } }) {
  const link = await prisma.portalLink.findUnique({
    where: { token: params.token },
    include: {
      project: {
        select: {
          name: true,
          praxisName: true,
          praxisUrl: true,
          textResults: true,
        },
      },
    },
  })

  if (!link) notFound()
  if (link.expiresAt < new Date()) notFound()

  const allResults = (link.project.textResults as unknown as StoredTextResult[] | null) ?? []
  const portalItems = allResults
    .map((r, i) => ({ globalIndex: i, result: r }))
    .filter(({ result }) => result.portalVisible)

  return (
    <PortalAccess
      token={params.token}
      projectName={link.project.name}
      praxisName={link.project.praxisName ?? link.project.praxisUrl}
      expiresAt={link.expiresAt.toISOString()}
      portalItems={portalItems}
    />
  )
}
