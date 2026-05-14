import { requireAdmin } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { UserManagementClient } from './UserManagementClient'
import { Header } from '@/components/layout/header'

export default async function UsersSettingsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/')
  }

  return (
    <div>
      <Header
        title="Benutzerverwaltung"
        subtitle="Benutzer aktivieren/deaktivieren und Rollen verwalten (nur Admins)"
      />
      <UserManagementClient />
    </div>
  )
}
