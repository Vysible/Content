import { requireAuth } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'

export default async function AnalyticsPage() {
  await requireAuth()

  return (
    <div>
      <Header title="Web-Analytics" subtitle="Google Analytics 4 Integration" />

      <div className="bg-white border border-stone rounded-xl p-8 text-center">
        <p className="text-stahlgrau">
          Google Analytics 4 Integration kommt bald.
        </p>
      </div>
    </div>
  )
}
