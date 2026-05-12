import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'

export interface CanvaAsset {
  id: string
  name: string
  type: string
  thumbnailUrl?: string
}

async function getAccessToken(): Promise<string> {
  const key = await prisma.apiKey.findFirst({
    where: { provider: 'CANVA', active: true },
  })
  if (!key) throw new Error('Kein aktiver Canva-API-Key konfiguriert')
  return decrypt(key.encryptedKey)
}

const CANVA_API = 'https://api.canva.com/rest/v1'

/** Listet Assets in einem Canva-Ordner (Slice 17: nur Lesen) */
export async function listFolderAssets(folderId: string): Promise<CanvaAsset[]> {
  const token = await getAccessToken()

  const res = await fetch(`${CANVA_API}/folders/${folderId}/items`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Canva API Fehler: ${err}`)
  }

  const data = await res.json()
  return (data.items ?? []).map((item: { id: string; name: string; type: string; thumbnail?: { url?: string } }) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    thumbnailUrl: item.thumbnail?.url,
  }))
}

/** Erstellt einen Kontext-String für den KI-Prompt aus Canva-Assets */
export function buildCanvaContext(assets: CanvaAsset[]): string {
  if (assets.length === 0) return ''
  const lines = assets.map((a) => `- ${a.name} (${a.type}, ID: ${a.id})`)
  return `Verfügbare Canva-Assets:\n${lines.join('\n')}`
}
