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
      {logs.map((log) => (
        <div key={log.id} className="bg-white border border-stone rounded-lg px-4 py-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-stone text-anthrazit px-1.5 py-0.5 rounded">
                {log.action}
              </span>
            </div>
            {log.meta && Object.keys(log.meta).length > 0 && (
              <p className="text-xs text-stahlgrau mt-1 font-mono">
                {JSON.stringify(log.meta)}
              </p>
            )}
          </div>
          <time className="text-xs text-stahlgrau whitespace-nowrap">
            {new Date(log.createdAt).toLocaleString('de-DE', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </time>
        </div>
      ))}
    </div>
  )
}
