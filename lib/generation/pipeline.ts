import { emitEvent, setStatus, getJob, resetForRetry } from './job-store'
import { logger } from '@/lib/utils/logger'
import { GENERATION_STEPS, type GenerationStep, type JobState } from './types'
import { generateThemes } from './themes'
import { generateTexts, generateBlogOutlines } from './texts'
import { sendNotification } from '@/lib/email/mailer'
import { prisma } from '@/lib/db'
import { scrapeUrl } from '@/lib/scraper/client'
import { buildContext } from '@/lib/ai/context-builder'
import type { Project } from '@/lib/types/prisma'
import type { ScrapeResult } from '@/lib/scraper/client'
import type { ThemenItem } from './themes-schema'
import { listFolderAssets, buildCanvaContext } from '@/lib/canva/client'

function now(): string {
  return new Date().toISOString()
}

function getStartIndex(job: JobState): number {
  if (job.completedSteps.length === 0) return 0
  const lastDone = job.completedSteps[job.completedSteps.length - 1]!
  return GENERATION_STEPS.indexOf(lastDone) + 1
}

// Geteilter Zustand innerhalb eines Pipeline-Laufs
interface PipelineCtx {
  scrapeResult?: ScrapeResult
  themes?: ThemenItem[]
  positioningContext?: string
  blogOutlines?: Record<string, string>
  canvaContext?: string
}

