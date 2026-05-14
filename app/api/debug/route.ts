import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasNextauthSecret: !!process.env.NEXTAUTH_SECRET,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasDbUrl: !!process.env.DATABASE_URL,
    authTrustHost: process.env.AUTH_TRUST_HOST,
    nextauthUrl: process.env.NEXTAUTH_URL,
  })
}
