'use client'

import { useState } from 'react'
import { GA4Dashboard } from './GA4Dashboard'
import { GoogleAdsDashboard } from '@/components/google-ads/GoogleAdsDashboard'

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

type Tab = 'ga4' | 'google-ads' | 'ki-kosten' | 'zugangsdaten'

const TABS: { key: Tab; label: string }[] = [
  { key: 'ga4',           label: 'Web-Analytics (GA4)' },
  { key: 'google-ads',    label: 'Google Ads' },
  { key: 'ki-kosten',     label: 'KI-Kosten' },
  { key: 'zugangsdaten',  label: 'Zugangsdaten' },
]

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white border border-stone rounded-xl p-8 text-center">
      <p className="text-sm text-stahlgrau">{text}</p>
    </div>
  )
}

function KiKostenCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-stone rounded-xl p-4">
      <p className="text-xs text-stahlgrau mb-1">{label}</p>
      <p className="text-xl font-bold text-nachtblau">{value}</p>
      {sub && <p className="text-xs text-stahlgrau mt-0.5">{sub}</p>}
    </div>
  )
}

function KiKostenTab() {
  const [kpis, setKpis] = useState<{
    projectsTotal: number; projectsActive: number; projectsArchived: number
    articlesGenerated: number; newslettersGenerated: number; socialPostsGenerated: number
    currentMonthEur: number; lastMonthEur: number; totalCostEur: number
    avgCostPerPackage: number; pendingApprovals: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  function load() {
    if (loaded) return
    setLoading(true)
    fetch('/api/kpi')
      .then(r => r.json())
      .then(data => { setKpis(data.kpis ?? null); setLoaded(true) })
      .catch(err => console.warn('[Vysible] KiKostenTab Ladefehler', err))
      .finally(() => setLoading(false))
  }

  if (!loaded && !loading) {
    load()
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="bg-white border border-stone rounded-xl p-4 animate-pulse">
            <div className="h-3 bg-stone/40 rounded w-24 mb-2" />
            <div className="h-6 bg-stone/40 rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (!kpis) return <EmptyState text="KI-Kostendaten konnten nicht geladen werden." />

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <KiKostenCard label="Projekte gesamt" value={String(kpis.projectsTotal)} sub={`${kpis.projectsActive} aktiv · ${kpis.projectsArchived} archiviert`} />
      <KiKostenCard label="Artikel generiert" value={String(kpis.articlesGenerated)} />
      <KiKostenCard label="Newsletter generiert" value={String(kpis.newslettersGenerated)} />
      <KiKostenCard label="Social Posts" value={String(kpis.socialPostsGenerated)} />
      <KiKostenCard label="Kosten lfd. Monat" value={`${kpis.currentMonthEur.toFixed(4)} €`} sub={`Vormonat: ${kpis.lastMonthEur.toFixed(4)} €`} />
      <KiKostenCard label="Kosten gesamt" value={`${kpis.totalCostEur.toFixed(4)} €`} sub={`Ø ${kpis.avgCostPerPackage.toFixed(4)} € / Paket`} />
      <KiKostenCard label="Ausstehende Freigaben" value={String(kpis.pendingApprovals)} />
    </div>
  )
}

function CredentialRow({ label, configured, hint }: { label: string; configured: boolean; hint: string }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-stone last:border-0">
      <div className="flex-1">
        <p className="text-sm font-semibold text-nachtblau">{label}</p>
        <p className="text-xs text-stahlgrau mt-0.5 font-mono">{hint}</p>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
        configured ? 'bg-green-100 text-green-700' : 'bg-stone text-stahlgrau'
      }`}>
        {configured ? '✓ Gesetzt' : 'Nicht gesetzt'}
      </span>
    </div>
  )
}

function ZugangsdatenTab({ ga4Configured, googleAdsConfigured }: { ga4Configured: boolean; googleAdsConfigured: boolean }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone rounded-xl p-5">
        <h3 className="text-sm font-bold text-nachtblau mb-1">Google Analytics 4</h3>
        <p className="text-xs text-stahlgrau mb-4">Service Account wird für den API-Zugriff auf GA4-Daten benötigt. In Coolify als Umgebungsvariable setzen.</p>
        <CredentialRow label="Service Account JSON" configured={ga4Configured} hint="GA4_SERVICE_ACCOUNT_JSON" />
      </div>

      <div className="bg-white border border-stone rounded-xl p-5">
        <h3 className="text-sm font-bold text-nachtblau mb-1">Google Ads</h3>
        <p className="text-xs text-stahlgrau mb-4">Für den Zugriff auf Google Ads Kampagnendaten werden vier Zugangsdaten benötigt.</p>
        <CredentialRow label="Developer Token" configured={googleAdsConfigured} hint="GOOGLE_ADS_DEVELOPER_TOKEN" />
        <CredentialRow label="Client ID" configured={googleAdsConfigured} hint="GOOGLE_ADS_CLIENT_ID" />
        <CredentialRow label="Client Secret" configured={googleAdsConfigured} hint="GOOGLE_ADS_CLIENT_SECRET" />
        <CredentialRow label="Refresh Token" configured={googleAdsConfigured} hint="GOOGLE_ADS_REFRESH_TOKEN" />
        <CredentialRow label="Manager Customer ID" configured={googleAdsConfigured} hint="GOOGLE_ADS_MANAGER_CUSTOMER_ID" />
      </div>

      <p className="text-xs text-stahlgrau">
        Alle Zugangsdaten werden ausschliesslich als Umgebungsvariablen in Coolify gespeichert — nie im Code oder in der Datenbank.
      </p>
    </div>
  )
}

export function AnalyticsTabView({ projects, ga4Configured, googleAdsConfigured }: Props) {
  const [active, setActive] = useState<Tab>('ga4')
  const [selectedId, setSelectedId] = useState<string>(projects[0]?.id ?? '')

  const selected = projects.find(p => p.id === selectedId)

  return (
    <div className="space-y-5">
      {/* Kundenauswahl */}
      {projects.length > 0 && active !== 'ki-kosten' && active !== 'zugangsdaten' && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-nachtblau whitespace-nowrap">Kunde:</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="flex-1 max-w-xs border border-stone rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-nachtblau/20 focus:border-nachtblau transition"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-stone/50 rounded-xl p-1.5">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-3 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap ${
              active === tab.key
                ? 'bg-brombeer text-anthrazit shadow-sm'
                : 'text-stahlgrau hover:text-anthrazit hover:bg-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inhalt */}
      {active === 'ga4' && (
        projects.length === 0
          ? <EmptyState text="Noch keine Projekte vorhanden." />
          : !selected?.ga4PropertyId
            ? (
              <div className="bg-white border border-stone rounded-xl p-6">
                <p className="text-sm font-semibold text-nachtblau mb-1">GA4 nicht konfiguriert</p>
                <p className="text-sm text-stahlgrau">Für <strong>{selected?.name}</strong> ist noch keine GA4 Property ID hinterlegt.</p>
                <a href={`/projects/${selectedId}/settings`} className="inline-block mt-3 text-xs font-semibold text-bordeaux hover:underline">
                  Jetzt einrichten →
                </a>
              </div>
            )
            : <GA4Dashboard projectId={selectedId} />
      )}

      {active === 'google-ads' && (
        projects.length === 0
          ? <EmptyState text="Noch keine Projekte vorhanden." />
          : !selected?.googleAdsCustomerId
            ? (
              <div className="bg-white border border-stone rounded-xl p-6">
                <p className="text-sm font-semibold text-nachtblau mb-1">Google Ads nicht konfiguriert</p>
                <p className="text-sm text-stahlgrau">Für <strong>{selected?.name}</strong> ist noch keine Customer ID hinterlegt.</p>
                <a href={`/projects/${selectedId}/settings`} className="inline-block mt-3 text-xs font-semibold text-bordeaux hover:underline">
                  Jetzt einrichten →
                </a>
              </div>
            )
            : <GoogleAdsDashboard projectId={selectedId} />
      )}

      {active === 'ki-kosten' && <KiKostenTab />}
      {active === 'zugangsdaten' && <ZugangsdatenTab ga4Configured={ga4Configured} googleAdsConfigured={googleAdsConfigured} />}
    </div>
  )
}
