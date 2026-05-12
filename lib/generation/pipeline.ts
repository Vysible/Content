import { emitEvent, setStatus, getJob, resetForRetry } from './job-store'
import { GENERATION_STEPS, type GenerationStep, type JobState } from './types'
import type { Project } from '@prisma/client'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function now(): string {
  return new Date().toISOString()
}

// Gibt zurück, ab welchem Index die Pipeline (wieder) starten soll
function getStartIndex(job: JobState): number {
  if (job.completedSteps.length === 0) return 0
  const lastDone = job.completedSteps[job.completedSteps.length - 1]
  return GENERATION_STEPS.indexOf(lastDone) + 1
}

/**
 * Haupt-Pipeline.
 * Slice 3a: Stub – simuliert alle 8 Schritte mit kurzen Delays.
 * Slice 3b/12/13: Echte KI-Calls ersetzen die Stubs.
 */
export async function runGenerationPipeline(jobId: string, project: Project): Promise<void> {
  const job = getJob(jobId)
  if (!job) return

  setStatus(jobId, 'running')

  const startIndex = getStartIndex(job)

  try {
    for (let i = startIndex; i < GENERATION_STEPS.length; i++) {
      const step = GENERATION_STEPS[i]
      await runStep(jobId, step, project)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    // Fehlerhaften Schritt ermitteln
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

async function runStep(jobId: string, step: GenerationStep, project: Project): Promise<void> {
  switch (step) {
    case 'scrape_done':
      // Slice 11: Playwright-Scraper
      // TODO (Slice 3b): await scrapeUrl(project.praxisUrl) → project.scrapedData
      await delay(800)
      emitEvent(jobId, { type: 'scrape_done', data: { url: project.praxisUrl }, timestamp: now() })
      break

    case 'positioning_injected':
      // Kontext-Builder mit Positionierungsdokument
      // TODO (Slice 3b): buildContext({ positioningDocument, scrapeResult })
      await delay(200)
      emitEvent(jobId, {
        type: 'positioning_injected',
        data: { hasDocument: !!project.positioningDocument },
        timestamp: now(),
      })
      break

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

    case 'themes_done':
      // Slice 12: KI-Themenplanung
      // TODO (Slice 12): await generateThemes(context, project)
      await delay(1_500)
      emitEvent(jobId, {
        type: 'themes_done',
        data: { count: 6, message: 'Themenplan-Generierung folgt in Slice 12' },
        timestamp: now(),
      })
      break

    case 'plans_done':
      // Slice 12: Redaktionspläne
      await delay(500)
      emitEvent(jobId, { type: 'plans_done', timestamp: now() })
      break

    case 'texts_done':
      // Slice 13: KI-Texte (Blog, Newsletter, Social)
      // TODO (Slice 13): await generateTexts(themes, context, project)
      await delay(2_000)
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
