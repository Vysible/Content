import { getAnthropicClient } from '@/lib/ai/client'
import { trackCost } from '@/lib/costs/tracker'
import { getAppConfig } from './app-config'
import { loadPrompt } from './prompt-loader'
import { withRetry } from '@/lib/utils/retry'
import { searchUnsplash } from '@/lib/unsplash/client'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
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
  canvaContext?: string
  blogOutlines?: Record<string, string>
}

export async function generateTexts(input: TextsInput): Promise<TextResult[]> {
  const { project, themes, positioningContext, blogOutlines } = input
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
      const outline = blogOutlines?.[theme.monat]
      result.blog = await generateBlogPost({ theme, project, positioningContext, outline })
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

    // Partial save — so partial results survive if a later theme fails
    await prisma.project.update({
      where: { id: project.id },
      data: { textResults: results as unknown as Prisma.InputJsonValue },
    })
  }

  return results
}

export async function generateBlogOutlines(args: {
  themes: ThemenItem[]
  project: Project
  positioningContext: string
}): Promise<Record<string, string>> {
  const { themes, project, positioningContext } = args
  const blogThemes = themes.filter((t) => t.kanal === 'BLOG')
  const outlines: Record<string, string> = {}

  for (const theme of blogThemes) {
    const prompt = loadPrompt('blog-outline', {
      thema: theme.thema,
      praxisName: project.praxisName ?? project.praxisUrl,
      seoTitel: theme.seoTitel,
      keywordPrimaer: theme.keywordPrimaer,
      paaFragen: theme.paaFragen.join('\n'),
      positionierungsdokument: positioningContext.slice(0, 4_000),
    })

    const anthropic = await getAnthropicClient(project.apiKeyId ?? null)

    const cfg = await getAppConfig()
    const outline = await withRetry(async () => {
      const response = await anthropic.messages.create({
        model: cfg.modelBlogOutline,
        max_tokens: 512,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      }, { timeout: 120_000 })

      await trackCost({
        projectId: project.id,
        model: cfg.modelBlogOutline,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        step: 'blog-outline',
      })

      return extractText(response)
    }, `anthropic.generateBlogOutline(${theme.monat})`)

    outlines[theme.monat] = outline
  }

  return outlines
}

async function generateBlogPost(args: {
  theme: ThemenItem
  project: Project
  positioningContext: string
  outline?: string
}): Promise<BlogPost> {
  const { theme, project, positioningContext, outline } = args

  const outlineContext = outline
    ? `\n\nGliederung (bitte einhalten):\n${outline}`
    : ''

  const prompt = loadPrompt('blog', {
    thema: theme.thema,
    praxisName: project.praxisName ?? project.praxisUrl,
    seoTitel: theme.seoTitel,
    keywordPrimaer: theme.keywordPrimaer,
    paaFragen: theme.paaFragen.join('\n'),
    positionierungsdokument: positioningContext.slice(0, 6_000) + outlineContext,
    tonalitaet: 'professionell, empathisch, verständlich',
  })

  const anthropic = await getAnthropicClient(project.apiKeyId ?? null)
  const cfg = await getAppConfig()

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: cfg.modelBlog,
      max_tokens: 4_096,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    }, { timeout: 120_000 })

    await trackCost({
      projectId: project.id,
      model: cfg.modelBlog,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      step: 'blog',
    })

    const html = extractText(response)
    const wordCount = countWords(html)

    return { monat: theme.monat, titel: theme.seoTitel, keyword: theme.keywordPrimaer, html, wordCount }
  }, `anthropic.generateBlogPost(${theme.monat})`)
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

  const anthropic = await getAnthropicClient(project.apiKeyId ?? null)
  const cfg = await getAppConfig()

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: cfg.modelNewsletter,
      max_tokens: 2_048,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    }, { timeout: 120_000 })

    await trackCost({
      projectId: project.id,
      model: cfg.modelNewsletter,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      step: 'newsletter',
    })

    const raw = extractText(response)
    return parseNewsletter(raw, theme)
  }, `anthropic.generateNewsletter(${theme.monat})`)
}

function parseNewsletter(raw: string, theme: ThemenItem): Newsletter {
  const betreffA = extractLine(raw, /Betreff\s*A\s*[::]/i) ?? theme.seoTitel
  const betreffB = extractLine(raw, /Betreff\s*B\s*[::]/i) ?? `${theme.seoTitel} – Ihr Termin wartet`
  const preheader = extractLine(raw, /Preheader\s*[::]/i) ?? theme.seoTitel.slice(0, 80)

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

  const anthropic = await getAnthropicClient(project.apiKeyId ?? null)
  const cfg = await getAppConfig()

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: cfg.modelSocial,
      max_tokens: 1_024,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    }, { timeout: 120_000 })

    await trackCost({
      projectId: project.id,
      model: cfg.modelSocial,
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
  }, `anthropic.generateSocialPosts(${theme.monat})`)
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
    fachgebiet: project.fachgebiet ?? '',
    keywords: project.keywords.join(', '),
  })

  const anthropic = await getAnthropicClient(project.apiKeyId ?? null)
  const cfg = await getAppConfig()

  const rawBrief = await withRetry(async () => {
    const response = await anthropic.messages.create({
      model: cfg.modelImageBrief,
      max_tokens: 1_500,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    }, { timeout: 120_000 })

    await trackCost({
      projectId: project.id,
      model: cfg.modelImageBrief,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      step: 'image-brief-extended',
    })

    const raw = extractText(response)
    const parsed = parseJsonBlock(raw)
    return ImageBriefSchema.parse(parsed)
  }, `anthropic.generateImageBrief(${theme.monat})`)

  // HWG §11-Guard + Unsplash-Links
  const isHwgSensitiv = theme.hwgFlag === 'rot' || theme.hwgFlag === 'gelb'
  const unsplashLinks = isHwgSensitiv && rawBrief.stockSuchbegriffe.length > 0
    ? await searchUnsplash(rawBrief.stockSuchbegriffe[0], 5)
    : []

  return {
    ...rawBrief,
    dallePrompt: theme.hwgFlag === 'rot' ? undefined : rawBrief.dallePrompt,
    unsplashLinks,
    hwgParagraph11Check: isHwgSensitiv,
  }
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
