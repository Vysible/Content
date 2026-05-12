import { requireAuth } from '@/lib/auth/session'
import { listTemplates } from '@/lib/templates/loader'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireAuth()
  return NextResponse.json(listTemplates())
}
