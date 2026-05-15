import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { exchangeCodeForToken, persistCanvaToken } from '@/lib/canva/auth'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'canva_oauth_state'

/** Canva-OAuth-Callback: prüft State (CSRF), tauscht Code gegen Token, persistiert. */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateFromQuery = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  const cookieStore = cookies()
  const stateFromCookie = cookieStore.get(STATE_COOKIE)?.value
  cookieStore.delete(STATE_COOKIE) // immer löschen, single-use

  if (oauthError) {
    logger.warn({ userId: session.user.id, oauthError }, '[Vysible] Canva-OAuth vom Benutzer abgebrochen')
    return NextResponse.redirect(new URL(`/settings/canva?error=${encodeURIComponent(oauthError)}`, req.url))
  }

  if (!code || !stateFromQuery) {
    return NextResponse.redirect(new URL('/settings/canva?error=missing_code_or_state', req.url))
  }

  if (!stateFromCookie || stateFromCookie !== stateFromQuery) {
    logger.warn({ userId: session.user.id }, '[Vysible] Canva-OAuth State-Mismatch (CSRF-Verdacht)')
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  try {
    const token = await exchangeCodeForToken(code)
    await persistCanvaToken(session.user.id, token)
    return NextResponse.redirect(new URL('/settings/canva?connected=1', req.url))
  } catch (err: unknown) {
    logger.error({ err, userId: session.user.id }, 'Canva-Code-Exchange oder Token-Speichern fehlgeschlagen')
    return NextResponse.redirect(new URL('/settings/canva?error=token_exchange_failed', req.url))
  }
}
