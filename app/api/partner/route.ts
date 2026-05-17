import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/aes'
import { logger } from '@/lib/utils/logger'

const PARTNER_EMAIL = 'jetzt@abnehm-institut.com'

export async function POST(req: NextRequest) {
  let name: string, email: string
  try {
    const body = await req.json()
    name = (body.name ?? '').trim()
    email = (body.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Name und eine gültige E-Mail-Adresse sind erforderlich.' }, { status: 422 })
  }

  const config = await prisma.smtpConfig.findFirst({ where: { active: true } })
  if (!config) {
    logger.error('Partner-Signup: Kein aktiver SMTP-Config')
    return NextResponse.json({ error: 'E-Mail-Versand nicht konfiguriert.' }, { status: 503 })
  }

  let password: string
  try {
    password = decrypt(config.encryptedPassword)
  } catch (err) {
    logger.error({ err }, 'Partner-Signup: SMTP-Passwort konnte nicht entschlüsselt werden')
    return NextResponse.json({ error: 'E-Mail-Versand fehlgeschlagen.' }, { status: 500 })
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: password },
  })

  const now = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })

  await transporter.sendMail({
    from: config.user,
    to: email,
    subject: 'Willkommen – Deine Partner-Anfrage ist eingegangen',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#2D3748">
        <h2 style="color:#7A2D42">Danke, ${name}!</h2>
        <p>Wir haben deine Anfrage erhalten und melden uns in Kürze bei dir.</p>
        <p style="color:#5A6478;font-size:13px;margin-top:32px">Abnehm-Institut – Partnerschaftsprogramm</p>
      </div>`,
    text: `Hallo ${name},\n\ndanke für deine Partner-Anfrage! Wir melden uns in Kürze.\n\nAbnehm-Institut`,
  })

  await transporter.sendMail({
    from: config.user,
    to: PARTNER_EMAIL,
    subject: `Neue Partner-Anfrage von ${name}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#2D3748">
        <h2 style="color:#7A2D42">Neue Partner-Anfrage</h2>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tr><td style="padding:8px 0;font-weight:600;width:100px">Name</td><td>${name}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600">E-Mail</td><td><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px 0;font-weight:600">Eingang</td><td>${now}</td></tr>
        </table>
      </div>`,
    text: `Neue Partner-Anfrage\n\nName: ${name}\nE-Mail: ${email}\nEingang: ${now}`,
  })

  logger.info({ name, email }, 'Partner-Signup: E-Mails gesendet')
  return NextResponse.json({ ok: true })
}
