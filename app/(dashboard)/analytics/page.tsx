import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import Link from 'next/link'

export default async function AnalyticsPage() {
  await requireAuth()

  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, ga4PropertyId: true },
  })

  return (
    <div>
      <Header title="Web-Analytics" subtitle="Google Analytics 4 pro Projekt" />

      <div className="bg-white border border-stone rounded-xl overflow-hidden">
        {projects.length === 0 ? (
          <div className="p-8 text-center text-stahlgrau text-sm">
            Noch keine Projekte vorhanden.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-stone bg-stone/20">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Projekt</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">GA4 Property</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/40">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-stone/10 transition">
                  <td className="px-4 py-3 font-medium text-nachtblau">{project.name}</td>
                  <td className="px-4 py-3">
                    {project.ga4PropertyId ? (
                      <span className="text-xs font-mono text-tiefblau">{project.ga4PropertyId}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-stahlgrau">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone inline-block" />
                        Nicht konfiguriert
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    {project.ga4PropertyId ? (
                      <Link
                        href={`/projects/${project.id}/analytics`}
                        className="text-xs text-cognac hover:underline font-medium"
                      >
                        Analytics →
                      </Link>
                    ) : (
                      <Link
                        href={`/projects/${project.id}/settings`}
                        className="text-xs text-stahlgrau hover:underline"
                      >
                        Einrichten →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!process.env.GA4_SERVICE_ACCOUNT_JSON && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Hinweis:</strong> <code className="text-xs">GA4_SERVICE_ACCOUNT_JSON</code> ist nicht
          gesetzt — Analytics-Daten können erst abgerufen werden wenn der Service Account konfiguriert ist.
        </div>
      )}
    </div>
  )
}
