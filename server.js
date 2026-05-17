require('dotenv').config()
const express = require('express')
const nodemailer = require('nodemailer')
const QRCode = require('qrcode')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000
const PARTNER_EMAIL = process.env.PARTNER_EMAIL || 'jetzt@abnehm-institut.com'
const FORM_URL = process.env.FORM_URL || 'https://abnehm-institut.com/partner'

// Simple in-memory rate limiter: max 3 submissions per IP per 10 minutes
const rateLimitMap = new Map()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

function isRateLimited(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return false
  }
  if (entry.count >= RATE_LIMIT_MAX) return true
  entry.count++
  return false
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

app.post('/submit', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Zu viele Anfragen. Bitte versuche es später erneut.' })
  }

  const name = (req.body.name || '').trim()
  const email = (req.body.email || '').trim().toLowerCase()

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(422).json({ error: 'Name und gültige E-Mail-Adresse erforderlich.' })
  }

  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const transporter = createTransporter()
  const now = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Deine Partner-Anfrage ist eingegangen',
      html: `<div style="font-family:system-ui,sans-serif;max-width:540px;color:#2D3748">
        <h2 style="color:#7A2D42">Danke, ${safeName}!</h2>
        <p>Wir haben deine Anfrage erhalten und melden uns in Kürze bei dir.</p>
        <p style="color:#888;font-size:12px;margin-top:32px">Abnehm-Institut</p>
      </div>`,
      text: `Hallo ${name},\n\ndanke für deine Partner-Anfrage! Wir melden uns in Kürze.\n\nAbnehm-Institut`,
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: PARTNER_EMAIL,
      subject: `Neue Partner-Anfrage von ${safeName}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:540px;color:#2D3748">
        <h2 style="color:#7A2D42">Neue Partner-Anfrage</h2>
        <table style="border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 16px 6px 0;font-weight:600">Name</td><td>${safeName}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-weight:600">E-Mail</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-weight:600">Eingang</td><td>${now}</td></tr>
        </table>
      </div>`,
      text: `Neue Partner-Anfrage\n\nName: ${name}\nE-Mail: ${email}\nEingang: ${now}`,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('E-Mail-Fehler:', err)
    res.status(500).json({ error: 'E-Mail-Versand fehlgeschlagen.' })
  }
})

app.get('/qr', async (req, res) => {
  try {
    const svg = await QRCode.toString(FORM_URL, {
      type: 'svg',
      margin: 2,
      width: 300,
      color: { dark: '#7A2D42', light: '#F6F1E9' },
      errorCorrectionLevel: 'M',
    })
    res.setHeader('Content-Type', 'image/svg+xml')
    res.send(svg)
  } catch (err) {
    console.error('QR-Fehler:', err)
    res.status(500).send('QR-Code konnte nicht generiert werden.')
  }
})

app.listen(PORT, () => console.log(`Partner-App läuft auf Port ${PORT}`))
