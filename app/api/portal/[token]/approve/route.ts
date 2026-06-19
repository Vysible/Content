import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import type { StoredTextResult } from '@/lib/generation/results-store'

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { index, action, comment } = await req.json()

  const link = await prisma.portalLink.findUnique({
    where: { token: params.token },
    select: { projectId: true, expiresAt: true },
  })
  if (!link || link.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Link ungültig' }, { status: 404 })
  }

  const project = await prisma.project.findUnique({
    where: { id: link.projectId },
    select: { textResults: true },
  })
  if (!project) return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })

  const results = (project.textResults as unknown as StoredTextResult[]) ?? []
  if (index < 0 || index >= results.length) {
    return NextResponse.json({ error: 'Ungültiger Index' }, { status: 400 })
  }

  results[index] = {
    ...results[index],
    customerApproval: action,
    customerComment: comment ?? '',
  }

  await prisma.project.update({
    where: { id: link.projectId },
    data: { textResults: JSON.parse(JSON.stringify(results)) },
  })

  return NextResponse.json({ ok: true })
}
