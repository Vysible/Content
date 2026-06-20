import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', db: 'ok', ts: new Date().toISOString() })
  } catch (err: unknown) {
    logger.warn({ err }, '[healthz] DB nicht erreichbar')
    return NextResponse.json({ status: 'error', db: 'unreachable' }, { status: 503 })
  }
}
