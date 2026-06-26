'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const settingsTabs = [
  { href: '/settings/api-keys', label: 'API-Keys' },
  { href: '/settings/canva', label: 'Canva' },
  { href: '/settings/smtp', label: 'E-Mail (SMTP)' },
  { href: '/settings/billing', label: 'Kosten & Abrechnung' },
  { href: '/settings/parameter', label: 'Parameter' },
  { href: '/settings/users', label: 'Benutzer' },
  { href: '/settings/password', label: 'Passwort' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <h1 className="text-xl font-bold text-nachtblau mb-1">Einstellungen</h1>
      <p className="text-sm text-stahlgrau mb-6">Konto, Integrationen und Systemkonfiguration</p>

      <nav className="flex gap-1.5 bg-stone/50 rounded-xl p-1.5 mb-6 overflow-x-auto">
        {settingsTabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-3 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition',
                active
                  ? 'bg-brombeer text-anthrazit shadow-sm'
                  : 'text-stahlgrau hover:text-anthrazit hover:bg-white/60'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {children}
    </div>
  )
}
