import { Sidebar } from '@/components/layout/sidebar'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-creme">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  )
}
