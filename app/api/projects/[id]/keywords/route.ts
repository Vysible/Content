import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { fetchKeywordSuggestions } from '@/lib/dataseo/client'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { fachgebiet: true, scrapedData: true },
  })
  if (!project) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const scrape = project.scrapedData as { contact?: { address?: string } } | null
  const standort = scrape?.contact?.address ?? ''

  const suggestions = await fetchKeywordSuggestions(
    project.fachgebiet ?? 'Arztpraxis',
    standort,
    params.id
  )

  return NextResponse.json({ suggestions })
}

// POST: Keywords in Projekt speichern
export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const { keywords } = await req.json()
  if (!Array.isArray(keywords)) {
    return NextResponse.json({ error: 'keywords muss ein Array sein' }, { status: 400 })
  }

  await prisma.project.update({
    where: { id: params.id },
    data: { keywords: keywords.filter((k: unknown) => typeof k === 'string') },
  })

  return NextResponse.json({ ok: true })
}
