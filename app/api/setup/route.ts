import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function GET() {
  return handler()
}

export async function POST() {
  return handler()
}

async function handler() {
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD
  if (!initialPassword) {
    return NextResponse.json(
      { error: 'Setup nicht konfiguriert — INITIAL_ADMIN_PASSWORD env var fehlt' },
      { status: 503 },
    )
  }

  const count = await prisma.user.count()
  if (count > 0) {
    return NextResponse.json({ error: 'Setup bereits abgeschlossen' }, { status: 409 })
  }

  const password = await hash(initialPassword, 12)
  await prisma.user.create({
    data: {
      email: 'admin@vysible.de',
      name: 'Administrator',
      password,
      role: 'ADMIN',
    },
  })

  return NextResponse.json({ message: 'Admin-User angelegt' })
}
