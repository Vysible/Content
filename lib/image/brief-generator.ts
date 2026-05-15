import { getAnthropicClient, getOpenAIClient } from '@/lib/ai/client'
import { withRetry } from '@/lib/utils/retry'
import { trackCost } from '@/lib/costs/tracker'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'

interface ImageBriefPrompt {
  system: string
  user: string
}

interface ImageBrief {
  motiv: string
  stil: string
  farbwelt: string
  textoverlay: string
  canvaAssetEmpfehlung: string
  hwgHinweis: string
  dallePrompt?: string
  hwgCompliant: boolean
}

const HWG_KEYWORDS = [
  'heilt', 'heilen', 'heilung', 'garantiert', 'versprechen', 'wirksam', 'wirksamkeit',
  'beste', 'einzige', 'nummer 1', 'sicher', 'schmerzfrei', 'komplikationsfrei',
]

export function checkHwgCompliance(text: string): boolean {
  const lower = text.toLowerCase()
  return !HWG_KEYWORDS.some((kw) => lower.includes(kw))
}

export async function generateImageBrief(opts: {
  projectId: string
  thema: string
  praxisName: string
  kanal: string
  canvaOrdner?: string
  generateDalle?: boolean
}): Promise<ImageBrief> {
  const raw = fs.readFileSync(path.join(process.cwd(), 'prompts/image-brief.yaml'), 'utf8')
  const prompt = yaml.load(raw) as ImageBriefPrompt

  const hwgFlag = HWG_KEYWORDS.some((kw) => opts.thema.toLowerCase().includes(kw)) ? 'true' : 'false'

  const userMsg = prompt.user
    .replace('{{thema}}', opts.thema)
    .replace('{{praxisName}}', opts.praxisName)
    .replace('{{kanal}}', opts.kanal)
    .replace('{{hwgFlag}}', hwgFlag)
    .replace('{{canvaOrdner}}', opts.canvaOrdner ?? 'nicht angegeben')

  const client = await getAnthropicClient()
  const response = await withRetry(
    () => client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: prompt.system,
      messages: [{ role: 'user', content: userMsg }],
    }),
    'image-brief.generate',
  )

  await trackCost({
    projectId: opts.projectId,
    model: 'claude-sonnet-4-6',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    step: 'image-brief',
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  const brief: Omit<ImageBrief, 'hwgCompliant'> = jsonMatch
    ? JSON.parse(jsonMatch[0])
    : { motiv: text, stil: '', farbwelt: '', textoverlay: '', canvaAssetEmpfehlung: '', hwgHinweis: '' }

  const hwgCompliant = checkHwgCompliance(brief.textoverlay ?? '') && checkHwgCompliance(brief.motiv ?? '')

  if (opts.generateDalle && hwgCompliant) {
    try {
      const dallePrompt = `${brief.motiv}, ${brief.stil}, ${brief.farbwelt}, professional medical practice photography, no text, high quality`
      const openai = await getOpenAIClient()
      const imgResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: dallePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      })
      brief.dallePrompt = imgResponse.data?.[0]?.url ?? undefined
    } catch (err: unknown) {
      console.warn('[Vysible] DALL-E Bild-Generierung fehlgeschlagen (nicht kritisch):', err)
    }
  }

  return { ...brief, hwgCompliant }
}
