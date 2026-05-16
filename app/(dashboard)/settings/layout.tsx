'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const settingsTabs = [
  { href: '/settings/api-keys', label: 'API-Keys' },
  { href: '/settings/canva', label: 'Canva' },
  { href: '/settings/wordpress', label: 'WordPress' },
  { href: '/settings/klicktipp', label: 'KlickTipp' },
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

      <nav className="flex gap-1 border-b border-stone mb-6 overflow-x-auto">
        {settingsTabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-3 py-2 text-sm whitespace-nowrap border-b-2 transition',
                active
                  ? 'border-cognac text-nachtblau font-medium'
                  : 'border-transparent text-stahlgrau hover:text-nachtblau hover:border-stone'
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
