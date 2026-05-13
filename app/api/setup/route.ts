import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST() {
  const count = await db.user.count()
  if (count > 0) {
    return NextResponse.json({ error: 'Setup bereits abgeschlossen' }, { status: 409 })
  }

  const password = await hash('admin123', 12)
  await db.user.create({
    data: {
      email: 'admin@vysible.de',
      name: 'Administrator',
      password,
      role: 'ADMIN',
    },
  })

  return NextResponse.json({
    message: 'Admin-User angelegt',
    email: 'admin@vysible.de',
    password: 'admin123',
    hint: 'Passwort nach erstem Login ändern!',
  })
}
