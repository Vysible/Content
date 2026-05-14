import type { NextAuthConfig } from 'next-auth'

// Edge-Runtime-kompatible Konfiguration (kein Prisma hier)
export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 Tage
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname === '/login'

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl))
        return true
      }
      return isLoggedIn
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? ''
        token.role = (user as { role: string }).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  providers: [],
}
