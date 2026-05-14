import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasNextauthSecret: !!process.env.NEXTAUTH_SECRET,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasDbUrl: !!process.env.DATABASE_URL,
    authTrustHost: process.env.AUTH_TRUST_HOST,
    nextauthUrl: process.env.NEXTAUTH_URL,
  })
}
