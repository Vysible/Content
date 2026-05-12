import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token erforderlich' }, { status: 400 })

  const user = await prisma.praxisUser.findUnique({
    where: { inviteToken: token },
    include: { project: { select: { id: true, name: true, textResults: true } } },
  })

  if (!user) return NextResponse.json({ error: 'Ungültiger Token' }, { status: 404 })
  if (user.inviteExpires < new Date()) return NextResponse.json({ error: 'Token abgelaufen' }, { status: 410 })

  if (!user.active) {
    await prisma.praxisUser.update({ where: { id: user.id }, data: { active: true } })
  }

  return NextResponse.json({
    userId: user.id,
    name: user.name,
    projectId: user.project.id,
    projectName: user.project.name,
    textResults: user.project.textResults,
  })
}
