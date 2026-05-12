import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { calcCostEur, MODEL_PRICES } from '@/config/model-prices'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = await prisma.apiKey.findUnique({ where: { id: params.id } })
  if (!apiKey) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const plainKey = decrypt(apiKey.encryptedKey)
  const model = apiKey.model ?? (apiKey.provider === 'ANTHROPIC' ? 'claude-sonnet-4-6' : 'gpt-4o')

  try {
    if (apiKey.provider === 'ANTHROPIC') {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const client = new Anthropic({ apiKey: plainKey })

      const response = await client.messages.create({
        model,
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Antworte nur mit: OK' }],
      })

      const inputTokens = response.usage.input_tokens
      const outputTokens = response.usage.output_tokens
      const costEur = calcCostEur(model, inputTokens, outputTokens)

      // Kosten-Voranschlag für ein vollständiges Content-Paket
      const packageEstimate = calcCostEur(model, 33000, 43000)

      return NextResponse.json({
        success: true,
        model,
        inputTokens,
        outputTokens,
        costEur,
        packageEstimateEur: packageEstimate,
        message: 'Verbindung erfolgreich',
      })
    }

    if (apiKey.provider === 'OPENAI') {
      const { default: OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey: plainKey })

      const response = await client.chat.completions.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Reply with: OK' }],
      })

      const inputTokens = response.usage?.prompt_tokens ?? 0
      const outputTokens = response.usage?.completion_tokens ?? 0
      const costEur = calcCostEur(model, inputTokens, outputTokens)
      const packageEstimate = calcCostEur(model, 33000, 43000)

      return NextResponse.json({
        success: true,
        model,
        inputTokens,
        outputTokens,
        costEur,
        packageEstimateEur: packageEstimate,
        message: 'Verbindung erfolgreich',
      })
    }

    return NextResponse.json({ error: `Test-Call für ${apiKey.provider} noch nicht implementiert` }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
