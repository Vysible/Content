import { getAnthropicClient } from '@/lib/ai/client'
import { trackCost } from '@/lib/costs/tracker'
import { loadPrompt } from '@/lib/generation/prompt-loader'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import { DEFAULT_MODEL } from '@/config/model-prices'

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Generiert eine KI-basierte Meta-Description für einen Blog-Artikel.
 * Prompt: prompts/seo-analysis.yaml
 * Kosten werden als CostEntry mit step='seo_analysis' erfasst.
 */
export async function generateMetaDescription(
  title: string,
  html: string,
  keyword: string,
  projectId?: string,
): Promise<string> {
  const textPreview = stripHtml(html).slice(0, 500)

  const prompt = loadPrompt('seo-analysis', { title, keyword, textPreview })

  const anthropic = await getAnthropicClient()

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 256,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    })

    await trackCost({
      projectId,
      model: DEFAULT_MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      step: 'seo_analysis',
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    logger.info({ projectId, titleLength: text.length }, 'Meta-Description generiert')
    return text
  }, 'seo.generateMetaDescription')
}
