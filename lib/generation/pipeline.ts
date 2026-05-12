import { emitEvent, setStatus, getJob, resetForRetry } from './job-store'
import { GENERATION_STEPS, type GenerationStep, type JobState } from './types'
import { generateThemes } from './themes'
import { prisma } from '@/lib/db'
import { scrapeUrl } from '@/lib/scraper/client'
import { buildContext } from '@/lib/ai/context-builder'
import type { Project } from '@prisma/client'
import type { ScrapeResult } from '@/lib/scraper/client'

function now(): string {
  return new Date().toISOString()
}

function getStartIndex(job: JobState): number {
  if (job.completedSteps.length === 0) return 0
  const lastDone = job.completedSteps[job.completedSteps.length - 1]
  return GENERATION_STEPS.indexOf(lastDone) + 1
}

// Geteilter Zustand innerhalb eines Pipeline-Laufs
interface PipelineCtx {
  scrapeResult?: ScrapeResult
}

export async function runGenerationPipeline(jobId: string, project: Project): Promise<void> {
  const job = getJob(jobId)
  if (!job) return

  setStatus(jobId, 'running')

  const startIndex = getStartIndex(job)
  const ctx: PipelineCtx = {}

  // Bereits abgeschlossene Schritte: Scrape-Ergebnis aus DB laden (für Retry)
  if (project.scrapedData) {
    ctx.scrapeResult = project.scrapedData as unknown as ScrapeResult
  }

  try {
    for (let i = startIndex; i < GENERATION_STEPS.length; i++) {
      const step = GENERATION_STEPS[i]
      await runStep(jobId, step, project, ctx)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    const lastDone = getJob(jobId)?.completedSteps.slice(-1)[0]
    const lastIndex = lastDone ? GENERATION_STEPS.indexOf(lastDone) : -1
    const failedStep = GENERATION_STEPS[lastIndex + 1] as GenerationStep | undefined

    emitEvent(jobId, {
      type: 'error',
      error: message,
      failedStep,
      retryable: true,
      timestamp: now(),
    })

    console.error(`[Vysible] Pipeline-Fehler (Job ${jobId}, Schritt ${failedStep}): ${message}`)
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
      // Scrape-Ergebnis in DB persistieren (für Retry ohne erneutes Scraping)
      await prisma.project.update({
        where: { id: project.id },
        data: { scrapedData: JSON.parse(JSON.stringify(result)) },
      })
      emitEvent(jobId, {
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
      emitEvent(jobId, {
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

    case 'canva_loaded':
      // Slice 17: Canva-Assets – noch nicht aktiv
      emitEvent(jobId, { type: 'canva_loaded', data: { skipped: true }, timestamp: now() })
      break

    case 'pool_loaded':
      emitEvent(jobId, {
        type: 'pool_loaded',
        data: { hasPool: !!project.themenPool },
        timestamp: now(),
      })
      break

    case 'keywords_loaded':
      emitEvent(jobId, {
        type: 'keywords_loaded',
        data: { count: project.keywords.length },
        timestamp: now(),
      })
      break

    case 'themes_done': {
      const themes = await generateThemes({ project, scrapeResult: ctx.scrapeResult })
      // Themen in DB speichern
      await prisma.project.update({
        where: { id: project.id },
        data: { themeResults: JSON.parse(JSON.stringify(themes)) },
      })
      emitEvent(jobId, {
        type: 'themes_done',
        data: { count: themes.length },
        timestamp: now(),
      })
      break
    }

    case 'plans_done':
      // Slice 12: Redaktionsplan = Themen nach Monat/Kanal sortiert (kein eigener AI-Call)
      emitEvent(jobId, { type: 'plans_done', timestamp: now() })
      break

    case 'texts_done':
      // Slice 13: KI-Texte (Blog, Newsletter, Social)
      // TODO (Slice 13): await generateTexts(themes, context, project)
      emitEvent(jobId, {
        type: 'texts_done',
        data: { message: 'Text-Generierung folgt in Slice 13' },
        timestamp: now(),
      })
      break
  }
}

export async function retryPipeline(jobId: string, fromStep: GenerationStep, project: Project): Promise<void> {
  resetForRetry(jobId, fromStep)
  await runGenerationPipeline(jobId, project)
}
