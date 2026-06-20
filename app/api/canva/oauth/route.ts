import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { buildAuthorizeUrl } from '@/lib/canva/auth'
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/canva/pkce'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'canva_oauth_state'
const VERIFIER_COOKIE = 'canva_oauth_verifier'
const TTL_SECONDS = 600 // 10 Minuten

/** Initiiert den Canva-OAuth-Flow mit PKCE. Setzt httpOnly-Cookies für State + Verifier. */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const state = randomUUID()
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const authorizeUrl = buildAuthorizeUrl(state, codeChallenge)

    const cookieStore = cookies()
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: TTL_SECONDS,
      path: '/',
    }
    cookieStore.set(STATE_COOKIE, state, cookieOpts)
    cookieStore.set(VERIFIER_COOKIE, codeVerifier, cookieOpts)

    return NextResponse.redirect(authorizeUrl)
  } catch (err: unknown) {
    logger.error({ err, userId: session.user.id }, 'Canva-OAuth-Authorize konnte nicht initialisiert werden')
    return NextResponse.redirect(new URL('/settings/canva?error=oauth_init_failed', req.url))
  }
}
