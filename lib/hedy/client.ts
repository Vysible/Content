import { getAnthropicClient } from '@/lib/ai/client'
import { trackCost } from '@/lib/costs/tracker'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'

interface HedyPrompt {
  system: string
  user: string
}

function loadPrompt(): HedyPrompt {
  const raw = fs.readFileSync(path.join(process.cwd(), 'prompts/positioning.yaml'), 'utf8')
  return yaml.load(raw) as HedyPrompt
}

export async function generatePositioningFromTranscript(
  transcript: string,
  projectId: string
): Promise<string> {
  const prompt = loadPrompt()
  const client = await getAnthropicClient()

  const userMsg = prompt.user.replace('{{transkript}}', transcript)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: prompt.system,
    messages: [{ role: 'user', content: userMsg }],
  })

  await trackCost({
    projectId,
    model: 'claude-sonnet-4-6',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    step: 'positioning',
  })

  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}
