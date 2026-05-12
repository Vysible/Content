import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ShareAccess } from './ShareAccess'
import type { StoredTextResult } from '@/lib/generation/results-store'
import type { ThemenItem } from '@/lib/generation/themes-schema'

export default async function SharePage({ params }: { params: { token: string } }) {
  const link = await prisma.shareLink.findUnique({
    where: { token: params.token },
    include: {
      project: {
        select: {
          name: true,
          praxisName: true,
          praxisUrl: true,
          channels: true,
          themeResults: true,
          textResults: true,
        },
      },
    },
  })

  if (!link) notFound()
  if (link.expiresAt < new Date()) notFound()

  const themes = (link.project.themeResults as unknown as ThemenItem[] | null) ?? []
  const textResults = (link.project.textResults as unknown as StoredTextResult[] | null) ?? []

  return (
    <ShareAccess
      token={params.token}
      projectName={link.project.name}
      praxisName={link.project.praxisName ?? link.project.praxisUrl}
      themes={themes}
      textResults={textResults}
      channels={link.project.channels}
      expiresAt={link.expiresAt.toISOString()}
    />
  )
}
