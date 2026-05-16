import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { postFacebookDraft, postInstagramDraft } from '@/lib/social/meta'
import { postLinkedInDraft } from '@/lib/social/linkedin'
import { sendNotification } from '@/lib/email/mailer'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { StoredTextResult } from '@/lib/generation/results-store'

const postSchema = z.object({
  index: z.number().int().min(0),
  kanal: z.enum(['SOCIAL_FACEBOOK', 'SOCIAL_INSTAGRAM', 'SOCIAL_LINKEDIN']),
  text: z.string().min(1).max(10_000),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() }, { status: 400 })
  }

  const { index, kanal, text } = parsed.data

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { name: true, textResults: true },
  })
  if (!project) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  let result
  if (kanal === 'SOCIAL_FACEBOOK') result = await postFacebookDraft(text)
  else if (kanal === 'SOCIAL_INSTAGRAM') result = await postInstagramDraft(text)
  else if (kanal === 'SOCIAL_LINKEDIN') result = await postLinkedInDraft(text)
  else return NextResponse.json({ error: `Unbekannter Kanal: ${kanal}` }, { status: 400 })

  // Status aktualisieren
  const results = (project.textResults as unknown as StoredTextResult[] | null) ?? []
  if (results[index]) {
    if (result.status === 'draft') {
      results[index] = {
        ...results[index],
        socialStatus: 'hochgeladen',
        socialDraftId: result.draftId,
        socialPlatform: result.platform,
        socialError: undefined,
      }
    } else {
      results[index] = {
        ...results[index],
        socialStatus: 'fehler',
        socialPlatform: result.platform,
        socialError: result.error,
      }
    }
    await prisma.project.update({
      where: { id: params.id },
      data: { textResults: JSON.parse(JSON.stringify(results)) },
    })
  }

  if (result.status === 'draft') {
    await sendNotification('draft_uploaded', project.name, `${kanal} Draft hochgeladen`)
  }

  return NextResponse.json(result)
}
