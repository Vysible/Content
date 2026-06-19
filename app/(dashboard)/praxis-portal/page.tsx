import { requireAuth } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import type { StoredTextResult } from '@/lib/generation/results-store'
import { CopyButton } from './CopyButton'

export default async function PraxisPortalPage() {
  await requireAuth()

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      praxisName: true,
      textResults: true,
      portalLinks: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { token: true, expiresAt: true, showAnalytics: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const withLink = projects.filter((p) => p.portalLinks.length > 0)
  const withoutLink = projects.filter((p) => p.portalLinks.length === 0)

  return (
    <div>
      <Header
        title="Kundenportal"
        subtitle="Alle aktiven Freigabe-Links im Überblick"
      />

      {/* Section 1: Active portal links */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-nachtblau mb-3">
          Aktive Portal-Links
          <span className="ml-2 text-xs font-normal text-stahlgrau">({withLink.length})</span>
        </h2>

        {withLink.length === 0 ? (
          <div className="bg-white border border-stone rounded-xl p-8 text-center text-stahlgrau text-sm">
            Noch keine Portal-Links erstellt. Öffne ein Projekt und erstelle einen Link über das Kundenportal-Panel.
          </div>
        ) : (
          <div className="space-y-3">
            {withLink.map((project) => {
              const link = project.portalLinks[0]
              const results = (project.textResults as unknown as StoredTextResult[] | null) ?? []
              const portalCount = results.filter((r) => r.portalVisible === true).length
              const approvedCount = results.filter((r) => r.customerApproval === 'approved').length
              const changesCount = results.filter((r) => r.customerApproval === 'changes_requested').length
              const pendingCount = portalCount - approvedCount - changesCount
              const isExpired = link.expiresAt < new Date()
              const allApproved = portalCount > 0 && approvedCount === portalCount
              const hasChanges = changesCount > 0

              const borderColor = isExpired
                ? 'border-l-red-400'
                : allApproved
                ? 'border-l-emerald-400'
                : hasChanges
                ? 'border-l-amber-400'
                : 'border-l-stone'

              const portalHref = `/portal/${link.token}`

              return (
                <div
                  key={project.id}
                  className={`bg-white border border-stone border-l-4 ${borderColor} rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4`}
                >
                  {/* Project info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-nachtblau text-sm">
                        {project.praxisName ?? project.name}
                      </p>
                      {project.praxisName && (
                        <p className="text-xs text-stahlgrau truncate">{project.name}</p>
                      )}
                      {isExpired && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                          Abgelaufen
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stahlgrau mt-1">
                      Gültig bis {link.expiresAt.toLocaleDateString('de-DE')}
                      {link.showAnalytics && ' · inkl. Analysen'}
                    </p>

                    {/* Stats chips */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <StatChip label={`${portalCount} Inhalte`} color="default" />
                      <StatChip label={`${approvedCount} freigegeben`} color="emerald" />
                      {changesCount > 0 && (
                        <StatChip label={`${changesCount} Änderungen`} color="amber" />
                      )}
                      {pendingCount > 0 && (
                        <StatChip label={`${pendingCount} ausstehend`} color="default" />
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyButton href={portalHref} />
                    <Link
                      href={`/projects/${project.id}/results`}
                      className="text-xs px-3 py-1.5 bg-nachtblau text-white rounded-lg hover:bg-tiefblau transition"
                    >
                      Ergebnisse →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section 2: Projects without portal link */}
      {withoutLink.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-nachtblau mb-3">
            Weitere Projekte
            <span className="ml-2 text-xs font-normal text-stahlgrau">({withoutLink.length})</span>
          </h2>
          <div className="bg-white border border-stone rounded-xl divide-y divide-stone/50">
            {withoutLink.map((project) => (
              <div key={project.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-nachtblau">
                    {project.praxisName ?? project.name}
                  </p>
                  {project.praxisName && (
                    <p className="text-xs text-stahlgrau">{project.name}</p>
                  )}
                </div>
                <Link
                  href={`/projects/${project.id}/results`}
                  className="text-xs text-bordeaux hover:underline font-medium"
                >
                  Ergebnisse →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatChip({
  label,
  color,
}: {
  label: string
  color: 'emerald' | 'amber' | 'default'
}) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    default: 'bg-stone/30 text-stahlgrau',
  }
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${styles[color]}`}>
      {label}
    </span>
  )
}
