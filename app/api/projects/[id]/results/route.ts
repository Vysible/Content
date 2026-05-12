import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import type { StoredTextResult } from '@/lib/generation/results-store'

// PATCH /api/projects/[id]/results
// Body: { index: number, updates: Partial<StoredTextResult> }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const { index, updates } = await req.json()

  if (typeof index !== 'number') {
    return NextResponse.json({ error: 'index fehlt' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { textResults: true },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const results = (project.textResults as unknown as StoredTextResult[] | null) ?? []

  if (index < 0 || index >= results.length) {
    return NextResponse.json({ error: 'Index außerhalb des Bereichs' }, { status: 400 })
  }

  results[index] = { ...results[index], ...updates }

  await prisma.project.update({
    where: { id: params.id },
    data: { textResults: JSON.parse(JSON.stringify(results)) },
  })

  return NextResponse.json({ ok: true })
}
