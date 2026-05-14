import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const logs = await prisma.auditLog.findMany({
    where:   { projectId: params.id },
    orderBy: { createdAt: 'desc' },
    take:    100,
    select: {
      id:        true,
      action:    true,
      entity:    true,
      entityId:  true,
      userEmail: true,
      meta:      true,
      createdAt: true,
    },
  })

  return NextResponse.json(logs)
}
