import { prisma } from '@/lib/db'
import { sendNotification } from '@/lib/email/mailer'
import { logger } from '@/lib/utils/logger'

const WARN_DAYS = Number(process.env.TOKEN_WARN_DAYS ?? '14')

export type ExpiryLevel = 'ok' | 'warning' | 'urgent' | 'critical' | 'expired'

export interface TokenExpiryStatus {
  id: string
  name: string
  provider: string
  expiresAt: Date
  daysLeft: number
  level: ExpiryLevel
  source: 'apiKey' | 'canvaToken'
}

export function getExpiryLevel(daysLeft: number): ExpiryLevel {
  if (daysLeft <= 0) return 'expired'
  if (daysLeft <= 1) return 'critical'
  if (daysLeft <= 7) return 'urgent'
  if (daysLeft <= 14) return 'warning'
  return 'ok'
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export async function getAllTokenExpiryStatuses(): Promise<TokenExpiryStatus[]> {
  const warnBefore = new Date(Date.now() + WARN_DAYS * 24 * 60 * 60 * 1000)
  const statuses: TokenExpiryStatus[] = []

  const apiKeys = await prisma.apiKey.findMany({
    where: { active: true, expiresAt: { lte: warnBefore } },
    select: { id: true, name: true, provider: true, expiresAt: true },
  })

  for (const key of apiKeys) {
    if (!key.expiresAt) continue
    const daysLeft = daysUntil(key.expiresAt)
    const level = getExpiryLevel(daysLeft)
    if (level === 'ok') continue
    statuses.push({ id: key.id, name: key.name, provider: key.provider, expiresAt: key.expiresAt, daysLeft, level, source: 'apiKey' })
  }

  const canvaTokens = await prisma.canvaToken.findMany({
    where: { expiresAt: { lte: warnBefore } },
    select: { id: true, expiresAt: true },
  })

  for (const token of canvaTokens) {
    const daysLeft = daysUntil(token.expiresAt)
    const level = getExpiryLevel(daysLeft)
    if (level === 'ok') continue
    statuses.push({ id: token.id, name: 'Canva OAuth Token', provider: 'CANVA', expiresAt: token.expiresAt, daysLeft, level, source: 'canvaToken' })
  }

  return statuses
}

export async function checkTokenExpiry(): Promise<void> {
  const statuses = await getAllTokenExpiryStatuses()

  for (const status of statuses) {
    logger.warn({ id: status.id, provider: status.provider, daysLeft: status.daysLeft, level: status.level }, 'Token expiry warning')

    if (status.level === 'urgent' || status.level === 'critical') {
      const label = status.source === 'canvaToken' ? 'Canva OAuth Token' : `API-Key "${status.name}"`
      const days = status.daysLeft === 1 ? 'Tag' : 'Tagen'
      await sendNotification(
        'token_expiring',
        'System',
        `${label} (${status.provider}) läuft in ${status.daysLeft} ${days} ab.`,
      ).catch((err: unknown) => {
        logger.warn({ err, id: status.id }, 'E-Mail-Benachrichtigung für Token-Warnung fehlgeschlagen')
      })
    }
  }
}

export async function getExpiringKeys(withinDays = WARN_DAYS) {
  const warnBefore = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000)
  return prisma.apiKey.findMany({
    where: {
      active: true,
      expiresAt: { lte: warnBefore, gte: new Date() },
    },
    select: { id: true, name: true, provider: true, expiresAt: true },
  })
}
