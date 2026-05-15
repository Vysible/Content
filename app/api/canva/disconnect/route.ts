import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { disconnectCanva } from '@/lib/canva/auth'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/** Entfernt die Canva-OAuth-Verbindung des eingeloggten Users (Token aus DB löschen). */
export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await disconnectCanva(session.user.id)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    logger.error({ err, userId: session.user.id }, 'Canva-Disconnect fehlgeschlagen')
    return NextResponse.json({ error: 'Disconnect fehlgeschlagen' }, { status: 500 })
  }
}
