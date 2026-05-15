'use client'

import { useEffect, useMemo, useState } from 'react'

type SmtpConfigResponse = {
  id: string
  host: string
  port: number
  secure: boolean
  user: string
  recipients: string[]
  active: boolean
  hasPassword: boolean
}

type FormState = {
  id: string | null
  host: string
  port: string
  secure: boolean
  user: string
  password: string
  recipients: string
  active: boolean
}

const initialForm: FormState = {
  id: null,
  host: '',
  port: '587',
  secure: false,
  user: '',
  password: '',
  recipients: '',
  active: true,
}

function parseRecipients(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function validateRecipients(value: string): string | null {
  const recipients = parseRecipients(value)
  if (recipients.length === 0) return 'Mindestens ein Empfänger ist erforderlich.'
  if (recipients.length > 5) return 'Maximal 5 Empfänger erlaubt.'
  const invalid = recipients.find((line) => !line.includes('@'))
  if (invalid) return `Ungültige E-Mail-Adresse: ${invalid}`
  return null
}

export function SmtpForm() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [testStatus, setTestStatus] = useState('')
  const [existingHasPassword, setExistingHasPassword] = useState(false)

  const recipientsError = useMemo(() => validateRecipients(form.recipients), [form.recipients])

  useEffect(() => {
    async function loadConfig() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/settings/smtp')
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'SMTP-Konfiguration konnte nicht geladen werden.')
          return
        }
        if (data.config) {
          const cfg = data.config as SmtpConfigResponse
          setForm({
            id: cfg.id,
            host: cfg.host,
            port: String(cfg.port),
            secure: cfg.secure,
            user: cfg.user,
            password: '',
            recipients: cfg.recipients.join('\n'),
            active: cfg.active,
          })
          setExistingHasPassword(cfg.hasPassword)
        } else {
          setForm(initialForm)
          setExistingHasPassword(false)
        }
      } catch {
        setError('Netzwerkfehler beim Laden der SMTP-Konfiguration.')
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setTestStatus('')

    if (recipientsError) {
      setError(recipientsError)
      return
    }

    if (!form.id && form.password.trim().length === 0) {
      setError('Passwort ist für neue SMTP-Konfigurationen erforderlich.')
      return
    }

    const payload = {
      id: form.id ?? undefined,
      host: form.host.trim(),
      port: Number(form.port),
      secure: form.secure,
      user: form.user.trim(),
      password: form.password,
      recipients: parseRecipients(form.recipients),
      active: form.active,
    }

    if (!Number.isInteger(payload.port) || payload.port < 1 || payload.port > 65535) {
      setError('Port muss eine Zahl zwischen 1 und 65535 sein.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/settings/smtp', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'SMTP-Konfiguration konnte nicht gespeichert werden.')
        return
      }

      const cfg = data.config as SmtpConfigResponse
      setForm({
        id: cfg.id,
        host: cfg.host,
        port: String(cfg.port),
        secure: cfg.secure,
        user: cfg.user,
        password: '',
        recipients: cfg.recipients.join('\n'),
        active: cfg.active,
      })
      setExistingHasPassword(cfg.hasPassword)
      setSuccess('[OK] SMTP-Konfiguration gespeichert')
    } catch {
      setError('Netzwerkfehler beim Speichern.')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestMail() {
    setError('')
    setSuccess('')
    setTestStatus('')

    if (recipientsError) {
      setError(recipientsError)
      return
    }

    if (form.password.trim().length === 0 && !existingHasPassword) {
      setError('Bitte Passwort setzen, bevor eine Testmail gesendet wird.')
      return
    }

    const payload = {
      id: form.id ?? undefined,
      host: form.host.trim(),
      port: Number(form.port),
      secure: form.secure,
      user: form.user.trim(),
      password: form.password,
      recipients: parseRecipients(form.recipients),
    }

    if (!Number.isInteger(payload.port) || payload.port < 1 || payload.port > 65535) {
      setError('Port muss eine Zahl zwischen 1 und 65535 sein.')
      return
    }

    setTesting(true)
    try {
      const res = await fetch('/api/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setTestStatus(`[FAIL] Fehler: ${data.error ?? 'Unbekannter Fehler'}`)
        return
      }
      setTestStatus('[OK] Testmail versendet')
    } catch {
      setTestStatus('[FAIL] Fehler: Netzwerkfehler')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-stahlgrau">Lädt SMTP-Konfiguration …</div>
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone p-6">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="host" className="block text-xs font-medium text-anthrazit mb-1">
              SMTP-Host
            </label>
            <input
              id="host"
              type="text"
              required
              value={form.host}
              onChange={(e) => update('host', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone rounded-lg"
              placeholder="smtp.gmail.com"
            />
          </div>

          <div>
            <label htmlFor="port" className="block text-xs font-medium text-anthrazit mb-1">
              Port
            </label>
            <input
              id="port"
              type="number"
              required
              value={form.port}
              onChange={(e) => update('port', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone rounded-lg"
              placeholder="587"
              min={1}
              max={65535}
            />
          </div>
        </div>

        <div>
          <label htmlFor="user" className="block text-xs font-medium text-anthrazit mb-1">
            Benutzername
          </label>
          <input
            id="user"
            type="text"
            required
            value={form.user}
            onChange={(e) => update('user', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-anthrazit mb-1">
            Passwort
          </label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg"
            placeholder={existingHasPassword ? 'Leer lassen = Passwort unverändert' : 'SMTP-Passwort'}
          />
          {existingHasPassword && (
            <p className="mt-1 text-xs text-stahlgrau">Passwort ist gespeichert. Leer lassen, um es zu behalten.</p>
          )}
        </div>

        <div>
          <label htmlFor="recipients" className="block text-xs font-medium text-anthrazit mb-1">
            Empfänger (max. 5, eine E-Mail pro Zeile)
          </label>
          <textarea
            id="recipients"
            required
            value={form.recipients}
            onChange={(e) => update('recipients', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone rounded-lg min-h-28"
            placeholder={'praxis@example.com\nteam@example.com'}
          />
        </div>

        <div className="flex items-center gap-6">
          <label className="inline-flex items-center gap-2 text-sm text-anthrazit">
            <input
              type="checkbox"
              checked={form.secure}
              onChange={(e) => update('secure', e.target.checked)}
              className="rounded border-stone"
            />
            TLS/SSL aktivieren (`secure`)
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-anthrazit">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update('active', e.target.checked)}
              className="rounded border-stone"
            />
            Aktiv
          </label>
        </div>

        {error && (
          <p className="text-xs text-bordeaux bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>
        )}
        {testStatus && (
          <p className="text-xs text-anthrazit bg-stone-50 border border-stone rounded-lg px-3 py-2">{testStatus}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-cognac hover:bg-cognacDark text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
          >
            {saving ? 'Wird gespeichert …' : 'SMTP speichern'}
          </button>
          <button
            type="button"
            onClick={handleTestMail}
            disabled={testing}
            className="bg-white border border-stone hover:bg-stone-50 text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
          >
            {testing ? 'Test läuft …' : 'Testmail senden'}
          </button>
        </div>
      </form>
    </div>
  )
}
