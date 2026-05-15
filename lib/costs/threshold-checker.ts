import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import { sendNotification } from '@/lib/email/mailer'

export async function checkCostThreshold(projectId: string): Promise<void> {
  try {
    const settings = await prisma.costSettings.findFirst()
    if (!settings?.alertEnabled) return

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const monthlySum = await prisma.costEntry.aggregate({
      where: { projectId, timestamp: { gte: monthStart } },
      _sum: { costEur: true },
    })

    const total = monthlySum._sum.costEur ?? 0
    if (total > settings.monthlyAlertEur) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      })

      await sendNotification(
        'cost_threshold_exceeded',
        project?.name ?? projectId,
        `Monatliche Kosten: ${total.toFixed(2)} € (Schwellwert: ${settings.monthlyAlertEur} €)`
      )
    }
  } catch (exc: unknown) {
    logger.warn({ err: exc }, '[Vysible] Kosten-Schwellwert-Check fehlgeschlagen')
  }
}
