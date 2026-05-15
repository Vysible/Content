import { requireAuth } from '@/lib/auth/session'
import { getAllTokenExpiryStatuses } from '@/lib/tokens/expiry-checker'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireAuth()
  const statuses = await getAllTokenExpiryStatuses()
  return NextResponse.json(statuses)
}
