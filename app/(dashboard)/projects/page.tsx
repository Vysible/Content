import { Header } from '@/components/layout/header'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT:    { label: 'Entwurf',  cls: 'bg-stone text-anthrazit' },
  ACTIVE:   { label: 'Aktiv',    cls: 'bg-green-100 text-green-800' },
  ARCHIVED: { label: 'Archiviert', cls: 'bg-gray-100 text-gray-500' },
}

const CHANNEL_ICONS: Record<string, string> = {
  BLOG: '✍',
  NEWSLETTER: '✉',
  SOCIAL_INSTAGRAM: '◈',
  SOCIAL_FACEBOOK: '◉',
  SOCIAL_LINKEDIN: '◆',
}

export default async function ProjectsPage() {
  await requireAuth()

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      praxisName: true,
      praxisUrl: true,
      channels: true,
      planningStart: true,
      planningEnd: true,
      status: true,
      createdAt: true,
    },
  })

  return (
    <div>
      <Header
        title="Projekte"
        subtitle={`${projects.length} Projekt${projects.length !== 1 ? 'e' : ''}`}
        actions={
          <Link
            href="/projects/new"
            className="bg-cognac hover:bg-cognacDark text-black text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Neues Projekt
          </Link>
        }
      />

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-stahlgrau text-sm mb-4">Noch keine Projekte vorhanden.</p>
          <Link
            href="/projects/new"
            className="inline-block bg-cognac hover:bg-cognacDark text-black text-sm font-semibold px-6 py-2.5 rounded-lg transition"
          >
            Erstes Projekt erstellen
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p: { id: string; name: string; praxisName: string | null; praxisUrl: string; channels: string[]; planningStart: Date; planningEnd: Date; status: string; createdAt: Date }) => {
            const status = STATUS_LABELS[p.status] ?? STATUS_LABELS.DRAFT
            const start = new Date(p.planningStart).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })
            const end = new Date(p.planningEnd).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })

            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="block bg-white border border-stone rounded-xl p-4 hover:shadow-sm transition group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>
                        {status.label}
                      </span>
                      <h3 className="font-semibold text-sm text-nachtblau group-hover:text-cognac transition truncate">
                        {p.name}
                      </h3>
                    </div>
                    <p className="text-xs text-stahlgrau mt-1">
                      {p.praxisName && <>{p.praxisName} · </>}
                      {start} – {end}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 text-sm">
                    {p.channels.map((ch: string) => (
                      <span key={ch} title={ch} className="text-stahlgrau">{CHANNEL_ICONS[ch] ?? '◦'}</span>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
