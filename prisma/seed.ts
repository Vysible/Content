import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await hash('admin123', 12)

  await prisma.user.upsert({
    where: { email: 'admin@vysible.de' },
    update: {},
    create: {
      email: 'admin@vysible.de',
      name: 'Administrator',
      password,
      role: 'ADMIN',
    },
  })

  console.log('[Vysible] Seed: Admin-User angelegt')
  console.log('[Vysible] Login: admin@vysible.de / admin123')
  console.log('[Vysible] ⚠️  Passwort nach erstem Login ändern!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