export async function runGenerationPipeline(jobId: string, project: Project): Promise<void> {
  const job = await getJob(jobId)
  if (!job) return

  await setStatus(jobId, 'running')

  const startIndex = getStartIndex(job)
  const ctx: PipelineCtx = {}

  // Bereits abgeschlossene Schritte: Scrape-Ergebnis aus DB laden (für Retry)
  if (project.scrapedData) {
    ctx.scrapeResult = project.scrapedData as unknown as ScrapeResult
  }

  try {
    for (let i = startIndex; i < GENERATION_STEPS.length; i++) {
      const step = GENERATION_STEPS[i]!
      await runStep(jobId, step, project, ctx)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    const currentJob = await getJob(jobId)
    const lastDone = currentJob?.completedSteps.slice(-1)[0]
    const lastIndex = lastDone ? GENERATION_STEPS.indexOf(lastDone) : -1
    const failedStep = GENERATION_STEPS[lastIndex + 1] as GenerationStep | undefined

    await emitEvent(jobId, {
      type: 'error',
      error: message,
      failedStep,
      retryable: true,
      timestamp: now(),
    })

    logger.error({ jobId, failedStep, message }, 'Pipeline-Fehler')
  }
}

async function runStep(
  jobId: string,
  step: GenerationStep,
  project: Project,
  ctx: PipelineCtx
): Promise<void> {
  switch (step) {
    case 'scrape_done': {
      const result = await scrapeUrl(project.praxisUrl)
      ctx.scrapeResult = result
      await prisma.project.update({
        where: { id: project.id },
        data: { scrapedData: JSON.parse(JSON.stringify(result)) },
      })
      await emitEvent(jobId, {
        type: 'scrape_done',
        data: { url: project.praxisUrl, pagesScraped: result.pagesScraped },
        timestamp: now(),
      })
      break
    }

    case 'positioning_injected': {
      const context = buildContext({
        positioningDocument: project.positioningDocument ?? undefined,
        keywords: project.keywords,
        themenPool: project.themenPool ?? undefined,
        scrapeResult: ctx.scrapeResult,
      })
      ctx.positioningContext = context.systemContext
      await emitEvent(jobId, {
        type: 'positioning_injected',
        data: {
          hasDocument: !!project.positioningDocument,
          sections: context.sections,
          estimatedTokens: context.estimatedTokens,
          positioningTruncated: context.positioningTruncated,
        },
        timestamp: now(),
      })
      break
    }

    case 'canva_loaded': {
      if (project.canvaFolderId) {
        try {
          const assets = await listFolderAssets(project.canvaFolderId, project.createdById)
          ctx.canvaContext = buildCanvaContext(assets)
          await emitEvent(jobId, {
            type: 'canva_loaded',
            data: { assetCount: assets.length },
            timestamp: now(),
          })
        } catch (err: unknown) {
          // Canva-API nicht erreichbar oder nicht verbunden → Fallback auf leeren
          // Kontext, kein Hard-Fail. Pipeline läuft weiter, KI bekommt nur keine
          // Asset-Namen als Kontext-Hinweis.
          logger.warn({ err, projectId: project.id }, 'Canva-API nicht erreichbar — Kontext leer')
          ctx.canvaContext = ''
          await emitEvent(jobId, {
            type: 'canva_loaded',
            data: { skipped: true, reason: 'Canva-API nicht erreichbar' },
            timestamp: now(),
          })
        }
      } else {
        ctx.canvaContext = ''
        await emitEvent(jobId, { type: 'canva_loaded', data: { skipped: true }, timestamp: now() })
      }
      break
    }

    case 'pool_loaded':
      await emitEvent(jobId, {
        type: 'pool_loaded',
        data: { hasPool: !!project.themenPool },
        timestamp: now(),
      })
      break

    case 'keywords_loaded':
      await emitEvent(jobId, {
        type: 'keywords_loaded',
        data: { count: project.keywords.length },
        timestamp: now(),
      })
      break

    case 'themes_done': {
      const themes = await generateThemes({
        project,
        scrapeResult: ctx.scrapeResult,
        canvaContext: ctx.canvaContext,
      })
      ctx.themes = themes
      await prisma.project.update({
        where: { id: project.id },
        data: { themeResults: JSON.parse(JSON.stringify(themes)) },
      })
      await emitEvent(jobId, {
        type: 'themes_done',
        data: { count: themes.length },
        timestamp: now(),
      })
      break
    }

    case 'plans_done':
      await emitEvent(jobId, { type: 'plans_done', timestamp: now() })
      break

    case 'blog_outline_done': {
      const themes =
        ctx.themes ??
        ((project.themeResults as unknown as ThemenItem[] | null) ?? [])

      const positioningContext =
        ctx.positioningContext ??
        buildContext({
          positioningDocument: project.positioningDocument ?? undefined,
          keywords: project.keywords,
          themenPool: project.themenPool ?? undefined,
        }).systemContext

      const outlines = await generateBlogOutlines({ themes, project, positioningContext })
      ctx.blogOutlines = outlines

      await emitEvent(jobId, {
        type: 'blog_outline_done',
        data: { count: Object.keys(outlines).length },
        timestamp: now(),
      })
      break
    }

    case 'texts_done': {
      const themes =
        ctx.themes ??
        ((project.themeResults as unknown as ThemenItem[] | null) ?? [])

      const positioningContext =
        ctx.positioningContext ??
        buildContext({
          positioningDocument: project.positioningDocument ?? undefined,
          keywords: project.keywords,
          themenPool: project.themenPool ?? undefined,
        }).systemContext

      const textResults = await generateTexts({
        project,
        themes,
        positioningContext,
        blogOutlines: ctx.blogOutlines,
        canvaContext: ctx.canvaContext,
      })

      await prisma.project.update({
        where: { id: project.id },
        data: {
          textResults: JSON.parse(JSON.stringify(textResults)),
          status: 'ACTIVE',
        },
      })

      // §3a: Fehler im E-Mail-Versand werden geloggt, blockieren nicht die Pipeline
      sendNotification('generation_complete', project.name).catch((err: unknown) => {
        logger.warn({ err, projectId: project.id }, 'E-Mail-Benachrichtigung nach Generierung fehlgeschlagen')
      })

      await emitEvent(jobId, {
        type: 'texts_done',
        data: {
          blog: textResults.filter((r) => r.blog).length,
          newsletter: textResults.filter((r) => r.newsletter).length,
          social: textResults.filter((r) => r.socialPosts?.length).length,
          imageBriefs: textResults.length,
        },
        timestamp: now(),
      })
      break
    }
  }
}

export async function retryPipeline(jobId: string, fromStep: GenerationStep, project: Project): Promise<void> {
  await resetForRetry(jobId, fromStep)
  await runGenerationPipeline(jobId, project)
}
