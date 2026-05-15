import { writeAuditLog } from '@/lib/audit/logger'
import { prisma } from '@/lib/db'
import { getPraxisSession } from '@/lib/praxis/session'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getPraxisSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = session

  const comments = await prisma.comment.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

export async function POST(req: Request) {
  const session = await getPraxisSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contentIndex, text } = await req.json()
  if (contentIndex == null || !text) {
    return NextResponse.json({ error: 'contentIndex und text erforderlich' }, { status: 400 })
  }

  const { projectId, praxisUserId } = session

  const user = await prisma.praxisUser.findUnique({ where: { id: praxisUserId }, select: { name: true } })

  const comment = await prisma.comment.create({
    data: {
      projectId,
      contentIndex,
      text,
      authorName: user?.name ?? 'Praxis',
      authorRole: 'praxis',
    },
  })

  await writeAuditLog({
    action: 'praxis.comment',
    entity: 'Comment',
    entityId: comment.id,
    projectId,
    userId: praxisUserId,
    meta: { contentIndex },
  })

  return NextResponse.json(comment)
}
