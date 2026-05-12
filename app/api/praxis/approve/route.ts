import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token, projectId, contentIndex } = await req.json()
  if (!token || !projectId || contentIndex == null) {
    return NextResponse.json({ error: 'Fehlende Felder' }, { status: 400 })
  }

  const user = await prisma.praxisUser.findUnique({ where: { inviteToken: token } })
  if (!user || !user.active || user.projectId !== projectId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { textResults: true },
  })
  if (!project) return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })

  const results = (project.textResults as Array<Record<string, unknown>> | null) ?? []
  if (results[contentIndex]) {
    results[contentIndex] = { ...results[contentIndex], blogStatus: 'freigegeben' }
    await prisma.project.update({
      where: { id: projectId },
      data: { textResults: results as any },
    })
  }

  return NextResponse.json({ ok: true })
}
