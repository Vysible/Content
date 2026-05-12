import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { buildPostPayload } from './formatter'

async function getWpCredentials(projectId: string): Promise<{ url: string; token: string }> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { wpUrl: true } })
  if (!project?.wpUrl) throw new Error('Keine WordPress-URL für dieses Projekt konfiguriert')

  const apiKey = await prisma.apiKey.findFirst({
    where: { provider: 'WORDPRESS', active: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!apiKey) throw new Error('Kein WordPress API-Key gefunden')

  const token = decrypt(apiKey.encryptedKey)
  return { url: project.wpUrl.replace(/\/$/, ''), token }
}

export async function createWordPressDraft(
  projectId: string,
  title: string,
  html: string,
  categories: number[] = []
): Promise<{ id: number; link: string }> {
  const { url, token } = await getWpCredentials(projectId)
  const payload = buildPostPayload(title, html, categories)

  const res = await fetch(`${url}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`WordPress API Fehler ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  return { id: data.id, link: data.link }
}
