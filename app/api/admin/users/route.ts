import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    await requireAdmin()

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json(users)
  } catch (err: unknown) {
    logger.error({ err }, 'Fehler beim Laden der User-Liste')
    return NextResponse.json({ error: 'Nicht autorisiert oder interner Fehler' }, { status: 401 })
  }
}
