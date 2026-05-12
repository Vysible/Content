import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// POST: neuen Share-Link erstellen
export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const { password } = await req.json()
  if (!password || typeof password !== 'string' || password.length < 4) {
    return NextResponse.json({ error: 'Passwort muss mindestens 4 Zeichen haben' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const passwordHash = await bcrypt.hash(password, 10)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Tage

  const link = await prisma.shareLink.create({
    data: { projectId: params.id, passwordHash, expiresAt },
  })

  return NextResponse.json({ token: link.token, expiresAt })
}

// GET: aktive Share-Links auflisten
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const links = await prisma.shareLink.findMany({
    where: { projectId: params.id, expiresAt: { gt: new Date() } },
    select: { token: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(links)
}

// DELETE: Share-Link widerrufen
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const { token } = await req.json()
  await prisma.shareLink.deleteMany({
    where: { projectId: params.id, token },
  })

  return NextResponse.json({ ok: true })
}
