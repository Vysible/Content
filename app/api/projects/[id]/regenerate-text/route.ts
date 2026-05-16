import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import {
  generateBlogOutlines,
  generateTexts,
} from '@/lib/generation/texts'
import { buildContext } from '@/lib/generation/context-builder'
import type { ThemenItem } from '@/lib/generation/themes-schema'
import type { TextResult } from '@/lib/generation/texts-schema'
import type { StoredTextResult } from '@/lib/generation/results-store'

const bodySchema = z.object({ monat: z.string().min(1) })

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'monat erforderlich' }, { status: 400 })
  }
  const { monat } = parsed.data

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })

  const themes = (project.themeResults as unknown as ThemenItem[] | null) ?? []
  const theme = themes.find((t) => t.monat === monat)
  if (!theme) return NextResponse.json({ error: `Thema für "${monat}" nicht gefunden` }, { status: 404 })

  const { systemContext: positioningContext } = buildContext({
    positioningDocument: project.positioningDocument ?? undefined,
    keywords: project.keywords,
    themenPool: project.themenPool ?? undefined,
  })

  const blogOutlines: Record<string, string> = {}
  if (theme.kanal === 'BLOG') {
    const outlineResults = await generateBlogOutlines({
      themes: [theme],
      project,
      positioningContext,
    })
    if (outlineResults[monat]) blogOutlines[monat] = outlineResults[monat]
  }

  // generateTexts handles its own partial save; we only need the single result
  const [newResult] = await generateTexts({
    project,
    themes: [theme],
    positioningContext,
    blogOutlines,
  })

  // Merge into existing textResults
  const existing = (project.textResults as unknown as StoredTextResult[] | null) ?? []
  const idx = existing.findIndex((r) => r.monat === monat)
  const merged: StoredTextResult[] = idx >= 0
    ? existing.map((r, i) => i === idx ? { ...r, ...newResult } : r)
    : [...existing, newResult as StoredTextResult]

  await prisma.project.update({
    where: { id: params.id },
    data: { textResults: merged as unknown as Prisma.InputJsonValue },
  })

  return NextResponse.json({ ok: true, result: newResult })
}
