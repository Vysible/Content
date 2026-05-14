import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { writeAuditLog } from '@/lib/audit/logger'
import { z } from 'zod'

const schema = z.object({
  active: z.boolean().optional(),
  role: z.enum(['ADMIN', 'STAFF']).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  let session: Awaited<ReturnType<typeof requireAdmin>>
  try {
    session = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Felder' }, { status: 400 })
  }

  // Admin darf sich selbst nicht deaktivieren
  if (params.id === session.user.id && parsed.data.active === false) {
    return NextResponse.json(
      { error: 'Eigenes Konto kann nicht deaktiviert werden' },
      { status: 400 },
    )
  }

  try {
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: parsed.data,
      select: { id: true, email: true, role: true, active: true },
    })

    await writeAuditLog({
      action: 'admin.user.update',
      entity: 'User',
      entityId: params.id,
      userId: session.user.id,
      meta: { changes: parsed.data },
    })

    logger.info({ targetUserId: params.id, changes: parsed.data }, 'Admin: User aktualisiert')

    return NextResponse.json(updated)
  } catch (err: unknown) {
    logger.error({ err, userId: params.id }, 'Fehler beim User-Update')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
