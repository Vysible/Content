import { requireAuth } from '@/lib/auth/session'
import { getGlobalKpis } from '@/lib/costs/aggregator'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireAuth()
  const kpis = await getGlobalKpis()
  return NextResponse.json(kpis)
}
