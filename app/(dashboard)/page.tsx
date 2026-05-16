import { Header } from '@/components/layout/header'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { getGlobalKpis } from '@/lib/costs/aggregator'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await requireAuth()

  const [kpis, pendingComments, ga4Count, adsCount] = await Promise.all([
    getGlobalKpis(),
    prisma.comment.count({
      where: {
        project: { createdById: session.user.id },
        authorRole: 'praxis',
      },
    }),
    prisma.project.count({ where: { ga4PropertyId: { not: null } } }),
    prisma.project.count({ where: { googleAdsCustomerId: { not: null } } }),
  ])

  const costTrend = kpis.currentMonthEur > kpis.lastMonthEur ? 'up' : kpis.currentMonthEur < kpis.lastMonthEur ? 'down' : 'flat'

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Willkommen, ${session.user.name ?? session.user.email}`}
      />

      {/* Hauptkacheln */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Projekte"
          value={String(kpis.projectsTotal)}
          sub={`${kpis.projectsActive} aktiv`}
          href="/projects"
        />
        <StatCard
          label="Generierte Inhalte"
          value={String(kpis.articlesGenerated + kpis.newslettersGenerated + kpis.socialPostsGenerated)}
          sub={`${kpis.articlesGenerated} Artikel · ${kpis.newslettersGenerated} NL · ${kpis.socialPostsGenerated} Social`}
        />
        <StatCard
          label="Praxis-Kommentare"
          value={String(pendingComments)}
          sub={pendingComments > 0 ? 'Antwort ausstehend' : 'Keine offenen'}
          href="/praxis-portal"
          badge={pendingComments > 0}
        />
        <StatCard
          label="KI-Kosten lfd. Monat"
          value={`${kpis.currentMonthEur.toFixed(2)} €`}
          sub={kpis.lastMonthEur > 0
            ? `${costTrend === 'up' ? '↑' : costTrend === 'down' ? '↓' : '='} Vormonat: ${kpis.lastMonthEur.toFixed(2)} €`
            : 'Kein Vormonat'}
          href="/kpi"
        />
      </div>

      {/* Analytics-Übersicht */}
      <div className="bg-white border border-stone rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-nachtblau">Analysen</h2>
          <Link href="/analytics" className="text-xs text-cognac hover:underline font-medium">
            Alle Analysen →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AnalyticsBlock
            label="Web-Analytics (GA4)"
            connected={ga4Count}
            total={kpis.projectsTotal}
            href="/analytics"
          />
          <AnalyticsBlock
            label="Google Ads"
            connected={adsCount}
            total={kpis.projectsTotal}
            href="/analytics"
          />
          <div className="flex flex-col justify-between p-4 rounded-xl border border-stone/60 bg-stone/10">
            <p className="text-xs font-medium text-stahlgrau mb-2">Social Media</p>
            <p className="text-xs text-stahlgrau">Folgt nach Meta & LinkedIn Freischaltung</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, sub, href, badge,
}: {
  label: string
  value: string
  sub?: string
  href?: string
  badge?: boolean
}) {
  const inner = (
    <div className="relative bg-white border border-stone rounded-xl p-5 hover:shadow-sm transition">
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full" />
      )}
      <p className="text-xs font-medium text-stahlgrau mb-1">{label}</p>
      <p className="text-2xl font-bold text-nachtblau">{value}</p>
      {sub && <p className="text-xs text-stahlgrau mt-1">{sub}</p>}
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

function AnalyticsBlock({
  label, connected, total, href,
}: {
  label: string
  connected: number
  total: number
  href: string
}) {
  const allConnected = connected === total && total > 0
  return (
    <Link href={href} className="flex flex-col justify-between p-4 rounded-xl border border-stone/60 bg-stone/10 hover:bg-stone/20 transition">
      <p className="text-xs font-medium text-stahlgrau mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-xl font-bold text-nachtblau">{connected}<span className="text-sm font-normal text-stahlgrau">/{total}</span></p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allConnected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {allConnected ? 'Alle verbunden' : 'Einrichten →'}
        </span>
      </div>
    </Link>
  )
}
