import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { calcCostEur } from '@/config/model-prices'

export async function getAnthropicClient(): Promise<Anthropic> {
  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'ANTHROPIC', active: true },
  })
  if (!apiKey) throw new Error('Kein aktiver Anthropic-API-Key konfiguriert')
  return new Anthropic({ apiKey: decrypt(apiKey.encryptedKey) })
}

export async function getOpenAIClient(): Promise<OpenAI> {
  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'OPENAI', active: true },
  })
  if (!apiKey) throw new Error('Kein aktiver OpenAI-API-Key konfiguriert')
  return new OpenAI({ apiKey: decrypt(apiKey.encryptedKey) })
}

export { calcCostEur }
