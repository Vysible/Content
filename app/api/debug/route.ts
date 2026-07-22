import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  await requireAuth()
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasNextauthSecret: !!process.env.NEXTAUTH_SECRET,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasDbUrl: !!process.env.DATABASE_URL,
    authTrustHost: process.env.AUTH_TRUST_HOST,
    nextauthUrl: process.env.NEXTAUTH_URL,
    ga4: {
      hasRefreshToken: !!process.env.GA4_REFRESH_TOKEN,
      hasClientId: !!process.env.GA4_CLIENT_ID,
      hasClientSecret: !!process.env.GA4_CLIENT_SECRET,
      refreshTokenLength: process.env.GA4_REFRESH_TOKEN?.length ?? 0,
      clientIdPrefix: process.env.GA4_CLIENT_ID?.slice(0, 8) ?? null,
    },
    googleAds: {
      hasDeveloperToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      hasClientId: !!process.env.GOOGLE_ADS_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
      hasRefreshToken: !!process.env.GOOGLE_ADS_REFRESH_TOKEN,
      clientIdPrefix: process.env.GOOGLE_ADS_CLIENT_ID?.slice(0, 8) ?? null,
    },
  })
}
