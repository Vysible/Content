import { loadCredentials } from '@/lib/integrations/store'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

interface WordPressCredentials {
  url: string
  username: string
  appPassword: string
}

export interface WpDraftResult {
  id: number
  link: string
  status: string
  wpUrl: string
}

export async function createWpDraft(
  projectId: string,
  title: string,
  content: string,
  excerpt?: string,
): Promise<WpDraftResult> {
  const creds = await loadCredentials<WordPressCredentials>(projectId, 'WORDPRESS')
  const url = creds.url.replace(/\/$/, '')
  const authHeader = `Basic ${Buffer.from(`${creds.username}:${creds.appPassword}`).toString('base64')}`
  const apiUrl = `${url}/wp-json/wp/v2/posts`

  return withRetry(async () => {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        status: 'draft',
        excerpt: excerpt ?? '',
        comment_status: 'closed',
      }),
    })

    if (response.status === 401) {
      throw new Error('WordPress Application Password ungültig oder abgelaufen')
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`WP REST API HTTP ${response.status}: ${body.slice(0, 200)}`)
    }

    const data = (await response.json()) as { id: number; link: string; status: string }
    logger.info({ wpPostId: data.id, wpUrl: url }, '[Vysible] WordPress Draft erstellt')
    return { id: data.id, link: data.link, status: data.status, wpUrl: url }
  }, 'wordpress.create_draft')
}

export async function testWpConnection(
  wpUrl: string,
  credentials: string,
): Promise<{ ok: boolean; user?: string; error?: string }> {
  try {
    const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`
    const response = await fetch(
      `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`,
      { headers: { Authorization: authHeader } },
    )
    if (response.ok) {
      const data = (await response.json()) as { name?: string }
      return { ok: true, user: data.name ?? 'unbekannt' }
    }
    return { ok: false, error: `HTTP ${response.status}` }
  } catch (exc: unknown) {
    logger.warn({ err: exc, wpUrl }, '[Vysible] WP-Verbindungstest fehlgeschlagen')
    return { ok: false, error: exc instanceof Error ? exc.message : String(exc) }
  }
}
