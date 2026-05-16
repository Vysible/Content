import crypto from 'crypto'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

export interface GA4Metrics {
  sessions: number
  users: number
  pageviews: number
  topPages: { page: string; views: number }[]
  trafficSources: { source: string; sessions: number }[]
  dailySessions: { date: string; sessions: number }[]
}

interface ServiceAccountKey {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  token_uri: string
}

interface TokenCache {
  accessToken: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

function getServiceAccount(): ServiceAccountKey {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON
  if (!raw) {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON nicht konfiguriert')
  }
  try {
    return JSON.parse(raw) as ServiceAccountKey
  } catch {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON ist kein valides JSON')
  }
}

function buildJwt(sa: ServiceAccountKey): string {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claims = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp,
      iat: now,
    }),
  ).toString('base64url')

  const payload = `${header}.${claims}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(payload)
  const signature = sign.sign(sa.private_key, 'base64url')

  return `${payload}.${signature}`
}

async function fetchAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken
  }

  const sa = getServiceAccount()

  const accessToken = await withRetry(async () => {
    const jwt = buildJwt(sa)
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      logger.error({ status: res.status, body }, 'GA4 Token-Fehler')
      throw new Error(`GA4 Token-Anfrage fehlgeschlagen: ${res.status} — ${body}`)
    }

    const data = (await res.json()) as { access_token: string; expires_in: number }
    return data.access_token
  }, 'ga4.fetchAccessToken')

  tokenCache = {
    accessToken,
    expiresAt: Date.now() + 3600 * 1000,
  }

  return accessToken
}

interface RunReportBody {
  dateRanges: { startDate: string; endDate: string }[]
  dimensions?: { name: string }[]
  metrics: { name: string }[]
  limit?: number
  orderBys?: { metric?: { metricName: string }; desc?: boolean }[]
}

interface ReportRow {
  dimensionValues?: { value: string }[]
  metricValues: { value: string }[]
}

interface RunReportResponse {
  rows?: ReportRow[]
}

async function runReport(propertyId: string, body: RunReportBody): Promise<RunReportResponse> {
  const accessToken = await fetchAccessToken()

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )

  if (!res.ok) {
    const errBody = await res.text()
    logger.error({ status: res.status, body: errBody, propertyId }, 'GA4 runReport fehlgeschlagen')
    throw new Error(`GA4 runReport fehlgeschlagen: ${res.status} — ${errBody}`)
  }

  return res.json() as Promise<RunReportResponse>
}

export async function fetchGA4Metrics(propertyId: string): Promise<GA4Metrics> {
  logger.info({ propertyId }, 'GA4 Metriken werden abgerufen')

  const dateRange = { startDate: '28daysAgo', endDate: 'today' }

  const [overviewReport, topPagesReport, trafficReport, dailyReport] = await Promise.all([
    runReport(propertyId, {
      dateRanges: [dateRange],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
    }),
    runReport(propertyId, {
      dateRanges: [dateRange],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: 10,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    }),
    runReport(propertyId, {
      dateRanges: [dateRange],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      limit: 8,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
    runReport(propertyId, {
      dateRanges: [dateRange],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: false }],
    }),
  ])

  const overviewRow = overviewReport.rows?.[0]
  const sessions = parseInt(overviewRow?.metricValues?.[0]?.value ?? '0', 10)
  const users = parseInt(overviewRow?.metricValues?.[1]?.value ?? '0', 10)
  const pageviews = parseInt(overviewRow?.metricValues?.[2]?.value ?? '0', 10)

  const topPages = (topPagesReport.rows ?? []).map((row) => ({
    page: row.dimensionValues?.[0]?.value ?? '/',
    views: parseInt(row.metricValues[0]?.value ?? '0', 10),
  }))

  const trafficSources = (trafficReport.rows ?? []).map((row) => ({
    source: row.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: parseInt(row.metricValues[0]?.value ?? '0', 10),
  }))

  const dailySessions = (dailyReport.rows ?? [])
    .map((row) => {
      const raw = row.dimensionValues?.[0]?.value ?? ''
      const formatted =
        raw.length === 8
          ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
          : raw
      return {
        date: formatted,
        sessions: parseInt(row.metricValues[0]?.value ?? '0', 10),
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  logger.info({ propertyId, sessions, users, pageviews }, 'GA4 Metriken erfolgreich abgerufen')

  return { sessions, users, pageviews, topPages, trafficSources, dailySessions }
}
