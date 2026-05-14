import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit/logger'

const reviewSchema = z.object({
  reviewMode: z.enum(['SIMPLE', 'COMPLETE']).optional(),
  hwgFlag:    z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth()

  const body = await req.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, createdById: true, reviewMode: true, hwgFlag: true },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const updateData: { reviewMode?: 'SIMPLE' | 'COMPLETE'; hwgFlag?: boolean } = {}
  if (parsed.data.reviewMode !== undefined) updateData.reviewMode = parsed.data.reviewMode
  if (parsed.data.hwgFlag    !== undefined) updateData.hwgFlag    = parsed.data.hwgFlag

  const updated = await prisma.project.update({
    where: { id: params.id },
    data:  updateData,
    select: { id: true, reviewMode: true, hwgFlag: true },
  })

  if (parsed.data.reviewMode !== undefined && parsed.data.reviewMode !== project.reviewMode) {
    await writeAuditLog({
      action:    'project.review_mode_change',
      entity:    'Project',
      entityId:  params.id,
      projectId: params.id,
      userId:    session.user.id,
      userEmail: session.user.email ?? undefined,
      meta:      { from: project.reviewMode, to: parsed.data.reviewMode },
    })
  }

  if (parsed.data.hwgFlag !== undefined && parsed.data.hwgFlag !== project.hwgFlag) {
    await writeAuditLog({
      action:    'project.hwg_flag_set',
      entity:    'Project',
      entityId:  params.id,
      projectId: params.id,
      userId:    session.user.id,
      userEmail: session.user.email ?? undefined,
      meta:      { hwgFlag: parsed.data.hwgFlag },
    })
  }

  return NextResponse.json(updated)
}
