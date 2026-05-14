// Lokale Typ-Definitionen als Fallback wenn @prisma/client Modell-Typen
// im Build nicht verfügbar sind (pnpm/Docker Layer Cache Issue)

export interface Project {
  id: string
  name: string
  praxisUrl: string
  praxisName: string | null
  fachgebiet: string | null
  planningStart: Date
  planningEnd: Date
  channels: string[]
  positioningDocument: string | null
  themenPool: string | null
  keywords: string[]
  canvaFolderId: string | null
  wpUrl: string | null
  ktListId: string | null
  apiKeyId: string | null
  scrapedData: unknown
  themeResults: unknown
  textResults: unknown
  status: string
  createdAt: Date
  updatedAt: Date
  createdById: string
}
