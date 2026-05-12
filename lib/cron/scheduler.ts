import cron from 'node-cron'
import { generateMonthlyReport } from '@/lib/costs/reporter'
import { checkTokenExpiry } from '@/lib/tokens/expiry-checker'

let started = false

export function startCronJobs(): void {
  if (started) return
  started = true

  // Monthly report: 1st of each month at 06:00
  cron.schedule('0 6 1 * *', async () => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    console.log('[Vysible] Cron: Generating monthly report for', month)
    await generateMonthlyReport(month).catch((e) => console.error('[Vysible] Cron report error:', e))
  })

  // Daily token expiry check at 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('[Vysible] Cron: Checking token expiry')
    await checkTokenExpiry().catch((e) => console.error('[Vysible] Cron expiry error:', e))
  })

  console.log('[Vysible] Cron jobs started')
}
