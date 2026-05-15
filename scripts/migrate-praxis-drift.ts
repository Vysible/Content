/**
 * Data migration script for Sprint P3-C Drift-Fix
 *
 * Migrates:
 * 1. PraxisUser.inviteToken → InvitationToken table
 * 2. textResults[].blogStatus → ContentApproval table
 *
 * Run AFTER the schema migration:
 *   npx prisma migrate deploy
 *   npx tsx scripts/migrate-praxis-drift.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('[Vysible] Starting Praxis Drift-Fix data migration...')

  // 1. Migrate PraxisUser inviteToken → InvitationToken
  const praxisUsers = await prisma.praxisUser.findMany()
  let tokenCount = 0

  for (const pu of praxisUsers) {
    const exists = await prisma.invitationToken.findFirst({
      where: { praxisUserId: pu.id },
    })
    if (exists) continue

    await prisma.invitationToken.create({
      data: {
        token: pu.inviteToken,
        projectId: pu.projectId,
        praxisUserId: pu.id,
        email: pu.email,
        expiresAt: pu.inviteExpires,
        usedAt: pu.active ? new Date() : null,
      },
    })
    tokenCount++
  }
  console.log(`[Vysible] Migrated ${tokenCount} InvitationToken records`)

  // 2. Migrate textResults[].blogStatus → ContentApproval
  const projects = await prisma.project.findMany({
    select: { id: true, textResults: true },
  })
  let approvalCount = 0

  for (const project of projects) {
    const results = project.textResults as Array<Record<string, unknown>> | null
    if (!results) continue

    for (let i = 0; i < results.length; i++) {
      const status = results[i]?.blogStatus as string | undefined
      if (!status || status === 'ausstehend') continue

      await prisma.contentApproval.upsert({
        where: { projectId_contentIndex: { projectId: project.id, contentIndex: i } },
        update: { status },
        create: { projectId: project.id, contentIndex: i, status },
      })
      approvalCount++
    }
  }
  console.log(`[Vysible] Migrated ${approvalCount} ContentApproval records`)

  console.log('[Vysible] Data migration complete.')
}

main()
  .catch((err) => {
    console.error('[Vysible] Migration failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
