import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { logger } from '@/lib/utils/logger'

const PRAXIS_SECRET = new TextEncoder().encode(process.env.PRAXIS_SESSION_SECRET ?? '')
const COOKIE_NAME = 'praxis_session'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

export interface PraxisSession {
  praxisUserId: string
  projectId: string
}

export async function getPraxisSession(): Promise<PraxisSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, PRAXIS_SECRET)
    return {
      praxisUserId: payload.praxisUserId as string,
      projectId: payload.projectId as string,
    }
  } catch (err: unknown) {
    logger.warn({ err }, 'Praxis-Session-Cookie ungueltig oder abgelaufen')
    return null
  }
}

export async function setPraxisSession(praxisUserId: string, projectId: string): Promise<void> {
  const token = await new SignJWT({ praxisUserId, projectId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(PRAXIS_SECRET)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}
