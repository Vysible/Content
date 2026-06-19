import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// GET — existing portal link for project
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireAuth()
  const link = await prisma.portalLink.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(link ?? null)
}

// POST — create portal link
// Body: { password: string, showAnalytics?: boolean, expiresInDays?: number }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireAuth()
  const { password, showAnalytics = false, expiresInDays = 365 } = await req.json()
  if (!password || password.length < 4) {
    return NextResponse.json({ error: 'Passwort zu kurz (min. 4 Zeichen)' }, { status: 400 })
  }
  // Delete existing links for this project first
  await prisma.portalLink.deleteMany({ where: { projectId: params.id } })
  const passwordHash = await bcrypt.hash(password, 10)
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
  const link = await prisma.portalLink.create({
    data: { projectId: params.id, passwordHash, expiresAt, showAnalytics },
  })
  return NextResponse.json(link)
}

// DELETE — remove portal link
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await requireAuth()
  await prisma.portalLink.deleteMany({ where: { projectId: params.id } })
  return NextResponse.json({ ok: true })
}
