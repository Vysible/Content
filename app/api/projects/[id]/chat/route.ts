import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { getAnthropicClient } from '@/lib/ai/client'
import { trackCost } from '@/lib/costs/tracker'
import { DEFAULT_MODEL } from '@/config/model-prices'
import { NextResponse } from 'next/server'
import type { StoredTextResult, ContentVersion } from '@/lib/generation/results-store'

const CHIPS: Record<string, string> = {
  kuerzer:        'Mache den Text kürzer (ca. 20% weniger Wörter), ohne Kernaussagen zu verlieren.',
  formaler:       'Formuliere den Text formaler und professioneller.',
  lockerer:       'Formuliere den Text lockerer und zugänglicher.',
  praxisbezug:    'Erhöhe den Praxisbezug: mehr Erwähnung des Praxisnamens, konkreter Standort und Leistungen.',
  cta:            'Verstärke den CTA – mache ihn eindeutiger und handlungsorientierter.',
  seo:            'Verbessere die SEO-Optimierung: Keyword häufiger, Titel als Frage wenn möglich.',
  keyword:        'Integriere das Primärkeyword natürlicher im Text (mindestens 3x).',
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireAuth()

  const { index, message, chip, currentContent, versionField } = await req.json()
  // versionField: 'blog' | 'newsletter'

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, textResults: true },
  })
  if (!project) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const results = (project.textResults as unknown as StoredTextResult[] | null) ?? []
  const item = results[index]
  if (!item) return NextResponse.json({ error: 'Index ungültig' }, { status: 400 })

  const userMessage = chip ? CHIPS[chip] ?? message : message

  const systemPrompt = `Du bist ein Content-Editor für Arzt- und Zahnarztpraxen.
Der Nutzer möchte folgenden ${versionField === 'blog' ? 'Blog-Beitrag (HTML)' : 'Newsletter-Text'} überarbeiten.
Gib NUR den überarbeiteten Text zurück – kein Kommentar, keine Erklärung.
${versionField === 'blog' ? 'Behalte das HTML-Format bei.' : 'Behalte Betreff/Preheader/Body-Struktur bei.'}`

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Nachricht darf nicht leer sein' }, { status: 400 })
  }

  const messageContent = `Aktueller Inhalt:\n\n${currentContent ?? ''}\n\n---\nAnfrage: ${userMessage}`

  let response
  try {
    const anthropic = await getAnthropicClient()
    response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2_048,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter API-Fehler'
    console.error('[Vysible] Chat API-Fehler:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  await trackCost({
    projectId: params.id,
    model: DEFAULT_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    step: 'chat',
  })

  const revised = response.content
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { type: string; text?: string }) => (b as { type: 'text'; text: string }).text)
    .join('')

  // Version speichern (max. 10)
  const versionKey = versionField === 'blog' ? 'blogVersions' : 'newsletterVersions'
  const versions: ContentVersion[] = [...(item[versionKey] ?? []), { content: currentContent, savedAt: new Date().toISOString() }]
  const trimmed = versions.slice(-10)

  // Inhalt aktualisieren
  if (versionField === 'blog' && item.blog) {
    item.blog = { ...item.blog, html: revised }
  }
  if (versionField === 'newsletter' && item.newsletter) {
    item.newsletter = { ...item.newsletter, body: revised }
  }
  item[versionKey] = trimmed

  await prisma.project.update({
    where: { id: params.id },
    data: { textResults: JSON.parse(JSON.stringify(results)) },
  })

  return NextResponse.json({ revised, versions: trimmed })
}
