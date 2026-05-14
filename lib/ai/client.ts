import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { calcCostEur } from '@/config/model-prices'

/**
 * Gibt einen Anthropic-Client zurück.
 * Bei projectApiKeyId: sucht zuerst den projektspezifischen Key (FA-F-11a),
 * fällt auf den globalen Default-Key zurück wenn nicht vorhanden.
 */
export async function getAnthropicClient(projectApiKeyId?: string | null): Promise<Anthropic> {
  if (projectApiKeyId) {
    const projectKey = await prisma.apiKey.findFirst({
      where: { id: projectApiKeyId, provider: 'ANTHROPIC', active: true },
    })
    if (projectKey) {
      return new Anthropic({ apiKey: decrypt(projectKey.encryptedKey) })
    }
  }
  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'ANTHROPIC', active: true },
  })
  if (!apiKey) throw new Error('Kein aktiver Anthropic-API-Key konfiguriert')
  return new Anthropic({ apiKey: decrypt(apiKey.encryptedKey) })
}

/**
 * Gibt einen OpenAI-Client zurück.
 * Bei projectApiKeyId: sucht zuerst den projektspezifischen Key (FA-F-11a),
 * fällt auf den globalen Default-Key zurück wenn nicht vorhanden.
 */
export async function getOpenAIClient(projectApiKeyId?: string | null): Promise<OpenAI> {
  if (projectApiKeyId) {
    const projectKey = await prisma.apiKey.findFirst({
      where: { id: projectApiKeyId, provider: 'OPENAI', active: true },
    })
    if (projectKey) {
      return new OpenAI({ apiKey: decrypt(projectKey.encryptedKey) })
    }
  }
  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'OPENAI', active: true },
  })
  if (!apiKey) throw new Error('Kein aktiver OpenAI-API-Key konfiguriert')
  return new OpenAI({ apiKey: decrypt(apiKey.encryptedKey) })
}

export { calcCostEur }
