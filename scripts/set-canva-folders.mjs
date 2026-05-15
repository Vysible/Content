// Einmalig ausführen: node scripts/set-canva-folders.mjs
// Trägt canvaFolderId anhand des Projektnamens (case-insensitiv, Teilstring) ein.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FOLDER_MAP = [
  { match: 'bachmann',    folderId: 'FAHGQkZVhXA' },
  { match: 'warendorf',   folderId: 'FADrxJRG68E' },
  { match: 'harpain',     folderId: 'FAHJuIbVtD8' },
  { match: 'habermann',   folderId: 'FAHJuV1EN90' },
  { match: 'zahnerei',    folderId: 'FAHJucbbOMA' },
  { match: 'lenatz',      folderId: 'FAHJuTHjouE' },
  { match: 'ortho',       folderId: 'FAHJuUtyeq4' },
  { match: 'gyn',         folderId: 'FAHJucLm0xc' },
  { match: 'neutzler',    folderId: 'FAHJucLm0xc' },
  { match: 'wacker',      folderId: 'FAHJuWLZdC0' },
  { match: 'prelytics',   folderId: 'FAHJuYZped0' },
  { match: 'hagelauer',   folderId: 'FAHJueB85Z8' },
  { match: 'gelenkwerk',  folderId: 'FAHJuT47NMw' },
  { match: 'zahnraum',    folderId: 'FAHJuQswO_U' },
  { match: 'zahnteam',    folderId: 'FAHJuRPjZho' },
  { match: 'friesdorf',   folderId: 'FAHJubmM5go' },
]

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, canvaFolderId: true },
  })

  console.log(`\n${projects.length} Projekte gefunden:\n`)

  for (const project of projects) {
    const lower = project.name.toLowerCase()
    const mapping = FOLDER_MAP.find(m => lower.includes(m.match))

    if (!mapping) {
      console.log(`  ⚠️  Keine Zuordnung: "${project.name}"`)
      continue
    }

    if (project.canvaFolderId === mapping.folderId) {
      console.log(`  ✓  Bereits gesetzt: "${project.name}" → ${mapping.folderId}`)
      continue
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { canvaFolderId: mapping.folderId },
    })
    console.log(`  ✅  Gesetzt: "${project.name}" → ${mapping.folderId}`)
  }

  console.log('\nFertig.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
