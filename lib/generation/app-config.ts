import { prisma } from '@/lib/db'
import { DEFAULT_MODEL } from '@/config/model-prices'
import { THEMES_CONFIG } from './config'
import { logger } from '@/lib/utils/logger'

export interface AppConfigValues {
  themesMinPraxisQuote: number
  themesMinSeoQuote: number
  modelThemes: string
  modelBlogOutline: string
  modelBlog: string
  modelNewsletter: string
  modelSocial: string
  modelImageBrief: string
}

const DEFAULTS: AppConfigValues = {
  themesMinPraxisQuote: THEMES_CONFIG.minPraxisQuote,
  themesMinSeoQuote: THEMES_CONFIG.minSeoQuote,
  modelThemes: DEFAULT_MODEL,
  modelBlogOutline: DEFAULT_MODEL,
  modelBlog: DEFAULT_MODEL,
  modelNewsletter: DEFAULT_MODEL,
  modelSocial: DEFAULT_MODEL,
  modelImageBrief: DEFAULT_MODEL,
}

/**
 * Liest die App-Konfiguration aus der DB.
 * Existiert noch kein Eintrag, wird ein Default-Datensatz angelegt.
 * Bei DB-Fehler: ENV-/Hardcode-Fallback, kein Crash.
 * @forge-scan factory-only — kein externer IO außer prisma.
 */
export async function getAppConfig(): Promise<AppConfigValues> {
  try {
    let config = await prisma.appConfig.findFirst()
    if (!config) {
      config = await prisma.appConfig.create({ data: {} })
    }
    return {
      themesMinPraxisQuote: config.themesMinPraxisQuote,
      themesMinSeoQuote: config.themesMinSeoQuote,
      modelThemes: config.modelThemes,
      modelBlogOutline: config.modelBlogOutline,
      modelBlog: config.modelBlog,
      modelNewsletter: config.modelNewsletter,
      modelSocial: config.modelSocial,
      modelImageBrief: config.modelImageBrief,
    }
  } catch (err: unknown) {
    logger.warn({ err }, '[AppConfig] DB nicht erreichbar — nutze Fallback-Defaults')
    return DEFAULTS
  }
}
