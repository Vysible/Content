import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { fetchKeywordsForKeywords, fetchPaaQuestions } from '@/lib/dataseo/client'
import { logger } from '@/lib/utils/logger'

interface KeywordsRequestBody {
  keywords: string[]
  location?: string
  projectId?: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as KeywordsRequestBody
    const keywords = Array.isArray(body.keywords) ? body.keywords.map((item) => item.trim()).filter(Boolean) : []

    if (keywords.length < 1 || keywords.length > 5) {
      return NextResponse.json({ error: 'keywords: 1-5 Eintraege erforderlich' }, { status: 400 })
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: { provider: 'DATASEO', createdById: session.user.id, active: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!apiKey) {
      return NextResponse.json(
        { error: 'DataForSEO API-Key nicht konfiguriert. Bitte unter /settings/api-keys hinterlegen.' },
        { status: 422 },
      )
    }

    const credentials = decrypt(apiKey.encryptedKey)
    const authHeader = Buffer.from(credentials).toString('base64')

    const [keywordResults, paaQuestions] = await Promise.all([
      fetchKeywordsForKeywords(keywords, body.location ?? 'Germany', body.projectId, authHeader),
      fetchPaaQuestions(keywords[0], body.location ?? 'Germany', body.projectId, authHeader),
    ])

    return NextResponse.json({ keywords: keywordResults, paaQuestions })
  } catch (exc: unknown) {
    logger.error({ err: exc }, '[Vysible] DataForSEO keyword fetch fehlgeschlagen')
    return NextResponse.json({ error: 'DataForSEO-Abfrage fehlgeschlagen' }, { status: 500 })
  }
}
