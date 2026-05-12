import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/index.js'
import bcryptjs from '../node_modules/.pnpm/bcryptjs@2.4.3/node_modules/bcryptjs/index.js'

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://vysible:vysible@localhost:5432/vysible' } }
})

const hash = await bcryptjs.hash('admin123', 12)
const user = await prisma.user.upsert({
  where: { email: 'admin@vysible.de' },
  update: {},
  create: { email: 'admin@vysible.de', name: 'Admin', password: hash, role: 'ADMIN' }
})
console.log('User angelegt:', user.email)
await prisma.$disconnect()
