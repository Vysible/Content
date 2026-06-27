'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  projectId: string
}

const TABS = (id: string) => [
  { label: 'Übersicht',   href: `/projects/${id}`,             exact: true },
  { label: 'Ergebnisse',  href: `/projects/${id}/results`,      exact: false },
  { label: 'Anbindungen', href: `/projects/${id}/connections`,  exact: false },
  { label: 'Analysen',    href: `/projects/${id}/analytics`,    exact: false },
]

export function ProjectTabs({ projectId }: Props) {
  const pathname = usePathname()

  return (
    <div className="flex gap-1.5 mb-6 bg-stone/50 rounded-xl p-1.5">
      {TABS(projectId).map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 text-center px-3 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap ${
              active
                ? 'bg-white text-nachtblau shadow-sm'
                : 'text-stahlgrau hover:text-anthrazit hover:bg-white/60'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
