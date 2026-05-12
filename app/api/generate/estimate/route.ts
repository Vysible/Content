import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { calcCostEur, DEFAULT_MODEL } from '@/config/model-prices'
import { NextResponse } from 'next/server'

// Token-Schätzungen pro Schritt (Slice 12/13 werden diese Werte bestätigen)
const STEP_ESTIMATES = {
  themes: { input: 3_000, output: 2_000 },   // Themenplanung
  plans:  { input: 1_500, output: 800  },    // Redaktionspläne
  // Texte: pro Kanal-Kombination
  textPerChannel: { input: 4_000, output: 2_500 },
}

export async function GET(req: Request) {
  await requireAuth()

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { praxisUrl: true, channels: true },
  })
  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const hasAnthropicKey = await prisma.apiKey.findFirst({
    where: { provider: 'ANTHROPIC', active: true },
    select: { id: true },
  })

  const model = DEFAULT_MODEL
  const channelCount = Math.max(1, project.channels.length)

  const themeCost = calcCostEur(model, STEP_ESTIMATES.themes.input, STEP_ESTIMATES.themes.output)
  const planCost  = calcCostEur(model, STEP_ESTIMATES.plans.input,  STEP_ESTIMATES.plans.output)
  const textCost  = calcCostEur(
    model,
    STEP_ESTIMATES.textPerChannel.input  * channelCount,
    STEP_ESTIMATES.textPerChannel.output * channelCount,
  )
  const totalEur = themeCost + planCost + textCost

  return NextResponse.json({
    model,
    estimatedEur: totalEur,
    breakdown: {
      themes: themeCost,
      plans:  planCost,
      texts:  textCost,
    },
    channelCount,
    hasAnthropicKey: !!hasAnthropicKey,
    missingUrl: !project.praxisUrl,
  })
}
