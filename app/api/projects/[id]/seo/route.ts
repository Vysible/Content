import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { analyzeSeo } from '@/lib/seo/analyzer'
import { generateMetaDescription } from '@/lib/seo/meta-generator'
import { logger } from '@/lib/utils/logger'
import type { StoredTextResult, StoredSeoResult } from '@/lib/generation/results-store'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const { index } = body as { index?: unknown }
  if (typeof index !== 'number') {
    return NextResponse.json({ error: 'index (number) erforderlich' }, { status: 400 })
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, createdById: true, textResults: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    if (project.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
    }

    const results = (project.textResults as unknown as StoredTextResult[] | null) ?? []
    const result = results[index]

    if (!result) {
      return NextResponse.json({ error: `Kein Eintrag bei Index ${index}` }, { status: 404 })
    }

    if (!result.blog) {
      return NextResponse.json({ error: 'SEO-Analyse nur für Blog-Artikel verfügbar' }, { status: 400 })
    }

    const { html, keyword, titel: blogTitel } = result.blog
    const title = result.titel ?? blogTitel

    const [analysis, aiMetaDescription] = await Promise.all([
      Promise.resolve(analyzeSeo({ title, html, keyword })),
      generateMetaDescription(title, html, keyword, project.id),
    ])

    const seoResult: StoredSeoResult = {
      ...analysis,
      aiMetaDescription,
      analyzedAt: new Date().toISOString(),
    }

    results[index] = { ...result, seo: seoResult }

    await prisma.project.update({
      where: { id: params.id },
      data: { textResults: JSON.parse(JSON.stringify(results)) },
    })

    logger.info({ projectId: params.id, index }, 'SEO-Analyse gespeichert')

    return NextResponse.json({ analysis, aiMetaDescription })
  } catch (err: unknown) {
    logger.error({ err, projectId: params.id }, 'Fehler bei SEO-Analyse')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
