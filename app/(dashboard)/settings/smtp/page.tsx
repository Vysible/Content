import { Header } from '@/components/layout/header'
import { requireAdmin } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { SmtpForm } from './SmtpForm'

export default async function SmtpSettingsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/')
  }

  return (
    <div className="max-w-3xl">
      <Header
        title="E-Mail-Benachrichtigungen"
        subtitle="SMTP-Zugangsdaten verwalten und Testmail versenden (nur Admins)"
      />
      <SmtpForm />
    </div>
  )
}
