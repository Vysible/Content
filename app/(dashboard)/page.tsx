import { Header } from '@/components/layout/header'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await requireAuth()

  const [apiKeyCount, costSum, pendingApprovals] = await Promise.all([
    prisma.apiKey.count({ where: { active: true } }),
    prisma.costEntry.aggregate({ _sum: { costEur: true } }),
    prisma.comment.count({
      where: {
        project: { createdById: session.user.id },
        authorRole: 'praxis',
      },
    }),
  ])

  const totalCost = costSum._sum.costEur ?? 0

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Willkommen, ${session.user.name ?? session.user.email}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Aktive API-Keys" value={apiKeyCount.toString()} href="/settings/api-keys" />
        <StatCard label="KI-Kosten gesamt" value={`${totalCost.toFixed(4)} €`} />
        <StatCard label="Praxis-Kommentare" value={pendingApprovals.toString()} href="/praxis-portal" badge={pendingApprovals > 0} />
      </div>

      {apiKeyCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Nächster Schritt:</strong>{' '}
          <Link href="/settings/api-keys" className="underline hover:text-amber-900">
            API-Key konfigurieren
          </Link>{' '}
          (Anthropic oder OpenAI), um Inhalte generieren zu können.
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, href, badge }: { label: string; value: string; href?: string; badge?: boolean }) {
  const inner = (
    <div className="relative bg-white border border-stone rounded-xl p-4 hover:shadow-sm transition">
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full" />
      )}
      <p className="text-xs text-stahlgrau mb-1">{label}</p>
      <p className="text-2xl font-bold text-nachtblau">{value}</p>
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}
