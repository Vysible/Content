import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'
import { getIntegration, saveIntegration, deleteIntegration } from '@/lib/integrations/store'
import type { IntegrationProvider } from '@/lib/integrations/store'
import { z } from 'zod'

const ALLOWED_PROVIDERS: IntegrationProvider[] = ['KLICKTIPP', 'WORDPRESS', 'META', 'LINKEDIN']

function isValidProvider(p: string): p is IntegrationProvider {
  return ALLOWED_PROVIDERS.includes(p as IntegrationProvider)
}

const SaveSchema = z.object({
  credentials: z.record(z.string()),
  config: z.record(z.string()).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: { id: string; provider: string } },
) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  if (!isValidProvider(params.provider)) {
    return NextResponse.json({ error: 'Unbekannter Provider' }, { status: 400 })
  }

  try {
    const status = await getIntegration(params.id, params.provider)
    return NextResponse.json(status)
  } catch (err: unknown) {
    logger.error({ err, projectId: params.id, provider: params.provider }, 'Integration-Status Fehler')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string; provider: string } },
) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  if (!isValidProvider(params.provider)) {
    return NextResponse.json({ error: 'Unbekannter Provider' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const parsed = SaveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Felder' }, { status: 400 })
  }

  try {
    await saveIntegration(params.id, params.provider, parsed.data.credentials, parsed.data.config)
    logger.info({ projectId: params.id, provider: params.provider }, 'Integration gespeichert')
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    logger.error({ err, projectId: params.id, provider: params.provider }, 'Integration speichern fehlgeschlagen')
    return NextResponse.json({ error: 'Speichern fehlgeschlagen' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; provider: string } },
) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  if (!isValidProvider(params.provider)) {
    return NextResponse.json({ error: 'Unbekannter Provider' }, { status: 400 })
  }

  try {
    await deleteIntegration(params.id, params.provider)
    logger.info({ projectId: params.id, provider: params.provider }, 'Integration getrennt')
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    logger.error({ err, projectId: params.id, provider: params.provider }, 'Integration trennen fehlgeschlagen')
    return NextResponse.json({ error: 'Trennen fehlgeschlagen' }, { status: 500 })
  }
}
