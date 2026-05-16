import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { PROVIDER_MODELS } from '@/config/model-prices'
import { logger } from '@/lib/utils/logger'

const ALL_MODELS = Object.values(PROVIDER_MODELS).flat()

export async function GET() {
  try {
    const session = await requireAuth()
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let config = await prisma.appConfig.findFirst()
    if (!config) {
      config = await prisma.appConfig.create({ data: {} })
    }

    return NextResponse.json(config)
  } catch (err: unknown) {
    logger.error({ err }, '[GET /api/settings/parameters] Fehler')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireAuth()
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>

    const floatFields = ['themesMinPraxisQuote', 'themesMinSeoQuote'] as const
    const modelFields = ['modelThemes', 'modelBlogOutline', 'modelBlog', 'modelNewsletter', 'modelSocial', 'modelImageBrief'] as const

    const data: Record<string, number | string> = {}

    for (const field of floatFields) {
      if (field in body) {
        const val = Number(body[field])
        if (isNaN(val) || val < 0 || val > 1) {
          return NextResponse.json({ error: `Ungültiger Wert für ${field}` }, { status: 400 })
        }
        data[field] = val
      }
    }

    for (const field of modelFields) {
      if (field in body) {
        const val = String(body[field])
        if (!ALL_MODELS.includes(val)) {
          return NextResponse.json({ error: `Unbekanntes Modell: ${val}` }, { status: 400 })
        }
        data[field] = val
      }
    }

    const existing = await prisma.appConfig.findFirst()
    const config = existing
      ? await prisma.appConfig.update({ where: { id: existing.id }, data })
      : await prisma.appConfig.create({ data })

    logger.info({ updatedFields: Object.keys(data) }, '[PATCH /api/settings/parameters] Konfiguration aktualisiert')
    return NextResponse.json(config)
  } catch (err: unknown) {
    logger.error({ err }, '[PATCH /api/settings/parameters] Fehler')
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
