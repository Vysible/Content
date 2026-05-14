export const GENERATION_STEPS = [
  'scrape_done',
  'positioning_injected',
  'canva_loaded',
  'pool_loaded',
  'keywords_loaded',
  'themes_done',
  'plans_done',
  'blog_outline_done',
  'texts_done',
] as const

export type GenerationStep = (typeof GENERATION_STEPS)[number]

export type GenerationEventType =
  | GenerationStep
  | 'error'
  | 'complete'
  | 'queue_position'
  | 'connected'

export interface GenerationEvent {
  type: GenerationEventType
  data?: Record<string, unknown>
  error?: string
  failedStep?: GenerationStep // gesetzt bei Fehler, zeigt ab welchem Schritt retried werden kann
  retryable?: boolean
  timestamp: string
}

export type JobStatus = 'pending' | 'queued' | 'running' | 'complete' | 'error'

export interface JobState {
  id: string
  projectId: string
  status: JobStatus
  completedSteps: GenerationStep[]
  events: GenerationEvent[]
  lastError?: string
  failedStep?: GenerationStep
  queuePosition?: number
  createdAt: Date
  updatedAt: Date
}

// Labels für die UI
export const STEP_LABELS: Record<GenerationStep, string> = {
  scrape_done:           'Website gescrapt',
  positioning_injected:  'Positionierung eingelesen',
  canva_loaded:          'Canva-Assets geladen',
  pool_loaded:           'Themen-Pool geladen',
  keywords_loaded:       'Keywords geladen',
  themes_done:           'Themenplan erstellt',
  plans_done:            'Redaktionspläne erstellt',
  blog_outline_done:     'Blog-Gliederungen erstellt',
  texts_done:            'Texte generiert',
}
