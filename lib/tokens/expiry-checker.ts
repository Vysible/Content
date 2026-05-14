import { prisma } from '@/lib/db'
import { sendNotification } from '@/lib/email/mailer'
import { logger } from '@/lib/utils/logger'

const WARN_DAYS = Number(process.env.TOKEN_WARN_DAYS ?? '14')

export async function checkTokenExpiry(): Promise<void> {
  const warnBefore = new Date(Date.now() + WARN_DAYS * 24 * 60 * 60 * 1000)

  const expiring = await prisma.apiKey.findMany({
    where: {
      active: true,
      expiresAt: { lte: warnBefore, gte: new Date() },
    },
  })

  for (const key of expiring) {
    const daysLeft = Math.ceil(
      ((key.expiresAt?.getTime() ?? 0) - Date.now()) / (1000 * 60 * 60 * 24)
    )
    await sendNotification('generation_complete', 'System', `API-Key "${key.name}" (${key.provider}) läuft in ${daysLeft} Tagen ab.`).catch(() => {})
    logger.warn({ keyId: key.id, provider: key.provider, daysLeft }, 'Token expiry warning')
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
