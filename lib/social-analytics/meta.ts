import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import { loadCredentials, getIntegration } from '@/lib/integrations/store'

const GRAPH = 'https://graph.facebook.com/v21.0'

interface MetaCredentials extends Record<string, string> {
  pageAccessToken: string
}

export interface MetaPlatformMetrics {
  impressions: number
  reach: number
  engagements: number
  daily: { date: string; impressions: number }[]
  prev: { impressions: number; reach: number; engagements: number } | null
}

export interface InstagramPlatformMetrics {
  impressions: number
  reach: number
  interactions: number
  profileViews: number
  daily: { date: string; impressions: number }[]
  prev: { impressions: number; reach: number; interactions: number } | null
}

export interface MetaSocialAnalytics {
  facebook: MetaPlatformMetrics | null
  instagram: InstagramPlatformMetrics | null
  error?: string
}

function toUnix(isoDate: string): number {
  return Math.floor(new Date(isoDate).getTime() / 1000)
}

function sumValues(values: { value: number }[]): number {
  return values.reduce((sum, v) => sum + v.value, 0)
}

type InsightEntry = { name: string; values: { value: number; end_time: string }[] }

async function fetchInsights(
  id: string,
  token: string,
  metric: string,
  startDate: string,
  endDate: string,
): Promise<InsightEntry[]> {
  const since = toUnix(startDate)
  const until = toUnix(endDate) + 86400
  const url = `${GRAPH}/${id}/insights?metric=${metric}&period=day&since=${since}&until=${until}&access_token=${token}`

  const data = await withRetry(async () => {
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Meta Insights ${res.status}: ${body}`)
    }
    return res.json() as Promise<{ data: InsightEntry[] }>
  }, `meta.insights.${id}`)

  return data.data ?? []
}

function periodBounds(startDate: string, endDate: string): { prevStart: string; prevEnd: string } {
  const periodMs = new Date(endDate).getTime() - new Date(startDate).getTime()
  const periodDays = Math.round(periodMs / 86_400_000) + 1
  const prevEnd = new Date(new Date(startDate).getTime() - 86_400_000).toISOString().slice(0, 10)
  const prevStart = new Date(new Date(startDate).getTime() - periodDays * 86_400_000).toISOString().slice(0, 10)
  return { prevStart, prevEnd }
}

export async function fetchMetaAnalytics(
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<MetaSocialAnalytics> {
  const integration = await getIntegration(projectId, 'META')
  if (!integration.connected) {
    return { facebook: null, instagram: null, error: 'Meta nicht konfiguriert' }
  }

  let token: string
  try {
    const creds = await loadCredentials<MetaCredentials>(projectId, 'META')
    token = creds.pageAccessToken
  } catch (err) {
    logger.error({ err, projectId }, '[meta-analytics] Zugangsdaten konnten nicht geladen werden')
    return { facebook: null, instagram: null, error: 'Meta-Zugangsdaten ungültig' }
  }

  const pageId = integration.config?.pageId
  const igId = integration.config?.igAccountId || null

  if (!pageId) {
    return { facebook: null, instagram: null, error: 'Keine Page-ID konfiguriert' }
  }

  const { prevStart, prevEnd } = periodBounds(startDate, endDate)

  const FB_METRICS = 'page_impressions,page_reach,page_post_engagements'
  const IG_METRICS = 'impressions,reach,total_interactions,profile_views'

  const [fbCurrent, fbPrev, igCurrent, igPrev] = await Promise.all([
    fetchInsights(pageId, token, FB_METRICS, startDate, endDate).catch((err) => {
      logger.error({ err, projectId }, '[meta-analytics] Facebook-Insights Fehler')
      return null
    }),
    fetchInsights(pageId, token, FB_METRICS, prevStart, prevEnd).catch(() => null),
    igId
      ? fetchInsights(igId, token, IG_METRICS, startDate, endDate).catch((err) => {
          logger.error({ err, projectId }, '[meta-analytics] Instagram-Insights Fehler')
          return null
        })
      : Promise.resolve(null),
    igId
      ? fetchInsights(igId, token, IG_METRICS, prevStart, prevEnd).catch(() => null)
      : Promise.resolve(null),
  ])

  let facebook: MetaPlatformMetrics | null = null
  if (fbCurrent) {
    const byName = new Map(fbCurrent.map((d) => [d.name, d.values]))
    const impValues = byName.get('page_impressions') ?? []
    const reachValues = byName.get('page_reach') ?? []
    const engValues = byName.get('page_post_engagements') ?? []

    let prev: MetaPlatformMetrics['prev'] = null
    if (fbPrev) {
      const pByName = new Map(fbPrev.map((d) => [d.name, d.values]))
      prev = {
        impressions: sumValues(pByName.get('page_impressions') ?? []),
        reach: sumValues(pByName.get('page_reach') ?? []),
        engagements: sumValues(pByName.get('page_post_engagements') ?? []),
      }
    }

    facebook = {
      impressions: sumValues(impValues),
      reach: sumValues(reachValues),
      engagements: sumValues(engValues),
      daily: impValues
        .map((v) => ({ date: v.end_time.slice(0, 10), impressions: v.value }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      prev,
    }
  }

  let instagram: InstagramPlatformMetrics | null = null
  if (igCurrent) {
    const byName = new Map(igCurrent.map((d) => [d.name, d.values]))
    const impValues = byName.get('impressions') ?? []
    const reachValues = byName.get('reach') ?? []
    const interValues = byName.get('total_interactions') ?? []
    const pvValues = byName.get('profile_views') ?? []

    let prev: InstagramPlatformMetrics['prev'] = null
    if (igPrev) {
      const pByName = new Map(igPrev.map((d) => [d.name, d.values]))
      prev = {
        impressions: sumValues(pByName.get('impressions') ?? []),
        reach: sumValues(pByName.get('reach') ?? []),
        interactions: sumValues(pByName.get('total_interactions') ?? []),
      }
    }

    instagram = {
      impressions: sumValues(impValues),
      reach: sumValues(reachValues),
      interactions: sumValues(interValues),
      profileViews: sumValues(pvValues),
      daily: impValues
        .map((v) => ({ date: v.end_time.slice(0, 10), impressions: v.value }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      prev,
    }
  }

  logger.info({ projectId, hasFacebook: !!facebook, hasInstagram: !!instagram }, '[meta-analytics] Metriken abgerufen')
  return { facebook, instagram }
}
