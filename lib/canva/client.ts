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
  editUrl?: string
}

// Canva API v1 — verschachtelte Item-Struktur pro Typ
interface CanvaApiDesign {
  id: string
  title?: string
  thumbnail?: { url?: string }
  urls?: { edit_url?: string }
}
interface CanvaApiImage {
  id: string
  name?: string
  thumbnail?: { url?: string }
}
interface CanvaApiBrandTemplate {
  id: string
  title?: string
  thumbnail?: { url?: string }
}
interface CanvaApiFolder {
  id: string
  name?: string
}

interface CanvaApiItem {
  type: 'design' | 'image' | 'brand_template' | 'folder' | string
  design?: CanvaApiDesign
  image?: CanvaApiImage
  brand_template?: CanvaApiBrandTemplate
  folder?: CanvaApiFolder
}

interface CanvaFolderItemsResponse {
  items?: CanvaApiItem[]
  continuation?: string
}

/** Mappt ein Canva API-Item auf ein CanvaAsset (null = überspringen). */
function mapCanvaItem(item: CanvaApiItem): CanvaAsset | null {
  if (item.type === 'design' && item.design?.id) {
    return {
      id: item.design.id,
      name: item.design.title ?? item.design.id,
      type: 'design',
      thumbnailUrl: item.design.thumbnail?.url,
      editUrl: item.design.urls?.edit_url,
    }
  }
  if (item.type === 'image' && item.image?.id) {
    return {
      id: item.image.id,
      name: item.image.name ?? item.image.id,
      type: 'image',
      thumbnailUrl: item.image.thumbnail?.url,
    }
  }
  if (item.type === 'brand_template' && item.brand_template?.id) {
    return {
      id: item.brand_template.id,
      name: item.brand_template.title ?? item.brand_template.id,
      type: 'brand_template',
      thumbnailUrl: item.brand_template.thumbnail?.url,
    }
  }
  return null // folder und unbekannte Typen überspringen
}

/** Listet Unterordner des Root-Ordners via `folders/root/items`. Pagination inklusive. */
export async function listFolders(userId: string): Promise<CanvaFolder[]> {
  return withRetry(async () => {
    const token = await getValidCanvaToken(userId)
    const folders: CanvaFolder[] = []
    let continuation: string | undefined

    do {
      const url = new URL(`${CANVA_API}/folders/root/items`)
      url.searchParams.set('item_types', 'folder')
      if (continuation) url.searchParams.set('continuation', continuation)

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error(`Canva Folders HTTP ${res.status}`)
      }

      const data = (await res.json()) as CanvaFolderItemsResponse
      for (const item of data.items ?? []) {
        if (item.type === 'folder' && item.folder?.id) {
          folders.push({ id: item.folder.id, name: item.folder.name ?? item.folder.id })
        }
      }
      continuation = data.continuation
    } while (continuation)

    return folders
  }, 'canva.list_folders')
}

/** Listet Assets in einem Canva-Ordner (designs, images, brand_templates). Pagination inklusive. */
export async function listFolderAssets(folderId: string, userId: string): Promise<CanvaAsset[]> {
  return withRetry(async () => {
    const token = await getValidCanvaToken(userId)
    const assets: CanvaAsset[] = []
    let continuation: string | undefined

    do {
      const url = new URL(`${CANVA_API}/folders/${encodeURIComponent(folderId)}/items`)
      url.searchParams.set('item_types', 'design,image,brand_template')
      if (continuation) url.searchParams.set('continuation', continuation)

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error(`Canva Assets HTTP ${res.status}`)
      }

      const data = (await res.json()) as CanvaFolderItemsResponse
      for (const item of data.items ?? []) {
        const asset = mapCanvaItem(item)
        if (asset) assets.push(asset)
      }
      continuation = data.continuation
    } while (continuation)

    return assets
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
