'use client'

import { useEffect, useState } from 'react'

interface AuditEntry {
  id:        string
  action:    string
  entity:    string
  entityId:  string | null
  userId:    string | null
  meta:      Record<string, unknown> | null
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  'project.create':             'Projekt angelegt',
  'project.update':             'Projekt aktualisiert',
  'project.delete':             'Projekt gelöscht',
  'project.status_change':      'Status geändert',
  'project.review_mode_change': 'Review-Modus geändert',
  'project.hwg_flag_set':       'HWG-Flag geändert',
  'generation.start':           'Generierung gestartet',
  'generation.complete':        'Generierung abgeschlossen',
  'generation.error':           'Generierung fehlgeschlagen',
  'export.download':            'Export heruntergeladen',
  'share_link.create':          'Freigabe-Link erstellt',
  'share_link.delete':          'Freigabe-Link gelöscht',
  'api_key.create':             'API-Key hinterlegt',
  'api_key.delete':             'API-Key entfernt',
  'user.login':                 'Anmeldung',
  'user.logout':                'Abmeldung',
  'admin.user.update':          'Nutzer aktualisiert',
  'admin.user.create':          'Nutzer angelegt',
  'praxis.approve':             'Praxis-Freigabe erteilt',
  'praxis.comment':             'Praxis-Kommentar',
  'praxis.invite':              'Praxis eingeladen',
  'wordpress.draft_created':    'WordPress-Draft erstellt',
  'wordpress.draft_blocked':    'WordPress-Draft gesperrt',
  'klicktipp.campaign_created': 'KlickTipp-Kampagne erstellt',
  'klicktipp.campaign_blocked': 'KlickTipp-Kampagne gesperrt',
  'klicktipp.credentials_saved':   'KlickTipp-Zugangsdaten gespeichert',
  'klicktipp.credentials_removed': 'KlickTipp-Zugangsdaten entfernt',
  'social.draft_blocked':       'Social-Draft gesperrt',
  'social.draft_created':       'Social-Draft erstellt',
}

const BLOCKED_ICON = '🔒'
const ACTION_ICONS: Record<string, string> = {
  'generation.start':    '⚙️',
  'generation.complete': '✅',
  'generation.error':    '❌',
  'export.download':     '📥',
  'user.login':          '🔑',
  'user.logout':         '🔑',
  'praxis.approve':      '✅',
  'praxis.invite':       '📨',
  'wordpress.draft_created':    '📝',
  'klicktipp.campaign_created': '📧',
  'social.draft_created':       '📱',
}

function getIcon(action: string, meta: Record<string, unknown> | null): string {
  if (meta?.blocked) return BLOCKED_ICON
  return ACTION_ICONS[action] ?? '📋'
}

function formatMeta(action: string, meta: Record<string, unknown> | null): string | null {
  if (!meta || Object.keys(meta).length === 0) return null
  if (meta.blocked) {
    const reason = meta.reason as string | undefined
    if (reason === 'hwg_flag_set') return 'Gesperrt wegen HWG-Flag'
    if (reason === 'review_not_freigegeben') return 'Gesperrt: Praxis-Freigabe fehlt'
    return 'Gesperrt'
  }
  if (action === 'project.review_mode_change') {
    return `${meta.from} → ${meta.to}`
  }
  if (action === 'project.hwg_flag_set') {
    return `HWG-Flag: ${meta.hwgFlag ? 'aktiviert' : 'deaktiviert'}`
  }
  if (action === 'export.download' && meta.filename) {
    return `Datei: ${meta.filename}`
  }
  if (action === 'wordpress.draft_created' && meta.wpPostId) {
    return `WordPress Post-ID: ${meta.wpPostId}`
  }
  if (action === 'praxis.approve' && meta.contentIndex !== undefined) {
    return `Inhalt #${(meta.contentIndex as number) + 1}`
  }
  return null
}

export function AuditLogTab({ projectId }: { projectId: string }) {
  const [logs,    setLogs]    = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/audit`)
      .then((r) => r.json())
      .then((data: { logs: AuditEntry[] }) => setLogs(data.logs ?? []))
      .catch((err: unknown) => console.error('[Vysible] AuditLogTab fetch failed:', err))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <p className="text-sm text-stahlgrau p-4">Lade Aktivitäten...</p>
  if (logs.length === 0) return <p className="text-sm text-stahlgrau p-4">Noch keine Aktivitäten aufgezeichnet.</p>

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const label   = ACTION_LABELS[log.action] ?? log.action
        const icon    = getIcon(log.action, log.meta)
        const detail  = formatMeta(log.action, log.meta)
        const blocked = !!log.meta?.blocked

        return (
          <div
            key={log.id}
            className={`border rounded-lg px-4 py-3 flex items-start gap-3 ${
              blocked ? 'bg-red-50 border-red-200' : 'bg-white border-stone'
            }`}
          >
            <span className="text-base mt-0.5 shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${blocked ? 'text-red-700' : 'text-anthrazit'}`}>
                {label}
              </p>
              {detail && (
                <p className="text-xs text-stahlgrau mt-0.5">{detail}</p>
              )}
            </div>
            <time className="text-xs text-stahlgrau whitespace-nowrap shrink-0">
              {new Date(log.createdAt).toLocaleString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </time>
          </div>
        )
      })}
    </div>
  )
}
