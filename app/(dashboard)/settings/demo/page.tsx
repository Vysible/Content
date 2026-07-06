import { requireAdmin } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { DemoClient } from './DemoClient'

export default async function DemoSettingsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/')
  }

  return <DemoClient />
}
