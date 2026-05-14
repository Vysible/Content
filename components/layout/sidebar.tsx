'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

function VysibleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-label="Vysible">
      <circle cx="50" cy="50" r="50" fill="currentColor" />
      <circle cx="37" cy="32" r="7" fill="#F6F1E9" />
      <path d="M 49 30 L 65 30 L 58 86 L 50 86 Z" fill="#F6F1E9" />
    </svg>
  )
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/projects', label: 'Projekte', icon: '◈' },
  { href: '/projects/new', label: 'Neues Projekt', icon: '+' },
  { href: '/kpi', label: 'Social-KPIs', icon: '↗' },
  { href: '/praxis-portal', label: 'Praxis-Portal', icon: '⌂' },
  { href: '/analytics', label: 'Web-Analytics', icon: '⬡' },
  { href: '/settings/api-keys', label: 'API-Keys', icon: '⚿' },
  { href: '/settings/password', label: 'Passwort', icon: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-nachtblau text-creme flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-tiefblau">
        <VysibleLogo className="w-8 h-8 text-cognac" />
        <span className="font-bold text-sm tracking-wide">Vysible</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition',
                active
                  ? 'bg-cognac text-white font-medium'
                  : 'text-stahlgrau hover:bg-tiefblau hover:text-creme'
              )}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Abmelden */}
      <div className="p-2 border-t border-tiefblau">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stahlgrau hover:bg-tiefblau hover:text-creme transition"
        >
          <span className="text-base leading-none">⎋</span>
          Abmelden
        </button>
      </div>
    </aside>
  )
}