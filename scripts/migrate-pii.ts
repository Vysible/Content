/**
 * PII Migration Script: Plaintext email/name → AES-256-GCM encrypted.
 *
 * Ausführen (einmalig, nach prisma migrate deploy):
 *   pnpm ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-pii.ts
 *
 * Voraussetzung: ENCRYPTION_SECRET in .env gesetzt.
 * Idempotenz: Datensätze mit bereits gesetztem emailEncrypted werden übersprungen.
 */
import { PrismaClient } from '@prisma/client'
import { encrypt } from '../lib/crypto/aes'

const prisma = new PrismaClient()

async function main() {
  // --- Users ---
  const users = await prisma.user.findMany({
    where: { emailEncrypted: null },
    select: { id: true, email: true, name: true },
  })
  console.log(`[INFO] Migriere ${users.length} User-Einträge...`)

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailEncrypted: encrypt(user.email),
        nameEncrypted: user.name ? encrypt(user.name) : null,
      },
    })
  }
  console.log(`[OK]   ${users.length} User-Einträge verschlüsselt.`)

  // --- PraxisUsers ---
  const praxisUsers = await prisma.praxisUser.findMany({
    where: { emailEncrypted: null },
    select: { id: true, email: true, name: true },
  })
  console.log(`[INFO] Migriere ${praxisUsers.length} PraxisUser-Einträge...`)

  for (const pu of praxisUsers) {
    await prisma.praxisUser.update({
      where: { id: pu.id },
      data: {
        emailEncrypted: encrypt(pu.email),
        nameEncrypted: encrypt(pu.name),
      },
    })
  }
  console.log(`[OK]   ${praxisUsers.length} PraxisUser-Einträge verschlüsselt.`)
}

main()
  .catch((e) => {
    console.error('[FAIL] Migration fehlgeschlagen:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
