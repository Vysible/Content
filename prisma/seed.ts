import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const clients = [
  { name: 'Bachmann',                canvaFolderId: 'FAHGQkZVhXA' },
  { name: 'Bernick',                 canvaFolderId: 'FAFiW8qoMPI' },
  { name: 'Christina Sternbauer',    canvaFolderId: 'FAFyu3IrWpA' },
  { name: 'Dentaltrainer',           canvaFolderId: 'FAFqZFIoJZI' },
  { name: 'Die Zahnerei',            canvaFolderId: 'FAHJucbbOMA' },
  { name: 'ELÉ Atelier',             canvaFolderId: 'FAFxyJKMRoI' },
  { name: 'Friesdorf',               canvaFolderId: 'FAEYQXzk2w0' },
  { name: 'Froschkönig',             canvaFolderId: 'FAEhc9V6DTI' },
  { name: 'Gelenkwerk',              canvaFolderId: 'FAHJuT47NMw' },
  { name: 'Gruga',                   canvaFolderId: 'FAEYQONtC1c' },
  { name: 'GynamSee',                canvaFolderId: 'FAHJucLm0xc' },
  { name: 'Habermann',               canvaFolderId: 'FAFxyMMLbrA', canvaBrandKitId: 'kAHJu_WkoZE' },
  { name: 'Hagelauer',               canvaFolderId: 'FAHJueB85Z8' },
  { name: 'Harpain',                 canvaFolderId: 'FAHJuIbVtD8' },
  { name: 'Heinig',                  canvaFolderId: 'FAEGzuNKHls' },
  { name: 'Inan',                    canvaFolderId: 'FAFqZP8aPG4' },
  { name: 'Inova Plus',              canvaFolderId: 'FAF6ydsB0MQ' },
  { name: 'Ising',                   canvaFolderId: 'FAD56EMouvA' },
  { name: 'Jäger',                   canvaFolderId: 'FAFxyNN6Ujg' },
  { name: 'Kardiologie Schadowstr.', canvaFolderId: 'FAFxyaY31FM' },
  { name: 'Kinzigtal',               canvaFolderId: 'FAE4l8kVyO0' },
  { name: 'Körner',                  canvaFolderId: 'FAE4l9yBsOs' },
  { name: 'Lenatz',                  canvaFolderId: 'FAE4l-BIv40' },
  { name: 'Lieblingshautarzt',       canvaFolderId: 'FAF6yfaGINs' },
  { name: 'Marident',                canvaFolderId: 'FAFqkcdp7UU' },
  { name: 'Masouleh',                canvaFolderId: 'FAFxyAd4fqc' },
  { name: 'Mauer',                   canvaFolderId: 'FAEYQQzLV3g' },
  { name: 'MeinZahnarzt / Schlegel', canvaFolderId: 'FAFqZEg9UcA' },
  { name: 'Mlecko',                  canvaFolderId: 'FAE14PJvxec' },
  { name: 'My.Ortho',                canvaFolderId: 'FAHJuUtyeq4' },
  { name: 'Orthopassion',            canvaFolderId: 'FAFqZL3Z7mQ' },
  { name: 'Physio Königshardt',      canvaFolderId: 'FAFxyOc3byw' },
  { name: 'Prelytics',               canvaFolderId: 'FAHJuYZped0' },
  { name: 'Schuetz',                 canvaFolderId: 'FAEiO7Dq_vs' },
  { name: 'Univiva',                 canvaFolderId: 'FADrq0Dze0k' },
  { name: 'Wacker',                  canvaFolderId: 'FAHJuWLZdC0' },
  { name: 'Warendorf / Morawek',     canvaFolderId: 'FADrxJRG68E' },
  { name: 'Zahnraum',                canvaFolderId: 'FAHJuQswO_U', canvaBrandKitId: 'kAHJu9MD38Y' },
  { name: 'Zahnteam Bad Laer',       canvaFolderId: 'FADrxMud1WY' },
  { name: 'Zahnteam Neuhausen',      canvaFolderId: 'FAEXnN0hGb8' },
]

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

  for (const client of clients) {
    await prisma.client.upsert({
      where: { name: client.name },
      update: {
        canvaFolderId: client.canvaFolderId,
        canvaBrandKitId: client.canvaBrandKitId ?? null,
      },
      create: {
        name: client.name,
        canvaFolderId: client.canvaFolderId,
        canvaBrandKitId: client.canvaBrandKitId ?? null,
      },
    })
  }

  console.log(`[Vysible] Seed: ${clients.length} Kunden angelegt`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
