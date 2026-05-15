import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { buildAuthorizeUrl } from '@/lib/canva/auth'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'canva_oauth_state'
const STATE_TTL_SECONDS = 600 // 10 Minuten

/** Initiiert den Canva-OAuth-Flow. Setzt ein httpOnly-State-Cookie (CSRF) und redirected zu Canva. */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const state = randomUUID()
    const authorizeUrl = buildAuthorizeUrl(state)

    const cookieStore = cookies()
    cookieStore.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_TTL_SECONDS,
      path: '/',
    })

    return NextResponse.redirect(authorizeUrl)
  } catch (err: unknown) {
    logger.error({ err, userId: session.user.id }, 'Canva-OAuth-Authorize konnte nicht initialisiert werden')
    return NextResponse.redirect(new URL('/settings/canva?error=oauth_init_failed', req.url))
  }
}
