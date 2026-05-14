import { requireAuth } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import Link from 'next/link'

export default async function PraxisPortalPage() {
  await requireAuth()

  return (
    <div>
      <Header title="Praxis-Portal" subtitle="Freigabe-Links für deine Kunden" />

      <div className="bg-white border border-stone rounded-xl p-8 text-center">
        <p className="text-stahlgrau mb-4">
          Hier verwaltest du die Praxis-Freigabe-Links für deine Kunden.
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
