import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { loadCredentials } from '@/lib/integrations/store'
import { logger } from '@/lib/utils/logger'
import type { IntegrationProvider } from '@/lib/integrations/store'

const ALLOWED: IntegrationProvider[] = ['KLICKTIPP', 'WORDPRESS', 'META', 'LINKEDIN']

function isValid(p: string): p is IntegrationProvider {
  return ALLOWED.includes(p as IntegrationProvider)
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string; provider: string } },
) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  if (!isValid(params.provider)) {
    return NextResponse.json({ error: 'Unbekannter Provider' }, { status: 400 })
  }

  try {
    const creds = await loadCredentials(params.id, params.provider)

    if (params.provider === 'KLICKTIPP') {
      const res = await fetch('https://api.klicktipp.com/account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: creds.username, password: creds.password }),
      })
      if (!res.ok) return NextResponse.json({ ok: false, error: `Login fehlgeschlagen (HTTP ${res.status})` })
      const data = await res.json() as { sessid?: string }
      if (!data.sessid) return NextResponse.json({ ok: false, error: 'Kein Session-Token erhalten' })
      // Logout
      await fetch('https://api.klicktipp.com/account/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessid: data.sessid }),
      }).catch(() => undefined)
      return NextResponse.json({ ok: true })
    }

    if (params.provider === 'WORDPRESS') {
      const url = (creds.url ?? '').replace(/\/$/, '')
      const token = Buffer.from(`${creds.username}:${creds.appPassword}`).toString('base64')
      const res = await fetch(`${url}/wp-json/wp/v2/users/me`, {
        headers: { Authorization: `Basic ${token}` },
      })
      if (!res.ok) return NextResponse.json({ ok: false, error: `Verbindung fehlgeschlagen (HTTP ${res.status})` })
      return NextResponse.json({ ok: true })
    }

    if (params.provider === 'META') {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(creds.pageAccessToken ?? '')}`,
      )
      if (!res.ok) return NextResponse.json({ ok: false, error: `Token ungültig (HTTP ${res.status})` })
      return NextResponse.json({ ok: true })
    }

    if (params.provider === 'LINKEDIN') {
      const res = await fetch('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${creds.accessToken ?? ''}` },
      })
      if (!res.ok) return NextResponse.json({ ok: false, error: `Token ungültig (HTTP ${res.status})` })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: 'Test für diesen Provider nicht verfügbar' })
  } catch (err: unknown) {
    logger.error({ err, projectId: params.id, provider: params.provider }, 'Integration-Test fehlgeschlagen')
    const msg = err instanceof Error ? err.message : 'Verbindungstest fehlgeschlagen'
    return NextResponse.json({ ok: false, error: msg })
  }
}
