import { Sidebar } from '@/components/layout/sidebar'
import { TokenWarningBanner } from '@/components/layout/TokenWarningBanner'
import { AutoLogoutProvider } from '@/components/auth/AutoLogoutProvider'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <SessionProvider session={session}>
      <AutoLogoutProvider>
        <div className="flex min-h-screen bg-creme">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <TokenWarningBanner />
            <div className="p-6 max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </AutoLogoutProvider>
    </SessionProvider>
  )
}
