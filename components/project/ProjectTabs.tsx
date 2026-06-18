'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  projectId: string
}

const TABS = (id: string) => [
  { label: 'Übersicht',  href: `/projects/${id}`,          exact: true },
  { label: 'Ergebnisse', href: `/projects/${id}/results`,   exact: false },
  { label: 'Analysen',   href: `/projects/${id}/analytics`, exact: false },
]

export function ProjectTabs({ projectId }: Props) {
  const pathname = usePathname()

  return (
    <div className="border-b border-stone mb-6">
      <div className="flex">
        {TABS(projectId).map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
                active
                  ? 'border-cognac text-cognac'
                  : 'border-transparent text-stahlgrau hover:text-anthrazit'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
