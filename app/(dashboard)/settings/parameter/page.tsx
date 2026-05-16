import { requireAuth } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import ParameterSettingsForm from '@/components/settings/ParameterSettingsForm'

export default async function ParameterPage() {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') {
    redirect('/settings')
  }

  let config = await prisma.appConfig.findFirst()
  if (!config) {
    config = await prisma.appConfig.create({ data: {} })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-nachtblau">Parameter</h1>
        <p className="text-sm text-stahlgrau mt-1">
          Qualitätsschwellwerte und KI-Modell-Auswahl pro Aufgabe.
        </p>
      </div>
      <ParameterSettingsForm initial={config} />
    </div>
  )
}
