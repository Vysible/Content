import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ResultsTabs } from '@/components/results/ResultsTabs'
import { ExportButton } from '@/components/results/ExportButton'
import { SharePanel } from '@/components/results/SharePanel'
import { PortalPanel } from '@/components/results/PortalPanel'
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
      wpUrl: true,
      hwgFlag: true,
      integrations: { select: { provider: true } },
    },
  })

  if (!project) notFound()
  if (!project.themeResults) redirect(`/projects/${params.id}`)

  const themes = (project.themeResults as unknown as ThemenItem[]) ?? []
  const textResults = (project.textResults as unknown as StoredTextResult[]) ?? []
  const portalCount = textResults.filter((r) => r.portalVisible).length

  const connected = new Set(project.integrations.map((i: { provider: string }) => i.provider))

  const ktConfigured      = connected.has('KLICKTIPP')
  const metaConfigured    = connected.has('META')
  const linkedInConfigured = connected.has('LINKEDIN')
  const wpConfigured      = connected.has('WORDPRESS') || !!project.wpUrl

  // Kanäle ohne Verbindung → Warnung beim Veröffentlichen
  const CHANNEL_PROVIDER: Record<string, string> = {
    NEWSLETTER:       'KlickTipp',
    SOCIAL_FACEBOOK:  'Meta',
    SOCIAL_INSTAGRAM: 'Meta',
    SOCIAL_LINKEDIN:  'LinkedIn',
    BLOG:             'WordPress',
  }
  const missingForPublish = project.channels
    .filter((ch: string) => {
      const prov = CHANNEL_PROVIDER[ch]
      if (!prov) return false
      if (ch === 'NEWSLETTER' && ktConfigured) return false
      if ((ch === 'SOCIAL_FACEBOOK' || ch === 'SOCIAL_INSTAGRAM') && metaConfigured) return false
      if (ch === 'SOCIAL_LINKEDIN' && linkedInConfigured) return false
      if (ch === 'BLOG' && wpConfigured) return false
      return true
    })
    .map((ch: string) => CHANNEL_PROVIDER[ch])
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)

  return (
    <div className="space-y-4">

      {/* Aktionen */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href={`/projects/${params.id}/calendar`} className="text-sm text-tiefblau hover:underline">
          📅 Kalender
        </Link>
        <div className="flex items-center gap-3 relative">
          <PortalPanel projectId={params.id} portalCount={portalCount} />
          <SharePanel projectId={params.id} />
          <ExportButton projectId={params.id} textResults={textResults} />
        </div>
      </div>

      <ResultsTabs
        projectId={params.id}
        themes={themes}
        textResults={textResults}
        channels={project.channels}
        wpConfigured={wpConfigured}
        ktConfigured={ktConfigured}
        metaConfigured={metaConfigured}
        linkedInConfigured={linkedInConfigured}
        hwgFlag={project.hwgFlag ? 'rot' : undefined}
        praxisName={project.praxisName ?? ''}
      />
    </div>
  )
}
