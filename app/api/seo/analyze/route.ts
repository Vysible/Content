import { requireAuth } from '@/lib/auth/session'
import { analyzeSeo } from '@/lib/seo/analyzer'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  await requireAuth()

  const { title, html, keyword, metaDescription } = await req.json()
  if (!title || !html || !keyword) {
    return NextResponse.json({ error: 'title, html und keyword erforderlich' }, { status: 400 })
  }

  const analysis = analyzeSeo({ title, html, keyword, metaDescription })
  return NextResponse.json(analysis)
}
