import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

async function getPraxisUser(token: string) {
  const user = await prisma.praxisUser.findUnique({ where: { inviteToken: token } })
  if (!user || !user.active) return null
  return user
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const projectId = searchParams.get('projectId')

  if (!token || !projectId) return NextResponse.json({ error: 'token und projectId erforderlich' }, { status: 400 })

  const user = await getPraxisUser(token)
  if (!user || user.projectId !== projectId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const comments = await prisma.comment.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

export async function POST(req: Request) {
  const { token, projectId, contentIndex, text } = await req.json()
  if (!token || !projectId || contentIndex == null || !text) {
    return NextResponse.json({ error: 'Fehlende Felder' }, { status: 400 })
  }

  const user = await getPraxisUser(token)
  if (!user || user.projectId !== projectId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const comment = await prisma.comment.create({
    data: {
      projectId,
      contentIndex,
      text,
      authorName: user.name,
      authorRole: 'praxis',
    },
  })
  return NextResponse.json(comment)
}
