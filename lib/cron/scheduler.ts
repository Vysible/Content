import cron from 'node-cron'
import { generateMonthlyReport } from '@/lib/costs/reporter'
import { checkTokenExpiry } from '@/lib/tokens/expiry-checker'
import { logger } from '@/lib/utils/logger'

let started = false

export function startCronJobs(): void {
  if (started) return
  started = true

  // Monthly report: 1st of each month at 06:00
  cron.schedule('0 6 1 * *', async () => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    logger.info({ month }, 'Cron: Generating monthly report')
    await generateMonthlyReport(month).catch((e: unknown) => logger.error({ err: e, month }, 'Cron report error'))
  })

  // Daily token expiry check at 08:00
  cron.schedule('0 8 * * *', async () => {
    logger.info('Cron: Checking token expiry')
    await checkTokenExpiry().catch((e: unknown) => logger.error({ err: e }, 'Cron expiry error'))
  })

  logger.info('Cron jobs started')
}
