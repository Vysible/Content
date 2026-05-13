import { prisma } from '@/lib/db'
import { getProjectCosts } from './aggregator'
import { sendNotification } from '@/lib/email/mailer'
import PDFDocument from 'pdfkit'

const COST_THRESHOLD_EUR = Number(process.env.COST_THRESHOLD_EUR ?? '10')

export async function generateMonthlyReport(month: string): Promise<void> {
  const projects = await prisma.project.findMany({ select: { id: true, name: true } })

  for (const project of projects) {
    const costs = await getProjectCosts(project.id)
    const prevReport = await prisma.costReport.findFirst({
      where: { projectId: project.id, month },
    })
    if (prevReport) continue

    await prisma.costReport.create({
      data: {
        projectId: project.id,
        month,
        totalEur: costs.totalEur,
        breakdown: costs.byStep,
      },
    })
  }

  const globalReport = await prisma.costReport.findFirst({
    where: { projectId: null, month },
  })
  if (!globalReport) {
    const all = await prisma.costEntry.findMany({
      where: {
        timestamp: {
          gte: new Date(`${month}-01T00:00:00.000Z`),
          lt: new Date(
            `${month.slice(0, 4)}-${String(Number(month.slice(5, 7)) + 1).padStart(2, '0')}-01T00:00:00.000Z`
          ),
        },
      },
    })
    const allRows = all as Array<{ costEur: number; step: string }>
    const totalEur = allRows.reduce((s, e) => s + e.costEur, 0)
    const breakdown: Record<string, number> = {}
    for (const e of allRows) breakdown[e.step] = (breakdown[e.step] ?? 0) + e.costEur

    await prisma.costReport.create({
      data: { projectId: null, month, totalEur, breakdown },
    })
  }
}

export async function checkCostThreshold(projectId: string): Promise<void> {
  const costs = await getProjectCosts(projectId)
  if (costs.currentMonthEur >= COST_THRESHOLD_EUR) {
    await sendNotification('generation_complete', costs.projectName, `Kostenschwelle erreicht: ${costs.currentMonthEur.toFixed(4)} €`).catch(() => {})
  }
}

export async function buildCostPdf(projectId: string): Promise<Buffer> {
  const costs = await getProjectCosts(projectId)
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(18).text(`Kostenbericht: ${costs.projectName}`, { align: 'left' })
    doc.moveDown()
    doc.fontSize(11).text(`Gesamt: ${costs.totalEur.toFixed(4)} €`)
    doc.text(`Laufender Monat: ${costs.currentMonthEur.toFixed(4)} €`)
    doc.text(`Letzter Monat: ${costs.lastMonthEur.toFixed(4)} €`)
    doc.text(`Ø pro Paket: ${costs.avgPerPackage.toFixed(4)} €`)
    doc.moveDown()
    doc.fontSize(13).text('Nach Schritt')
    doc.moveDown(0.5)
    for (const [step, eur] of Object.entries(costs.byStep)) {
      doc.fontSize(10).text(`${step}: ${(eur as number).toFixed(4)} €`)
    }
    doc.end()
  })
}
