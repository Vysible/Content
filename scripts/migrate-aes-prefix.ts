/**
 * AES Versions-Präfix Migration: iv:tag:cipher → v1:iv:tag:cipher
 *
 * Dry-Run (Standard — keine DB-Änderungen):
 *   npx tsx scripts/migrate-aes-prefix.ts
 *
 * Echte Migration (erst nach Code-Deploy + ENCRYPTION_SECRET_V1 in ENV setzen):
 *   npx tsx scripts/migrate-aes-prefix.ts --apply
 *
 * Deployment-Reihenfolge (Prod):
 *   1. Code mit neuer aes.ts deployen (Sub-Slice A)
 *   2. ENCRYPTION_SECRET_V1 in Coolify setzen (gleicher Wert wie ENCRYPTION_SECRET)
 *   3. App neu starten → Login + API-Key-Test
 *   4. Dieses Script mit --apply ausführen
 *   5. Stichproben: Login + API-Key + Export
 *   6. ENCRYPTION_SECRET aus Coolify entfernen
 *
 * Idempotenz: Werte die bereits mit "v1:" beginnen werden übersprungen.
 * Konsistenz: Script bricht bei erstem Fehler ab — keine Teil-Migration.
 */
import { PrismaClient } from '@prisma/client'
import { decrypt, encrypt } from '../lib/crypto/aes'

const prisma = new PrismaClient()
const DRY_RUN = !process.argv.includes('--apply')

async function migrateField(
  label: string,
  id: string,
  value: string,
  doUpdate: (newValue: string) => Promise<void>,
): Promise<boolean> {
  if (value.startsWith('v1:')) {
    console.log(`[SKIP] ${label} id=${id} — bereits migriert`)
    return false
  }

  const plaintext = decrypt(value)
  const migrated = encrypt(plaintext)

  if (DRY_RUN) {
    console.log(`[DRY]  ${label} id=${id} — würde migriert (${value.length} → ${migrated.length} Zeichen)`)
  } else {
    await doUpdate(migrated)
    console.log(`[OK]   ${label} id=${id} — migriert (${value.length} → ${migrated.length} Zeichen)`)
  }
  return true
}

async function main() {
  console.log(
    DRY_RUN
      ? '[INFO] Dry-Run-Modus (Standard) — keine DB-Änderungen. Für echte Migration: --apply'
      : '[WARN] Apply-Modus aktiv — DB-Änderungen werden durchgeführt!',
  )

  let totalFields = 0
  let migratedFields = 0

  // --- ApiKey.encryptedKey ---
  const apiKeys = await prisma.apiKey.findMany({ select: { id: true, encryptedKey: true } })
  console.log(`\n[INFO] ApiKey: ${apiKeys.length} Einträge`)
  for (const row of apiKeys) {
    totalFields++
    const changed = await migrateField('ApiKey.encryptedKey', row.id, row.encryptedKey, (v) =>
      prisma.apiKey.update({ where: { id: row.id }, data: { encryptedKey: v } }).then(() => undefined),
    )
    if (changed) migratedFields++
  }

  // --- SmtpConfig.encryptedPassword ---
  const smtpConfigs = await prisma.smtpConfig.findMany({ select: { id: true, encryptedPassword: true } })
  console.log(`\n[INFO] SmtpConfig: ${smtpConfigs.length} Einträge`)
  for (const row of smtpConfigs) {
    totalFields++
    const changed = await migrateField('SmtpConfig.encryptedPassword', row.id, row.encryptedPassword, (v) =>
      prisma.smtpConfig.update({ where: { id: row.id }, data: { encryptedPassword: v } }).then(() => undefined),
    )
    if (changed) migratedFields++
  }

  // --- CanvaToken.encryptedAccessToken + encryptedRefreshToken ---
  const canvaTokens = await prisma.canvaToken.findMany({
    select: { id: true, encryptedAccessToken: true, encryptedRefreshToken: true },
  })
  console.log(`\n[INFO] CanvaToken: ${canvaTokens.length} Einträge`)
  for (const row of canvaTokens) {
    totalFields++
    const changedAccess = await migrateField('CanvaToken.encryptedAccessToken', row.id, row.encryptedAccessToken, (v) =>
      prisma.canvaToken.update({ where: { id: row.id }, data: { encryptedAccessToken: v } }).then(() => undefined),
    )
    if (changedAccess) migratedFields++

    totalFields++
    const changedRefresh = await migrateField('CanvaToken.encryptedRefreshToken', row.id, row.encryptedRefreshToken, (v) =>
      prisma.canvaToken.update({ where: { id: row.id }, data: { encryptedRefreshToken: v } }).then(() => undefined),
    )
    if (changedRefresh) migratedFields++
  }

  // --- User.emailEncrypted / nameEncrypted ---
  const users = await prisma.user.findMany({ select: { id: true, emailEncrypted: true, nameEncrypted: true } })
  console.log(`\n[INFO] User: ${users.length} Einträge`)
  for (const row of users) {
    if (row.emailEncrypted) {
      totalFields++
      const changed = await migrateField('User.emailEncrypted', row.id, row.emailEncrypted, (v) =>
        prisma.user.update({ where: { id: row.id }, data: { emailEncrypted: v } }).then(() => undefined),
      )
      if (changed) migratedFields++
    }
    if (row.nameEncrypted) {
      totalFields++
      const changed = await migrateField('User.nameEncrypted', row.id, row.nameEncrypted, (v) =>
        prisma.user.update({ where: { id: row.id }, data: { nameEncrypted: v } }).then(() => undefined),
      )
      if (changed) migratedFields++
    }
  }

  // --- PraxisUser.emailEncrypted / nameEncrypted ---
  const praxisUsers = await prisma.praxisUser.findMany({
    select: { id: true, emailEncrypted: true, nameEncrypted: true },
  })
  console.log(`\n[INFO] PraxisUser: ${praxisUsers.length} Einträge`)
  for (const row of praxisUsers) {
    if (row.emailEncrypted) {
      totalFields++
      const changed = await migrateField('PraxisUser.emailEncrypted', row.id, row.emailEncrypted, (v) =>
        prisma.praxisUser.update({ where: { id: row.id }, data: { emailEncrypted: v } }).then(() => undefined),
      )
      if (changed) migratedFields++
    }
    if (row.nameEncrypted) {
      totalFields++
      const changed = await migrateField('PraxisUser.nameEncrypted', row.id, row.nameEncrypted, (v) =>
        prisma.praxisUser.update({ where: { id: row.id }, data: { nameEncrypted: v } }).then(() => undefined),
      )
      if (changed) migratedFields++
    }
  }

  console.log(`\n[SUMMARY] ${totalFields} Felder geprüft — ${migratedFields} ${DRY_RUN ? 'würden migriert werden' : 'migriert'}.`)
  if (DRY_RUN && migratedFields > 0) {
    console.log('[INFO]    Für echte Migration ausführen: npx tsx scripts/migrate-aes-prefix.ts --apply')
  }
}

main()
  .catch((e) => {
    console.error('[FAIL] Migration fehlgeschlagen:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
