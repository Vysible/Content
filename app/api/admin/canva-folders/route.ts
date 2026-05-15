import { requireAdmin } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const FOLDER_MAP: { match: string; folderId: string }[] = [
  { match: 'bachmann',   folderId: 'FAHGQkZVhXA' },
  { match: 'warendorf',  folderId: 'FADrxJRG68E' },
  { match: 'harpain',    folderId: 'FAHJuIbVtD8' },
  { match: 'habermann',  folderId: 'FAHJuV1EN90' },
  { match: 'zahnerei',   folderId: 'FAHJucbbOMA' },
  { match: 'lenatz',     folderId: 'FAHJuTHjouE' },
  { match: 'ortho',      folderId: 'FAHJuUtyeq4' },
  { match: 'gyn',        folderId: 'FAHJucLm0xc' },
  { match: 'neutzler',   folderId: 'FAHJucLm0xc' },
  { match: 'wacker',     folderId: 'FAHJuWLZdC0' },
  { match: 'prelytics',  folderId: 'FAHJuYZped0' },
  { match: 'hagelauer',  folderId: 'FAHJueB85Z8' },
  { match: 'gelenkwerk', folderId: 'FAHJuT47NMw' },
  { match: 'zahnraum',   folderId: 'FAHJuQswO_U' },
  { match: 'zahnteam',   folderId: 'FAHJuRPjZho' },
  { match: 'friesdorf',  folderId: 'FAHJubmM5go' },
]

export async function POST() {
  await requireAdmin()

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, canvaFolderId: true },
  })

  const results: { name: string; status: string; folderId?: string }[] = []

  for (const project of projects) {
    const lower = project.name.toLowerCase()
    const mapping = FOLDER_MAP.find(m => lower.includes(m.match))

    if (!mapping) {
      results.push({ name: project.name, status: 'no_match' })
      continue
    }

    if (project.canvaFolderId === mapping.folderId) {
      results.push({ name: project.name, status: 'already_set', folderId: mapping.folderId })
      continue
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { canvaFolderId: mapping.folderId },
    })
    results.push({ name: project.name, status: 'updated', folderId: mapping.folderId })
  }

  return NextResponse.json({ results })
}
