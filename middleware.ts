import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

export default NextAuth(authConfig).auth

export const config = {
  matcher: ['/((?!api/auth|api/share|api/praxis|api/healthz|api/setup|api/debug|share|praxis|review|_next/static|_next/image|favicon\\.ico).*)'],
}
