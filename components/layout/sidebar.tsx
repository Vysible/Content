'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'


const navItems = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/projects', label: 'Projekte', icon: '◈' },
  { href: '/results', label: 'Ergebnisansicht', icon: '◫' },
  { href: '/praxis-portal', label: 'Praxis-Portal', icon: '⊕' },
  { href: '/kpi', label: 'Social-KPIs', icon: '↗' },
  { href: '/analytics', label: 'Web-Analytics', icon: '≋' },
  { href: '/settings', label: 'Einstellungen', icon: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-nachtblau text-creme flex flex-col h-screen sticky top-0">
      <div className="flex items-center px-4 py-5 border-b border-tiefblau">
        <Image src="/logo.png" alt="Vysible" width={120} height={40} className="object-contain" priority />
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
        <p className="text-center text-[10px] text-stahlgrau/60 px-2 pt-1 pb-2 leading-tight">
          © Prof. Dr.-Ing. Kai Daniel 😊
        </p>
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