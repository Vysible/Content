import PDFDocument from 'pdfkit'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import fs from 'node:fs/promises'
import { prisma } from '@/lib/db'
import { getGlobalKpis, getProjectCosts } from './aggregator'
import type { GlobalKpis } from './aggregator'
import { sendNotification } from '@/lib/email/mailer'
import { logger } from '@/lib/utils/logger'

const COST_THRESHOLD_EUR = Number(process.env.COST_THRESHOLD_EUR ?? '10')
const REPORT_DIR = path.join(process.cwd(), 'reports')

export async function generateMonthlyReport(month: string): Promise<string> {
  await fs.mkdir(REPORT_DIR, { recursive: true })
  const kpis = await getGlobalKpis()
  const pdfPath = path.join(REPORT_DIR, `Report_${month}.pdf`)
  await buildReportPdf(pdfPath, month, kpis)
  logger.info({ month, pdfPath }, '[Vysible] Monatsreport generiert')
  return pdfPath
}

export async function sendMonthlyReport(month: string, pdfPath: string): Promise<void> {
  await prisma.monthlyReport.upsert({
    where: { period: month },
    create: { period: month, pdfPath, sentAt: new Date() },
    update: { sentAt: new Date() },
  })

  const reports = await prisma.monthlyReport.findMany({ orderBy: { generatedAt: 'asc' } })
  if (reports.length > 12) {
    const toDelete = reports.slice(0, reports.length - 12)
    for (const r of toDelete) {
      await prisma.monthlyReport.delete({ where: { id: r.id } })
      await fs.unlink(r.pdfPath).catch((err: unknown) => {
        logger.warn({ err }, '[Vysible] Altes Report-PDF konnte nicht gelöscht werden')
      })
    }
  }

  await sendNotification('monthly_report', `Report ${month}`).catch((err: unknown) => {
    logger.warn({ err }, '[Vysible] Monatsreport-E-Mail fehlgeschlagen — Report liegt in DB')
  })
}

export async function checkCostThreshold(projectId: string): Promise<void> {
  const costs = await getProjectCosts(projectId)
  if (costs.currentMonthEur >= COST_THRESHOLD_EUR) {
    await sendNotification(
      'cost_threshold_exceeded',
      costs.projectName,
      `Kostenschwelle erreicht: ${costs.currentMonthEur.toFixed(4)} €`,
    ).catch((err: unknown) => {
      logger.warn({ err, projectId }, 'E-Mail-Benachrichtigung für Kostenschwelle fehlgeschlagen')
    })
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

function buildReportPdf(pdfPath: string, month: string, kpis: GlobalKpis): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const stream = createWriteStream(pdfPath)
    doc.pipe(stream)

    doc.fontSize(18).font('Helvetica-Bold').text(`Monatsreport ${month}`, { align: 'center' })
    doc.moveDown()
    doc.fontSize(11).font('Helvetica')
    doc.text(`Projekte gesamt: ${kpis.projectsTotal}  |  Aktiv: ${kpis.projectsActive}  |  Archiviert: ${kpis.projectsArchived}`)
    doc.text(`Artikel: ${kpis.articlesGenerated}  |  Newsletter: ${kpis.newslettersGenerated}  |  Social: ${kpis.socialPostsGenerated}`)
    doc.moveDown()
    doc.fontSize(13).font('Helvetica-Bold').text('KI-Kosten')
    doc.fontSize(11).font('Helvetica')
    doc.text(`Laufender Monat: ${kpis.currentMonthEur.toFixed(4)} €`)
    doc.text(`Letzter Monat:   ${kpis.lastMonthEur.toFixed(4)} €`)
    doc.text(`Gesamt:          ${kpis.totalCostEur.toFixed(4)} €`)
    doc.text(`Ø pro Paket:     ${kpis.avgCostPerPackage.toFixed(4)} €`)
    doc.end()

    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}
