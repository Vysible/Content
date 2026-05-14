import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where:  { id: params.id },
    select: { id: true },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const logs = await prisma.auditLog.findMany({
    where:   { projectId: params.id },
    orderBy: { createdAt: 'desc' },
    take:    50,
    select: {
      id:        true,
      action:    true,
      entity:    true,
      entityId:  true,
      userId:    true,
      // userEmail: bewusst nicht zurückgegeben — PII
      meta:      true,
      createdAt: true,
    },
  })

  return NextResponse.json({ logs })
}
