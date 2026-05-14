import { requireAuth } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import Link from 'next/link'

export default async function ResultsPage() {
  await requireAuth()

  return (
    <div>
      <Header title="Ergebnisansicht" subtitle="Generierte Inhalte deiner Projekte" />

      <div className="bg-white border border-stone rounded-xl p-8 text-center">
        <p className="text-stahlgrau mb-4">
          Bitte wähle ein Projekt um die Ergebnisse anzuzeigen.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-4 py-2 bg-nachtblau text-white text-sm rounded-lg hover:bg-tiefblau transition"
        >
          Zu den Projekten →
        </Link>
      </div>
    </div>
  )
}
