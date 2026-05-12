import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { authConfig } from '@/auth.config'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-Mail', type: 'email' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user || !user.active) return null

        const valid = await compare(parsed.data.password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        }
      },
    }),
  ],
})
