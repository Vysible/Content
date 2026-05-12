import { requireAuth } from '@/lib/auth/session'
import { getExpiringKeys } from '@/lib/tokens/expiry-checker'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireAuth()
  const keys = await getExpiringKeys()
  return NextResponse.json(keys)
}
