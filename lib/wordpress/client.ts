import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

export interface WpDraftResult {
  id: number
  link: string
  status: string
}

async function getWpCredentials(projectId: string): Promise<{ url: string; credentials: string }> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { wpUrl: true } })
  if (!project?.wpUrl) throw new Error('Keine WordPress-URL für dieses Projekt konfiguriert')

  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'WORDPRESS', active: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!apiKey) throw new Error('Kein WordPress API-Key gefunden')

  const credentials = decrypt(apiKey.encryptedKey)
  return { url: project.wpUrl.replace(/\/$/, ''), credentials }
}

export async function createWpDraft(
  projectId: string,
  title: string,
  content: string,
  excerpt?: string,
): Promise<WpDraftResult> {
  const { url, credentials } = await getWpCredentials(projectId)
  const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`
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
    return { id: data.id, link: data.link, status: data.status }
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
