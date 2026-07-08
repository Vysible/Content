import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

export interface ConversionBreakdown {
  anrufe: number
  mails: number
  buchungen: number
}

export interface PeriodSnapshot {
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  totalConversions: number
  averageCpc: number
}

export interface GoogleAdsMetrics {
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  totalConversions: number
  averageCpc: number
  conversionBreakdown: ConversionBreakdown
  prev: PeriodSnapshot | null
  campaigns: {
    name: string
    spend: number
    clicks: number
    impressions: number
    ctr: number
    conversions: number
    status: string
    conversionBreakdown: ConversionBreakdown
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
  return withRetry(async () => {
    const accessToken = await fetchAccessToken()
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
    const managerCustomerId = process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': devToken,
      'Content-Type': 'application/json',
    }

    // Manager-Konto (Verwaltungskonto): login-customer-id setzen
    if (managerCustomerId) {
      headers['login-customer-id'] = managerCustomerId.replace(/-/g, '')
    }

    const res = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      },
    )

    if (!res.ok) {
      const errBody = await res.text()
      logger.error({ status: res.status, body: errBody, customerId }, 'Google Ads GAQL-Anfrage fehlgeschlagen')
      throw new Error(`Google Ads GAQL-Anfrage fehlgeschlagen: ${res.status} — ${errBody}`)
    }

    return res.json() as Promise<SearchResponse>
  }, 'googleAds.searchGaql')
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

  const conversionActionQuery = `
    SELECT campaign.name, segments.conversion_action_name,
           segments.conversion_action_category, metrics.conversions
    FROM campaign
    WHERE ${dateFilter}
      AND campaign.status != 'REMOVED'
      AND metrics.conversions > 0
    ORDER BY campaign.name ASC
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

  // Vorperiode berechnen (gleiche Länge vor dem aktuellen Zeitraum)
  const periodMs = new Date(endDate).getTime() - new Date(startDate).getTime()
  const periodDays = Math.round(periodMs / 86_400_000) + 1
  const prevEnd = new Date(new Date(startDate).getTime() - 86_400_000).toISOString().slice(0, 10)
  const prevStart = new Date(new Date(startDate).getTime() - periodDays * 86_400_000).toISOString().slice(0, 10)

  const prevQuery = `
    SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${prevStart}' AND '${prevEnd}'
      AND campaign.status != 'REMOVED'
  `

  const [campaignRes, conversionActionRes, keywordsRes, dailyRes, prevRes] = await Promise.all([
    searchGaql(normalizedId, campaignQuery),
    searchGaql(normalizedId, conversionActionQuery).catch((err) => {
      logger.warn({ err, customerId: normalizedId }, 'Conversion-Action-Breakdown konnte nicht geladen werden')
      return { results: [] as Record<string, unknown>[] }
    }),
    searchGaql(normalizedId, keywordsQuery),
    searchGaql(normalizedId, dailySpendQuery),
    searchGaql(normalizedId, prevQuery).catch(() => ({ results: [] as Record<string, unknown>[] })),
  ])

  // Conversion-Action-Kategorien → Deutsch
  const emptyBreakdown = (): ConversionBreakdown => ({ anrufe: 0, mails: 0, buchungen: 0 })

  function categoryToBucket(category: string): keyof ConversionBreakdown | null {
    const c = category.toUpperCase()
    if (c.includes('CALL') || c.includes('PHONE')) return 'anrufe'
    if (c.includes('LEAD') || c.includes('FORM') || c.includes('CONTACT') || c.includes('EMAIL')) return 'mails'
    if (c.includes('BOOK') || c.includes('APPOINTMENT') || c.includes('PURCHASE') || c.includes('SIGNUP')) return 'buchungen'
    return null
  }

  // Breakdown pro Kampagne aufbauen
  const breakdownByCampaign: Record<string, ConversionBreakdown> = {}
  for (const row of conversionActionRes.results ?? []) {
    const campaignName = getString(row, 'campaign', 'name')
    const category = getString(row, 'segments', 'conversionActionCategory')
    const convs = getNumber(row, 'metrics', 'conversions')
    const bucket = categoryToBucket(category)
    if (!bucket || convs === 0) continue
    if (!breakdownByCampaign[campaignName]) breakdownByCampaign[campaignName] = emptyBreakdown()
    breakdownByCampaign[campaignName][bucket] += convs
  }

  const campaigns = (campaignRes.results ?? []).map((row) => {
    const spend = getNumber(row, 'metrics', 'costMicros') / 1_000_000
    const clicks = getNumber(row, 'metrics', 'clicks')
    const impressions = getNumber(row, 'metrics', 'impressions')
    const ctr = getNumber(row, 'metrics', 'ctr')
    const conversions = getNumber(row, 'metrics', 'conversions')
    const name = getString(row, 'campaign', 'name')
    const status = getString(row, 'campaign', 'status')
    const conversionBreakdown = breakdownByCampaign[name] ?? emptyBreakdown()
    return { name, spend, clicks, impressions, ctr, conversions, status, conversionBreakdown }
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

  // Vorperiode aggregieren
  const prevRows = prevRes.results ?? []
  const prevTotalSpend = prevRows.reduce((s, r) => s + getNumber(r, 'metrics', 'costMicros') / 1_000_000, 0)
  const prevTotalClicks = prevRows.reduce((s, r) => s + getNumber(r, 'metrics', 'clicks'), 0)
  const prevTotalImpressions = prevRows.reduce((s, r) => s + getNumber(r, 'metrics', 'impressions'), 0)
  const prevTotalConversions = prevRows.reduce((s, r) => s + getNumber(r, 'metrics', 'conversions'), 0)
  const prevAverageCpc = prevTotalClicks > 0 ? prevTotalSpend / prevTotalClicks : 0
  const prev: PeriodSnapshot | null = prevRows.length > 0 ? {
    totalSpend: prevTotalSpend,
    totalClicks: prevTotalClicks,
    totalImpressions: prevTotalImpressions,
    totalConversions: prevTotalConversions,
    averageCpc: prevAverageCpc,
  } : null

  const conversionBreakdown: ConversionBreakdown = campaigns.reduce(
    (sum, c) => ({
      anrufe: sum.anrufe + c.conversionBreakdown.anrufe,
      mails: sum.mails + c.conversionBreakdown.mails,
      buchungen: sum.buchungen + c.conversionBreakdown.buchungen,
    }),
    emptyBreakdown(),
  )

  logger.info(
    { customerId: normalizedId, totalSpend, totalClicks, totalImpressions, totalConversions },
    'Google Ads Metriken erfolgreich abgerufen',
  )

  return {
    totalSpend,
    totalClicks,
    totalImpressions,
    totalConversions,
    averageCpc,
    conversionBreakdown,
    prev,
    campaigns,
    topKeywords,
    dailySpend,
  }
}
