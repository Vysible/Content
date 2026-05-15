import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import { getValidCanvaToken } from './auth'

const CANVA_API = 'https://api.canva.com/rest/v1'

export interface CanvaFolder {
  id: string
  name: string
}

export interface CanvaAsset {
  id: string
  name: string
  type: string
  thumbnailUrl?: string
}

interface RawFolderItem {
  id?: string
  name?: string
  type?: string
  thumbnail?: { url?: string }
}

interface FoldersResponse {
  items?: RawFolderItem[]
}

/** Listet die Ordner des verbundenen Canva-Accounts. Throws wenn nicht verbunden. */
export async function listFolders(userId: string): Promise<CanvaFolder[]> {
  return withRetry(async () => {
    const token = await getValidCanvaToken(userId)

    const res = await fetch(`${CANVA_API}/folders`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      throw new Error(`Canva Folders HTTP ${res.status}`)
    }

    const data = (await res.json()) as FoldersResponse
    return (data.items ?? [])
      .filter((it): it is RawFolderItem & { id: string; name: string } =>
        typeof it.id === 'string' && typeof it.name === 'string',
      )
      .map((it) => ({ id: it.id, name: it.name }))
  }, 'canva.list_folders')
}

/** Listet Assets in einem Canva-Ordner. Throws wenn nicht verbunden oder Ordner nicht erreichbar. */
export async function listFolderAssets(folderId: string, userId: string): Promise<CanvaAsset[]> {
  return withRetry(async () => {
    const token = await getValidCanvaToken(userId)

    const res = await fetch(`${CANVA_API}/folders/${encodeURIComponent(folderId)}/items`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      throw new Error(`Canva Assets HTTP ${res.status}`)
    }

    const data = (await res.json()) as FoldersResponse
    return (data.items ?? [])
      .filter((it): it is RawFolderItem & { id: string; name: string; type: string } =>
        typeof it.id === 'string' && typeof it.name === 'string' && typeof it.type === 'string',
      )
      .map((it) => ({
        id: it.id,
        name: it.name,
        type: it.type,
        thumbnailUrl: it.thumbnail?.url,
      }))
  }, 'canva.list_folder_assets')
}

/** Erstellt einen Kontext-String für den KI-Prompt aus Canva-Assets. */
export function buildCanvaContext(assets: CanvaAsset[]): string {
  if (assets.length === 0) return ''
  // Maximal 20 Assets in den Prompt-Kontext — Token-Budget schonen.
  const limited = assets.slice(0, 20)
  const lines = limited.map((a) => `- ${a.name} (${a.type}, ID: ${a.id})`)
  const more = assets.length > limited.length ? `\n(... ${assets.length - limited.length} weitere ausgelassen)` : ''
  return `Verfügbare Canva-Assets:\n${lines.join('\n')}${more}`
}

/** Wird vom Pipeline-Schritt verwendet, um Canva-Fehler non-fatal zu behandeln. */
export function logCanvaError(context: string, err: unknown, meta?: Record<string, unknown>): void {
  logger.warn({ err, ...meta }, `[Vysible] ${context} — Pipeline läuft ohne Canva-Kontext weiter`)
}
