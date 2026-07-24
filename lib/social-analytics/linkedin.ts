import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import { loadCredentials, getIntegration } from '@/lib/integrations/store'

interface LinkedInCredentials extends Record<string, string> {
  accessToken: string
}

export interface LinkedInPlatformMetrics {
  impressions: number
  clicks: number
  reactions: number
  comments: number
  shares: number
  daily: { date: string; impressions: number }[]
  prev: { impressions: number; clicks: number; reactions: number } | null
}

export interface LinkedInSocialAnalytics {
  linkedin: LinkedInPlatformMetrics | null
  error?: string
}

interface ShareStatElement {
  totalShareStatistics: {
    impressionCount: number
    clickCount: number
    likeCount: number
    commentCount: number
    shareCount: number
  }
  timeRange: { start: number; end: number }
}

function periodBounds(startDate: string, endDate: string): { prevStart: string; prevEnd: string } {
  const periodMs = new Date(endDate).getTime() - new Date(startDate).getTime()
  const periodDays = Math.round(periodMs / 86_400_000) + 1
  const prevEnd = new Date(new Date(startDate).getTime() - 86_400_000).toISOString().slice(0, 10)
  const prevStart = new Date(new Date(startDate).getTime() - periodDays * 86_400_000).toISOString().slice(0, 10)
  return { prevStart, prevEnd }
}

async function fetchShareStats(
  token: string,
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<ShareStatElement[]> {
  const startMs = new Date(startDate).getTime()
  const endMs = new Date(endDate).getTime() + 86_400_000

  const params = new URLSearchParams({
    q: 'organizationalEntity',
    organizationalEntity: `urn:li:organization:${organizationId}`,
    'timeIntervals.timeGranularityType': 'DAY',
    'timeIntervals.timeRange.start': String(startMs),
    'timeIntervals.timeRange.end': String(endMs),
  })

  const data = await withRetry(async () => {
    const res = await fetch(`https://api.linkedin.com/v2/shareStatistics?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202312',
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`LinkedIn ShareStatistics ${res.status}: ${body}`)
    }
    return res.json() as Promise<{ elements: ShareStatElement[] }>
  }, 'linkedin.shareStatistics')

  return data.elements ?? []
}

function aggregateStats(elements: ShareStatElement[]): {
  impressions: number; clicks: number; reactions: number; comments: number; shares: number
} {
  return elements.reduce(
    (sum, el) => ({
      impressions: sum.impressions + (el.totalShareStatistics.impressionCount ?? 0),
      clicks: sum.clicks + (el.totalShareStatistics.clickCount ?? 0),
      reactions: sum.reactions + (el.totalShareStatistics.likeCount ?? 0),
      comments: sum.comments + (el.totalShareStatistics.commentCount ?? 0),
      shares: sum.shares + (el.totalShareStatistics.shareCount ?? 0),
    }),
    { impressions: 0, clicks: 0, reactions: 0, comments: 0, shares: 0 },
  )
}

export async function fetchLinkedInAnalytics(
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<LinkedInSocialAnalytics> {
  const integration = await getIntegration(projectId, 'LINKEDIN')
  if (!integration.connected) {
    return { linkedin: null, error: 'LinkedIn nicht konfiguriert' }
  }

  let token: string
  try {
    const creds = await loadCredentials<LinkedInCredentials>(projectId, 'LINKEDIN')
    token = creds.accessToken
  } catch (err) {
    logger.error({ err, projectId }, '[linkedin-analytics] Zugangsdaten konnten nicht geladen werden')
    return { linkedin: null, error: 'LinkedIn-Zugangsdaten ungültig' }
  }

  const entityId = integration.config?.entityId
  const postAs = (integration.config?.postAs ?? 'organization') as string

  if (!entityId || postAs !== 'organization') {
    return { linkedin: null, error: 'LinkedIn-Analytics erfordert eine Organisations-ID' }
  }

  const { prevStart, prevEnd } = periodBounds(startDate, endDate)

  const [currentElements, prevElements] = await Promise.all([
    fetchShareStats(token, entityId, startDate, endDate).catch((err) => {
      logger.error({ err, projectId }, '[linkedin-analytics] ShareStatistics Fehler')
      return null
    }),
    fetchShareStats(token, entityId, prevStart, prevEnd).catch(() => null),
  ])

  if (!currentElements) {
    return { linkedin: null, error: 'LinkedIn-Daten konnten nicht abgerufen werden' }
  }

  const current = aggregateStats(currentElements)

  const prev = prevElements
    ? (() => {
        const p = aggregateStats(prevElements)
        return { impressions: p.impressions, clicks: p.clicks, reactions: p.reactions }
      })()
    : null

  const daily = currentElements
    .map((el) => ({
      date: new Date(el.timeRange.start).toISOString().slice(0, 10),
      impressions: el.totalShareStatistics.impressionCount ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  logger.info({ projectId, impressions: current.impressions }, '[linkedin-analytics] Metriken abgerufen')
  return {
    linkedin: { ...current, daily, prev },
  }
}
