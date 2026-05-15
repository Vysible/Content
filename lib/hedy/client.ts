import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import { getAnthropicClient } from '@/lib/ai/client'
import { trackCost } from '@/lib/costs/tracker'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'

const HEDY_BASE = 'https://api.hedy.bot/mcp'

export interface HedySession {
  id: string
  title: string
  date: string
  durationMinutes: number
}

export interface HedyTranscript {
  sessionId: string
  text: string
  language: string
}

interface HedyPrompt {
  system: string
  user: string
}

function loadPrompt(): HedyPrompt {
  const raw = fs.readFileSync(path.join(process.cwd(), 'prompts/positioning.yaml'), 'utf8')
  return yaml.load(raw) as HedyPrompt
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

export async function listSessions(apiKey: string): Promise<HedySession[]> {
  return withRetry(async () => {
    const response = await fetch(`${HEDY_BASE}/sessions`, {
      headers: buildHeaders(apiKey),
    })
    if (!response.ok) throw new Error(`Hedy Sessions HTTP ${response.status}`)
    const data = await response.json() as { sessions?: HedySession[] }
    return (data.sessions ?? []).slice(0, 20)
  }, 'hedy.list_sessions')
}

export async function fetchTranscript(
  sessionId: string,
  apiKey: string,
): Promise<HedyTranscript> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    return await withRetry(async () => {
      const response = await fetch(`${HEDY_BASE}/sessions/${sessionId}/transcript`, {
        headers: buildHeaders(apiKey),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Hedy Transcript HTTP ${response.status}`)
      return await response.json() as HedyTranscript
    }, 'hedy.fetch_transcript')
  } finally {
    clearTimeout(timeout)
  }
}

export async function generatePositioningFromTranscript(
  transcript: string,
  projectId: string,
): Promise<string> {
  const prompt = loadPrompt()
  const client = await getAnthropicClient()
  const userMsg = prompt.user.replace('{{transcript}}', transcript)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)

  try {
    const response = await withRetry(
      () => client.messages.create(
        {
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: prompt.system,
          messages: [{ role: 'user', content: userMsg }],
        },
        { signal: controller.signal },
      ),
      'hedy.generate_positioning',
    )

    await trackCost({
      projectId,
      model: 'claude-sonnet-4-6',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      step: 'positioning_generation',
    })

    const block = response.content[0]
    return block.type === 'text' ? block.text : ''
  } catch (exc: unknown) {
    logger.error({ err: exc }, '[Vysible] Hedy KI-Transformation fehlgeschlagen')
    throw exc
  } finally {
    clearTimeout(timeout)
  }
}
