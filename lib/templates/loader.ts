import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { logger } from '../utils/logger'

const TEMPLATES_DIR = path.join(process.cwd(), 'templates')

export interface FachgebietTemplate {
  specialty: string
  displayName: string
  defaultCategories: string[]
  seasonalTopics: Record<string, string>
  defaultKeywords: string[]
  hwgHighRiskCategories: string[]
  defaultCta: string
  defaultFunnelDistribution: {
    awareness: string
    consideration: string
    decision: string
    retention: string
  }
}

export function listAvailableTemplates(): string[] {
  try {
    if (!fs.existsSync(TEMPLATES_DIR)) return []
    return fs
      .readdirSync(TEMPLATES_DIR)
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.replace('.yaml', ''))
  } catch (exc: unknown) {
    logger.warn({ err: exc }, '[Vysible] templates/-Verzeichnis nicht lesbar')
    return []
  }
}

export function loadTemplate(slug: string): FachgebietTemplate | null {
  const filePath = path.join(TEMPLATES_DIR, `${slug}.yaml`)
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return yaml.load(content) as FachgebietTemplate
  } catch (exc: unknown) {
    logger.warn({ err: exc, specialty: slug }, '[Vysible] Template nicht geladen')
    return null
  }
}

export function listTemplates(): Array<{ slug: string; displayName: string; specialty: string }> {
  return listAvailableTemplates()
    .map((slug) => {
      const tpl = loadTemplate(slug)
      if (!tpl) return null
      return { slug, displayName: tpl.displayName, specialty: tpl.specialty }
    })
    .filter((t): t is { slug: string; displayName: string; specialty: string } => t !== null)
}
