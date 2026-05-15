import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let settings = await prisma.costSettings.findFirst()
  if (!settings) {
    settings = await prisma.costSettings.create({
      data: {},
    })
  }

  return NextResponse.json({
    monthlyAlertEur: settings.monthlyAlertEur,
    alertEnabled: settings.alertEnabled,
  })
}

export async function PUT(req: Request) {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json()) as { monthlyAlertEur: number; alertEnabled: boolean }

  let settings = await prisma.costSettings.findFirst()
  if (!settings) {
    settings = await prisma.costSettings.create({
      data: {
        monthlyAlertEur: body.monthlyAlertEur,
        alertEnabled: body.alertEnabled,
      },
    })
  } else {
    settings = await prisma.costSettings.update({
      where: { id: settings.id },
      data: {
        monthlyAlertEur: body.monthlyAlertEur,
        alertEnabled: body.alertEnabled,
      },
    })
  }

  return NextResponse.json({
    monthlyAlertEur: settings.monthlyAlertEur,
    alertEnabled: settings.alertEnabled,
  })
}
