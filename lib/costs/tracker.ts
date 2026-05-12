import { prisma } from '@/lib/db'
import { calcCostEur } from '@/config/model-prices'

interface TrackCostParams {
  projectId?: string
  model: string
  inputTokens: number
  outputTokens: number
  step: string
}

export async function trackCost(params: TrackCostParams): Promise<void> {
  const costEur = calcCostEur(params.model, params.inputTokens, params.outputTokens)

  await prisma.costEntry.create({
    data: {
      projectId: params.projectId ?? null,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costEur,
      step: params.step,
    },
  })

  console.log(`[Vysible] CostEntry: ${params.step} | ${params.model} | ${params.inputTokens}in/${params.outputTokens}out | ${costEur.toFixed(6)} EUR`)
}
