import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  praxisUrl: z.string().url(),
  praxisName: z.string().optional(),
  fachgebiet: z.string().optional(),
  planningStart: z.string(), // ISO date string
  planningEnd: z.string(),
  channels: z.array(z.string()).min(1, 'Mindestens ein Kanal erforderlich'),
  positioningDocument: z.string().optional(),
  themenPool: z.string().optional(),
  keywords: z.array(z.string()).default([]),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      praxisUrl: true,
      praxisName: true,
      fachgebiet: true,
      planningStart: true,
      planningEnd: true,
      channels: true,
      status: true,
      createdAt: true,
    },
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  const project = await prisma.project.create({
    data: {
      name: data.name,
      praxisUrl: data.praxisUrl,
      praxisName: data.praxisName ?? null,
      fachgebiet: data.fachgebiet ?? null,
      planningStart: new Date(data.planningStart),
      planningEnd: new Date(data.planningEnd),
      channels: data.channels,
      positioningDocument: data.positioningDocument ?? null,
      themenPool: data.themenPool ?? null,
      keywords: data.keywords,
      createdById: session.user.id,
    },
    select: { id: true, name: true },
  })

  console.log(`[Vysible] Projekt erstellt: ${project.id} – ${project.name} (User: ${session.user.id})`)

  return NextResponse.json(project, { status: 201 })
}
