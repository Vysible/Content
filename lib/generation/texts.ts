import { getAnthropicClient } from '@/lib/ai/client'
import { trackCost } from '@/lib/costs/tracker'
import { DEFAULT_MODEL } from '@/config/model-prices'
import { loadPrompt } from './prompt-loader'
import {
  ImageBriefSchema,
  SocialResponseSchema,
  type BlogPost,
  type Newsletter,
  type SocialPost,
  type ImageBrief,
  type TextResult,
} from './texts-schema'
import type { ThemenItem } from './themes-schema'
import type { Project } from '@/lib/types/prisma'

interface TextsInput {
  project: Project
  themes: ThemenItem[]
  positioningContext: string
}

export async function generateTexts(input: TextsInput): Promise<TextResult[]> {
  const { project, themes, positioningContext } = input
  const results: TextResult[] = []

  const socialChannels = project.channels.filter((c) => c.startsWith('SOCIAL_')) as Array<
    'SOCIAL_INSTAGRAM' | 'SOCIAL_FACEBOOK' | 'SOCIAL_LINKEDIN'
  >

  for (const theme of themes) {
    const imageBrief = await generateImageBrief({ theme, project })

    const result: TextResult = {
      monat: theme.monat,
      titel: theme.seoTitel,
      kanal: theme.kanal,
      imageBrief,
    }

    if (theme.kanal === 'BLOG') {
      result.blog = await generateBlogPost({ theme, project, positioningContext })
    }

    if (theme.kanal === 'NEWSLETTER') {
      result.newsletter = await generateNewsletter({ theme, project, positioningContext })
    }

    if (theme.kanal.startsWith('SOCIAL_') && socialChannels.length > 0) {
      result.socialPosts = await generateSocialPosts({
        theme,
        project,
        channels: socialChannels,
        positioningContext,
      })
    }

    results.push(result)
  }

  return results
}

async function generateBlogPost(args: {
  theme: ThemenItem
  project: Project
  positioningContext: string
}): Promise<BlogPost> {
  const { theme, project, positioningContext } = args

  const prompt = loadPrompt('blog', {
    thema: theme.thema,
    praxisName: project.praxisName ?? project.praxisUrl,
    seoTitel: theme.seoTitel,
    keywordPrimaer: theme.keywordPrimaer,
    paaFragen: theme.paaFragen.join('\n'),
    positionierungsdokument: positioningContext.slice(0, 6_000),
    tonalität: 'professionell, empathisch, verständlich',
  })

  const anthropic = await getAnthropicClient()
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2_048,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
  })

  await trackCost({
    projectId: project.id,
    model: DEFAULT_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    step: 'blog',
  })

  const html = extractText(response)
  const wordCount = countWords(html)

  return { monat: theme.monat, titel: theme.seoTitel, keyword: theme.keywordPrimaer, html, wordCount }
}

async function generateNewsletter(args: {
  theme: ThemenItem
  project: Project
  positioningContext: string
}): Promise<Newsletter> {
  const { theme, project, positioningContext } = args

  const prompt = loadPrompt('newsletter', {
    thema: theme.thema,
    praxisName: project.praxisName ?? project.praxisUrl,
    monat: theme.monat,
    cta: theme.cta,
    positionierungsdokument: positioningContext.slice(0, 4_000),
  })

  const anthropic = await getAnthropicClient()
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1_024,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
  })

  await trackCost({
    projectId: project.id,
    model: DEFAULT_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    step: 'newsletter',
  })

  const raw = extractText(response)
  return parseNewsletter(raw, theme)
}

function parseNewsletter(raw: string, theme: ThemenItem): Newsletter {
  const betreffA = extractLine(raw, /Betreff\s*A\s*[::::]/i) ?? theme.seoTitel
  const betreffB = extractLine(raw, /Betreff\s*B\s*[::::]/i) ?? `${theme.seoTitel} – Ihr Termin wartet`
  const preheader = extractLine(raw, /Preheader\s*[::::]/i) ?? theme.seoTitel.slice(0, 80)

  const bodyStart = raw.search(/\n\n/)
  const body = bodyStart > -1 ? raw.slice(bodyStart).trim() : raw

  return {
    monat: theme.monat,
    titel: theme.seoTitel,
    betreffA,
    betreffB,
    preheader: preheader.slice(0, 100),
    body,
    cta: theme.cta,
  }
}

async function generateSocialPosts(args: {
  theme: ThemenItem
  project: Project
  channels: Array<'SOCIAL_INSTAGRAM' | 'SOCIAL_FACEBOOK' | 'SOCIAL_LINKEDIN'>
  positioningContext: string
}): Promise<SocialPost[]> {
  const { theme, project, channels, positioningContext } = args

  const kanalLabels = channels
    .map((c) => c.replace('SOCIAL_', '').toLowerCase())
    .join(', ')

  const prompt = loadPrompt('social', {
    thema: theme.thema,
    praxisName: project.praxisName ?? project.praxisUrl,
    kanaele: kanalLabels,
    cta: theme.cta,
    positionierungsdokument: positioningContext.slice(0, 3_000),
  })

  const anthropic = await getAnthropicClient()
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 512,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
  })

  await trackCost({
    projectId: project.id,
    model: DEFAULT_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    step: 'social',
  })

  const raw = extractText(response)
  const parsed = parseJsonBlock(raw)
  const socialData = SocialResponseSchema.parse(parsed)

  const posts: SocialPost[] = []
  if (channels.includes('SOCIAL_INSTAGRAM') && socialData.instagram) {
    posts.push({ kanal: 'SOCIAL_INSTAGRAM', text: socialData.instagram })
  }
  if (channels.includes('SOCIAL_FACEBOOK') && socialData.facebook) {
    posts.push({ kanal: 'SOCIAL_FACEBOOK', text: socialData.facebook })
  }
  if (channels.includes('SOCIAL_LINKEDIN') && socialData.linkedin) {
    posts.push({ kanal: 'SOCIAL_LINKEDIN', text: socialData.linkedin })
  }

  return posts
}

async function generateImageBrief(args: {
  theme: ThemenItem
  project: Project
}): Promise<ImageBrief> {
  const { theme, project } = args

  const prompt = loadPrompt('image-brief', {
    thema: theme.thema,
    praxisName: project.praxisName ?? project.praxisUrl,
    kanal: theme.kanal,
    hwgFlag: theme.hwgFlag,
    canvaOrdner: project.canvaFolderId ?? '',
  })

  const anthropic = await getAnthropicClient()
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 512,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
  })

  await trackCost({
    projectId: project.id,
    model: DEFAULT_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    step: 'image-brief',
  })

  const raw = extractText(response)
  const parsed = parseJsonBlock(raw)
  return ImageBriefSchema.parse(parsed)
}

function extractText(response: { content: Array<{ type: string; text?: string }> }): string {
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
}

function parseJsonBlock(text: string): unknown {
  const fenced = text.match(/```(?:json)?[ \t]*\r?\n?([\s\S]*?)\r?\n?```/)
  if (fenced?.[1]) return JSON.parse(fenced[1].trim())
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) return JSON.parse(text.slice(start, end + 1))
  return JSON.parse(text.trim())
}

function extractLine(text: string, pattern: RegExp): string | undefined {
  const match = text.match(new RegExp(pattern.source + '\\s*(.+)', pattern.flags))
  return match?.[1]?.trim()
}

function countWords(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length
}
