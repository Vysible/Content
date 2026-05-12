import { Header } from '@/components/layout/header'
import { requireAuth } from '@/lib/auth/session'
import { NewProjectWizard } from '@/components/wizard/NewProjectWizard'

export default async function NewProjectPage() {
  await requireAuth()

  return (
    <div>
      <Header title="Neues Projekt" subtitle="Praxis-URL eingeben und Content-Paket konfigurieren." />
      <NewProjectWizard />
    </div>
  )
}
