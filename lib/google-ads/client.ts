import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

export interface GoogleAdsMetrics {
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  totalConversions: number
  averageCpc: number
  campaigns: {
    name: string
    spend: number
    clicks: number
    impressions: number
    ctr: number
    conversions: number
    status: string
  }[]
  topKeywords: {
    keyword: string
    clicks: number
    impressions: number
    spend: number
  }[]
  dailySpend: {
    date: string
    spend: number
  }[]
}

interface TokenCache {
  accessToken: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

function normalizeCustomerId(customerId: string): string {
  return customerId.replace(/-/g, '')
}

async function fetchAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Ads OAuth-Zugangsdaten nicht konfiguriert')
  }

  const { accessToken, expiresIn } = await withRetry(async () => {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      logger.error({ status: res.status, body }, 'Google Ads Token-Fehler')
      throw new Error(`Google Ads Token-Anfrage fehlgeschlagen: ${res.status} — ${body}`)
    }

    const data = (await res.json()) as { access_token: string; expires_in: number }
    return { accessToken: data.access_token, expiresIn: data.expires_in }
  }, 'googleAds.fetchAccessToken')

  tokenCache = {
    accessToken,
    expiresAt: Date.now() + (expiresIn - 60) * 1000,
  }

  return accessToken
}

interface SearchResponse {
  results?: Record<string, unknown>[]
}

async function searchGaql(customerId: string, query: string): Promise<SearchResponse> {
  const accessToken = await fetchAccessToken()
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!

  const res = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': devToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  )

  if (!res.ok) {
    const errBody = await res.text()
    logger.error({ status: res.status, body: errBody, customerId }, 'Google Ads GAQL-Anfrage fehlgeschlagen')
    throw new Error(`Google Ads GAQL-Anfrage fehlgeschlagen: ${res.status} — ${errBody}`)
  }

  return res.json() as Promise<SearchResponse>
}

function getNumber(obj: unknown, ...path: string[]): number {
  let cur: unknown = obj
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return 0
    cur = (cur as Record<string, unknown>)[key]
  }
  if (cur == null) return 0
  return Number(cur)
}

function getString(obj: unknown, ...path: string[]): string {
  let cur: unknown = obj
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return ''
    cur = (cur as Record<string, unknown>)[key]
  }
  return String(cur ?? '')
}

export async function fetchGoogleAdsMetrics(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsMetrics> {
  const normalizedId = normalizeCustomerId(customerId)
  logger.info({ customerId: normalizedId, startDate, endDate }, 'Google Ads Metriken werden abgerufen')

  const dateFilter = `segments.date BETWEEN '${startDate}' AND '${endDate}'`

  const campaignQuery = `
    SELECT campaign.name, campaign.status, metrics.impressions, metrics.clicks,
           metrics.cost_micros, metrics.ctr, metrics.conversions
    FROM campaign
    WHERE ${dateFilter}
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 20
  `

  const keywordsQuery = `
    SELECT ad_group_criterion.keyword.text, metrics.impressions, metrics.clicks,
           metrics.cost_micros
    FROM keyword_view
    WHERE ${dateFilter}
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.clicks DESC
    LIMIT 10
  `

  const dailySpendQuery = `
    SELECT segments.date, metrics.cost_micros
    FROM customer
    WHERE ${dateFilter}
    ORDER BY segments.date ASC
  `

  const [campaignRes, keywordsRes, dailyRes] = await Promise.all([
    searchGaql(normalizedId, campaignQuery),
    searchGaql(normalizedId, keywordsQuery),
    searchGaql(normalizedId, dailySpendQuery),
  ])

  const campaigns = (campaignRes.results ?? []).map((row) => {
    const spend = getNumber(row, 'metrics', 'costMicros') / 1_000_000
    const clicks = getNumber(row, 'metrics', 'clicks')
    const impressions = getNumber(row, 'metrics', 'impressions')
    const ctr = getNumber(row, 'metrics', 'ctr')
    const conversions = getNumber(row, 'metrics', 'conversions')
    const name = getString(row, 'campaign', 'name')
    const status = getString(row, 'campaign', 'status')
    return { name, spend, clicks, impressions, ctr, conversions, status }
  })

  const topKeywords = (keywordsRes.results ?? []).map((row) => {
    const keyword = getString(row, 'adGroupCriterion', 'keyword', 'text')
    const clicks = getNumber(row, 'metrics', 'clicks')
    const impressions = getNumber(row, 'metrics', 'impressions')
    const spend = getNumber(row, 'metrics', 'costMicros') / 1_000_000
    return { keyword, clicks, impressions, spend }
  })

  const dailySpend = (dailyRes.results ?? []).map((row) => {
    const date = getString(row, 'segments', 'date')
    const spend = getNumber(row, 'metrics', 'costMicros') / 1_000_000
    return { date, spend }
  })

  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0)
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0)
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0)
  const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0

  logger.info(
    { customerId: normalizedId, totalSpend, totalClicks, totalImpressions },
    'Google Ads Metriken erfolgreich abgerufen',
  )

  return {
    totalSpend,
    totalClicks,
    totalImpressions,
    totalConversions,
    averageCpc,
    campaigns,
    topKeywords,
    dailySpend,
  }
}
