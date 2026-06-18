import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto/aes'
import { logger } from '@/lib/utils/logger'

export type IntegrationProvider = 'KLICKTIPP' | 'WORDPRESS' | 'META' | 'LINKEDIN'

export interface IntegrationStatus {
  connected: boolean
  config: Record<string, string> | null
}

export async function getIntegration(
  projectId: string,
  provider: IntegrationProvider,
): Promise<IntegrationStatus> {
  const row = await prisma.projectIntegration.findUnique({
    where: { projectId_provider: { projectId, provider } },
    select: { config: true },
  })
  return {
    connected: row !== null,
    config: row?.config ? (row.config as Record<string, string>) : null,
  }
}

export async function saveIntegration(
  projectId: string,
  provider: IntegrationProvider,
  credentials: Record<string, string>,
  config?: Record<string, string>,
): Promise<void> {
  const encryptedCredentials = encrypt(JSON.stringify(credentials))
  await prisma.projectIntegration.upsert({
    where: { projectId_provider: { projectId, provider } },
    create: {
      projectId,
      provider,
      credentials: encryptedCredentials,
      config: config ?? {},
    },
    update: {
      credentials: encryptedCredentials,
      config: config ?? {},
    },
  })
}

export async function deleteIntegration(
  projectId: string,
  provider: IntegrationProvider,
): Promise<void> {
  await prisma.projectIntegration.deleteMany({
    where: { projectId, provider },
  })
}

export async function loadCredentials<T extends Record<string, string>>(
  projectId: string,
  provider: IntegrationProvider,
): Promise<T> {
  const row = await prisma.projectIntegration.findUnique({
    where: { projectId_provider: { projectId, provider } },
    select: { credentials: true },
  })
  if (!row) throw new Error(`Keine ${provider}-Zugangsdaten für Projekt ${projectId}`)
  try {
    return JSON.parse(decrypt(row.credentials)) as T
  } catch (err: unknown) {
    logger.error({ err, projectId, provider }, 'Credential-Entschlüsselung fehlgeschlagen')
    throw new Error(`${provider}-Zugangsdaten konnten nicht entschlüsselt werden`)
  }
}
