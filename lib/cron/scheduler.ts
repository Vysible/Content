import cron from 'node-cron'
import { generateMonthlyReport, sendMonthlyReport } from '@/lib/costs/reporter'
import { checkTokenExpiry } from '@/lib/tokens/expiry-checker'
import { logger } from '@/lib/utils/logger'
import { prisma } from '@/lib/db'

let started = false

export function startCronJobs(): void {
  if (started) return
  started = true

  // Monthly report: 1st of each month at 06:00
  cron.schedule('0 6 1 * *', async () => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    logger.info({ month }, '[Vysible] Cron: Monatsreport starten')
    try {
      const pdfPath = await generateMonthlyReport(month)
      await sendMonthlyReport(month, pdfPath)
    } catch (exc: unknown) {
      logger.error({ err: exc, month }, '[Vysible] Automatischer Monatsreport fehlgeschlagen')
    }
  })

  // Daily token expiry check at 08:00
  cron.schedule('0 8 * * *', async () => {
    logger.info('Cron: Checking token expiry')
    await checkTokenExpiry().catch((e: unknown) => logger.error({ err: e }, 'Cron expiry error'))
  })

  // Daily audit log retention at 03:00 — delete entries older than 30 days
  cron.schedule('0 3 * * *', async () => {
    const RETENTION_DAYS = Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? '30')
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
    try {
      const { count } = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      })
      logger.info({ count, retentionDays: RETENTION_DAYS }, 'Cron: AuditLog-Retention abgeschlossen')
    } catch (e: unknown) {
      logger.error({ err: e }, 'Cron: AuditLog-Retention fehlgeschlagen')
    }
  })

  logger.info('Cron jobs started')
}
