import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { fetchMetaAnalytics } from '@/lib/social-analytics/meta'
import { fetchLinkedInAnalytics } from '@/lib/social-analytics/linkedin'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  let project: { id: string } | null
  try {
    project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
  } catch (err) {
    logger.error({ err, projectId: params.id }, 'social-analytics: DB-Fehler')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate') ?? (() => {
    const d = new Date(); d.setDate(d.getDate() - 28); return d.toISOString().slice(0, 10)
  })()
  const endDate = searchParams.get('endDate') ?? new Date().toISOString().slice(0, 10)

  const [metaResult, linkedInResult] = await Promise.all([
    fetchMetaAnalytics(params.id, startDate, endDate),
    fetchLinkedInAnalytics(params.id, startDate, endDate),
  ])

  logger.info({ projectId: params.id, startDate, endDate }, 'social-analytics: Daten zusammengestellt')

  return NextResponse.json({
    facebook: metaResult.facebook,
    instagram: metaResult.instagram,
    linkedin: linkedInResult.linkedin,
    errors: {
      meta: metaResult.error ?? null,
      linkedin: linkedInResult.error ?? null,
    },
  })
}
