// Einzige Quelle für Token-Preise – Stand Mai 2026
// Preise in EUR pro Token
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 0.000003, output: 0.000015 },
  'claude-opus-4-6':   { input: 0.000015, output: 0.000075 },
  'claude-haiku-4-5':  { input: 0.0000008, output: 0.000004 },
  'gpt-4o':            { input: 0.000005,  output: 0.000015 },
  'gpt-4o-mini':       { input: 0.00000015, output: 0.0000006 },
}

export const DEFAULT_MODEL = 'claude-sonnet-4-6'

export const PROVIDER_MODELS: Record<string, string[]> = {
  ANTHROPIC: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'],
  OPENAI:    ['gpt-4o', 'gpt-4o-mini'],
}

export function calcCostEur(model: string, inputTokens: number, outputTokens: number): number {
  const prices = MODEL_PRICES[model]
  if (!prices) return 0
  return inputTokens * prices.input + outputTokens * prices.output
}

export function estimateCostEur(model: string, estimatedInputTokens: number, estimatedOutputTokens: number): number {
  return calcCostEur(model, estimatedInputTokens, estimatedOutputTokens)
}
