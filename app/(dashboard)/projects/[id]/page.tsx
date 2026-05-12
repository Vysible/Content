import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const CHANNEL_LABELS: Record<string, string> = {
  BLOG: 'Blog',
  NEWSLETTER: 'Newsletter',
  SOCIAL_INSTAGRAM: 'Instagram',
  SOCIAL_FACEBOOK: 'Facebook',
  SOCIAL_LINKEDIN: 'LinkedIn',
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      costEntries: { orderBy: { timestamp: 'desc' }, take: 10 },
    },
  })

  if (!project) notFound()

  const totalCost = project.costEntries.reduce((sum, e) => sum + e.costEur, 0)
  const start = new Date(project.planningStart).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const end = new Date(project.planningEnd).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  return (
    <div>
      <Header
        title={project.name}
        subtitle={`${project.praxisName ?? project.praxisUrl} · ${start} – ${end}`}
      />

      {/* Status-Banner: Generierung noch nicht verfügbar */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <strong>Slice 3a/3b (SSE-Infrastruktur + Prozess-Orchestrierung)</strong> – die eigentliche Generierung
        ist der nächste Implementierungsschritt. Das Projekt wurde gespeichert.
      </div>

      {/* Projekt-Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <InfoCard label="Praxis-URL">
          <a href={project.praxisUrl} target="_blank" rel="noopener noreferrer" className="text-tiefblau hover:underline text-sm">
            {project.praxisUrl}
          </a>
        </InfoCard>

        <InfoCard label="Kanäle">
          <div className="flex flex-wrap gap-1">
            {project.channels.map((ch) => (
              <span key={ch} className="text-xs bg-stone text-anthrazit px-2 py-0.5 rounded-full">
                {CHANNEL_LABELS[ch] ?? ch}
              </span>
            ))}
          </div>
        </InfoCard>

        <InfoCard label="Positionierungsdokument">
          {project.positioningDocument ? (
            <p className="text-sm text-green-700">✓ Vorhanden ({Math.round(project.positioningDocument.length / 4).toLocaleString('de')} Tokens)</p>
          ) : (
            <p className="text-sm text-amber-700">⚠ Nicht vorhanden – generierter Content weniger praxisspezifisch</p>
          )}
        </InfoCard>

        <InfoCard label="Keywords">
          {project.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {project.keywords.map((kw) => (
                <span key={kw} className="text-xs bg-tiefblau text-white px-2 py-0.5 rounded-full">{kw}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stahlgrau">Keine Keywords angegeben</p>
          )}
        </InfoCard>

        <InfoCard label="KI-Kosten">
          <p className="text-sm font-semibold text-nachtblau">{totalCost.toFixed(4)} EUR</p>
          <p className="text-xs text-stahlgrau">{project.costEntries.length} Einträge</p>
        </InfoCard>

        <InfoCard label="Status">
          <span className="text-sm font-medium">{project.status}</span>
        </InfoCard>
      </div>

      <div className="flex gap-3">
        <Link href="/projects" className="px-4 py-2 text-sm text-stahlgrau hover:text-anthrazit border border-stone rounded-lg transition">
          ← Alle Projekte
        </Link>
      </div>
    </div>
  )
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone rounded-xl p-4">
      <p className="text-xs text-stahlgrau mb-1">{label}</p>
      {children}
    </div>
  )
}
