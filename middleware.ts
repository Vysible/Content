import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/auth.config'
import { rateLimit } from '@/lib/ratelimit'

const { auth } = NextAuth(authConfig)

export default auth(function middleware(req) {
  const { pathname } = req.nextUrl

  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/generate/stream/')
  ) {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    if (!rateLimit(ip, 60, 60_000)) {
      return new NextResponse(
        JSON.stringify({ error: 'Zu viele Anfragen — bitte 1 Minute warten' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      )
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/auth|api/share|api/praxis|api/partner|api/healthz|api/setup|api/debug|share|praxis|partner|review|impressum|datenschutz|_next/static|_next/image|favicon\\.ico).*)'],
}
