'use client'

import { useEffect, useState } from 'react'

interface CanvaFolderOption {
  id: string
  name: string
}

interface CanvaFolderResponse {
  connected: boolean
  folders: CanvaFolderOption[]
  error?: string
}

interface CanvaFolderSelectorProps {
  value: string | null
  onChange: (folderId: string | null, folderName: string | null) => void
}

type LoadState = 'loading' | 'not_connected' | 'load_error' | 'ready'

export function CanvaFolderSelector({ value, onChange }: CanvaFolderSelectorProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [folders, setFolders] = useState<CanvaFolderOption[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/canva/folders')
        const data = (await res.json().catch((err: unknown) => {
          console.warn('[Vysible] Canva-Folders Response-Parse fehlgeschlagen', err)
          return { connected: false, folders: [] } as CanvaFolderResponse
        })) as CanvaFolderResponse

        if (cancelled) return

        if (!data.connected) {
          setState('not_connected')
          setFolders([])
          return
        }

        if (!res.ok || data.error) {
          setState('load_error')
          setErrorMsg(data.error ?? `HTTP ${res.status}`)
          return
        }

        setFolders(data.folders ?? [])
        setState('ready')
      } catch (err: unknown) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        console.warn('[Vysible] Canva-Folders Abruf fehlgeschlagen', err)
        setState('load_error')
        setErrorMsg(message)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    if (!id) {
      onChange(null, null)
      return
    }
    const folder = folders.find((f) => f.id === id) ?? null
    onChange(id, folder?.name ?? null)
  }

  return (
    <div>
      <label className="block text-xs font-medium text-anthrazit mb-1">
        Canva-Ordner <span className="text-stahlgrau font-normal">(optional)</span>
      </label>

      {state === 'loading' && (
        <p className="text-xs text-stahlgrau py-2">Canva-Ordner werden geladen …</p>
      )}

      {state === 'not_connected' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          Canva ist <strong>nicht verbunden</strong>. Asset-Namen können nicht in den
          KI-Kontext einfließen. Unter{' '}
          <a href="/settings/canva" className="underline hover:text-amber-900">
            /settings/canva
          </a>{' '}
          verbinden — du kannst das Projekt aber auch ohne Canva anlegen.
        </div>
      )}

      {state === 'load_error' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          [WARN] Canva-Ordner konnten nicht geladen werden ({errorMsg}). Das Projekt
          lässt sich trotzdem anlegen — Asset-Namen fließen dann nicht in den
          KI-Kontext ein.
        </div>
      )}

      {state === 'ready' && (
        <>
          <select
            value={value ?? ''}
            onChange={handleSelect}
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cognac"
          >
            <option value="">— kein Canva-Ordner —</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {folders.length === 0 && (
            <p className="text-xs text-stahlgrau mt-1">
              Keine Ordner im Canva-Account gefunden.
            </p>
          )}
        </>
      )}
    </div>
  )
}
