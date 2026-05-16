'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  ga4PropertyId: string | null
  googleAdsCustomerId: string | null
}

interface Props {
  projects: Project[]
  ga4Configured: boolean
  googleAdsConfigured: boolean
}

type Tab = 'ga4' | 'google-ads' | 'social'

function ConfigBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="inline-flex items-center gap-1 text-xs text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      Konfiguriert
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-stahlgrau">
      <span className="w-1.5 h-1.5 rounded-full bg-stone inline-block" />
      Nicht konfiguriert
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-stahlgrau text-sm">{text}</div>
  )
}

function GA4Tab({ projects, serviceConfigured }: { projects: Project[]; serviceConfigured: boolean }) {
  return (
    <div className="space-y-4">
      {!serviceConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Hinweis:</strong>{' '}
          <code className="text-xs">GA4_SERVICE_ACCOUNT_JSON</code> ist in Coolify nicht gesetzt.
        </div>
      )}
      <div className="bg-white border border-stone rounded-xl overflow-hidden">
        {projects.length === 0 ? (
          <EmptyState text="Noch keine Projekte vorhanden." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-stone bg-stone/20">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Projekt</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Property ID</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/40">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-stone/10 transition">
                  <td className="px-4 py-3 font-medium text-nachtblau">{p.name}</td>
                  <td className="px-4 py-3">
                    {p.ga4PropertyId ? (
                      <span className="text-xs font-mono text-tiefblau">{p.ga4PropertyId}</span>
                    ) : (
                      <ConfigBadge configured={false} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {p.ga4PropertyId ? (
                      <Link href={`/projects/${p.id}/analytics`} className="text-xs text-cognac hover:underline font-medium">
                        Ansehen →
                      </Link>
                    ) : (
                      <Link href={`/projects/${p.id}/settings`} className="text-xs text-stahlgrau hover:underline">
                        Einrichten →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function GoogleAdsTab({ projects, serviceConfigured }: { projects: Project[]; serviceConfigured: boolean }) {
  return (
    <div className="space-y-4">
      {!serviceConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Hinweis:</strong> Google Ads API-Zugangsdaten (
          <code className="text-xs">GOOGLE_ADS_DEVELOPER_TOKEN</code> etc.) sind in Coolify nicht vollständig gesetzt.
        </div>
      )}
      <div className="bg-white border border-stone rounded-xl overflow-hidden">
        {projects.length === 0 ? (
          <EmptyState text="Noch keine Projekte vorhanden." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-stone bg-stone/20">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Projekt</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Customer ID</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/40">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-stone/10 transition">
                  <td className="px-4 py-3 font-medium text-nachtblau">{p.name}</td>
                  <td className="px-4 py-3">
                    {p.googleAdsCustomerId ? (
                      <span className="text-xs font-mono text-tiefblau">{p.googleAdsCustomerId}</span>
                    ) : (
                      <ConfigBadge configured={false} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {p.googleAdsCustomerId ? (
                      <Link href={`/projects/${p.id}/google-ads`} className="text-xs text-cognac hover:underline font-medium">
                        Ansehen →
                      </Link>
                    ) : (
                      <Link href={`/projects/${p.id}/settings`} className="text-xs text-stahlgrau hover:underline">
                        Einrichten →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function SocialTab() {
  return (
    <div className="bg-white border border-stone rounded-xl p-8 text-center space-y-2">
      <p className="text-sm font-semibold text-nachtblau">Social Media Analytics</p>
      <p className="text-sm text-stahlgrau">
        Folgt nach Freischaltung der Meta Business Verifizierung und LinkedIn Developer App.
      </p>
    </div>
  )
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'ga4',        label: 'Web-Analytics (GA4)' },
  { key: 'google-ads', label: 'Google Ads' },
  { key: 'social',     label: 'Social Media' },
]

export function AnalyticsTabView({ projects, ga4Configured, googleAdsConfigured }: Props) {
  const [active, setActive] = useState<Tab>('ga4')

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-stone">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              active === tab.key
                ? 'border-cognac text-nachtblau'
                : 'border-transparent text-stahlgrau hover:text-nachtblau'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'ga4'        && <GA4Tab        projects={projects} serviceConfigured={ga4Configured} />}
      {active === 'google-ads' && <GoogleAdsTab  projects={projects} serviceConfigured={googleAdsConfigured} />}
      {active === 'social'     && <SocialTab />}
    </div>
  )
}
