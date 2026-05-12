import { prisma } from '@/lib/db'
import type { CostEntry } from '@prisma/client'

export interface ProjectCostSummary {
  projectId: string
  projectName: string
  totalEur: number
  currentMonthEur: number
  lastMonthEur: number
  byStep: Record<string, number>
  avgPerPackage: number
  generationCount: number
}

export interface GlobalKpis {
  projectsTotal: number
  projectsActive: number
  projectsArchived: number
  articlesGenerated: number
  newslettersGenerated: number
  socialPostsGenerated: number
  totalCostEur: number
  currentMonthEur: number
  lastMonthEur: number
  avgCostPerPackage: number
  pendingApprovals: number
}

function monthStart(offset = 0): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  d.setMonth(d.getMonth() + offset)
  return d
}

export async function getProjectCosts(projectId: string): Promise<ProjectCostSummary> {
  const [project, entries] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { name: true, textResults: true } }),
    prisma.costEntry.findMany({ where: { projectId } }),
  ])

  const byStep: Record<string, number> = {}
  let total = 0
  let currentMonth = 0
  let lastMonth = 0
  const now = monthStart()
  const prev = monthStart(-1)

  for (const e of entries) {
    byStep[e.step] = (byStep[e.step] ?? 0) + e.costEur
    total += e.costEur
    if (e.timestamp >= now) currentMonth += e.costEur
    else if (e.timestamp >= prev) lastMonth += e.costEur
  }

  const themeRuns = entries.filter((e: CostEntry) => e.step === 'themes').length
  const generationCount = Math.max(1, themeRuns)

  return {
    projectId,
    projectName: project?.name ?? projectId,
    totalEur: total,
    currentMonthEur: currentMonth,
    lastMonthEur: lastMonth,
    byStep,
    avgPerPackage: total / generationCount,
    generationCount,
  }
}

export async function getGlobalKpis(): Promise<GlobalKpis> {
  const [projects, allEntries, praxisUsers] = await Promise.all([
    prisma.project.findMany({
      select: { status: true, textResults: true },
    }),
    prisma.costEntry.findMany({ select: { costEur: true, step: true, timestamp: true } }),
    prisma.praxisUser.findMany({ where: { active: true }, select: { id: true } }),
  ])

  const now = monthStart()
  const prev = monthStart(-1)

  let totalEur = 0, currentMonthEur = 0, lastMonthEur = 0
  for (const e of allEntries) {
    totalEur += e.costEur
    if (e.timestamp >= now) currentMonthEur += e.costEur
    else if (e.timestamp >= prev) lastMonthEur += e.costEur
  }

  let articlesGenerated = 0, newslettersGenerated = 0, socialPostsGenerated = 0
  for (const p of projects) {
    const results = (p.textResults as Array<{ blog?: unknown; newsletter?: unknown; socialPosts?: unknown[] }> | null) ?? []
    for (const r of results) {
      if (r.blog) articlesGenerated++
      if (r.newsletter) newslettersGenerated++
      if (r.socialPosts?.length) socialPostsGenerated += r.socialPosts.length
    }
  }

  const themeRuns = allEntries.filter((e: { costEur: number; step: string; timestamp: Date }) => e.step === 'themes').length
  const generationCount = Math.max(1, themeRuns)

  return {
    projectsTotal: projects.length,
    projectsActive: projects.filter((p) => p.status === 'ACTIVE').length,
    projectsArchived: projects.filter((p) => p.status === 'ARCHIVED').length,
    articlesGenerated,
    newslettersGenerated,
    socialPostsGenerated,
    totalCostEur: totalEur,
    currentMonthEur,
    lastMonthEur,
    avgCostPerPackage: totalEur / generationCount,
    pendingApprovals: praxisUsers.length,
  }
}
