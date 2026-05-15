import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isCanvaConnected } from '@/lib/canva/auth'
import { listFolders } from '@/lib/canva/client'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * `GET /api/canva/folders`
 *
 * Liefert die Canva-Ordner des eingeloggten Users für das Wizard-Dropdown.
 * - 401 wenn nicht eingeloggt
 * - 200 mit `{ connected: false }` wenn der User keine Canva-Verbindung hat
 * - 200 mit `{ connected: true, folders: [...] }` bei Erfolg
 * - 502 bei Canva-API-Fehler (nach Retry) — Wizard zeigt Soft-Hinweis
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connected = await isCanvaConnected(session.user.id)
  if (!connected) {
    return NextResponse.json({ connected: false, folders: [] })
  }

  try {
    const folders = await listFolders(session.user.id)
    return NextResponse.json({ connected: true, folders })
  } catch (err: unknown) {
    logger.warn({ err, userId: session.user.id }, '[Vysible] Canva-Ordner konnten nicht geladen werden')
    return NextResponse.json(
      { connected: true, folders: [], error: 'Canva-Ordner konnten nicht geladen werden' },
      { status: 502 },
    )
  }
}
