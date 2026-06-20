import { Header } from '@/components/layout/header'
import { requireAuth } from '@/lib/auth/session'
import { getCanvaConnectionStatus } from '@/lib/canva/auth'
import { CanvaDisconnectButton } from './CanvaDisconnectButton'

const ERROR_MESSAGES: Record<string, string> = {
  oauth_init_failed: 'OAuth-Flow konnte nicht gestartet werden. Prüfe ob CANVA_CLIENT_ID und CANVA_CLIENT_SECRET in den Umgebungsvariablen gesetzt sind.',
  missing_code_or_state: 'Canva hat den OAuth-Flow ohne Code/State abgebrochen.',
  token_exchange_failed: 'Der Token-Austausch mit Canva ist fehlgeschlagen. Prüfe ob die Redirect-URL in der Canva-App korrekt eingetragen ist.',
  access_denied: 'Zugriff von Canva-Seite verweigert.',
  state_mismatch: 'Sicherheitscheck fehlgeschlagen (State-Mismatch). Bitte erneut versuchen.',
  pkce_missing: 'PKCE-Verifier fehlt — Cookie möglicherweise abgelaufen. Bitte erneut versuchen.',
}

interface CanvaSettingsPageProps {
  searchParams: { connected?: string; error?: string; detail?: string }
}

export default async function CanvaSettingsPage({ searchParams }: CanvaSettingsPageProps) {
  const session = await requireAuth()
  const status = await getCanvaConnectionStatus(session.user.id)

  const connectedJustNow = searchParams.connected === '1'
  const errorKey = searchParams.error
  const errorDetail = searchParams.detail
  const errorMessage = errorKey
    ? ERROR_MESSAGES[errorKey] ?? `Unbekannter Fehler: ${errorKey}`
    : null

  return (
    <div className="max-w-3xl">
      <Header
        title="Canva-Verbindung"
        subtitle="OAuth 2.0 (Read-Only). Verbinde dein Canva-Konto, damit Asset-Namen in den KI-Kontext einfließen."
      />

      {connectedJustNow && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          [OK] Canva erfolgreich verbunden.
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          [FAIL] {errorMessage}
          {errorDetail && (
            <div className="mt-1 text-xs font-mono opacity-80">{errorDetail}</div>
          )}
        </div>
      )}

      <div className="bg-white border border-stone rounded-xl p-5">
        {status.connected ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-nachtblau mb-1">Status</h3>
              <p className="text-sm text-stahlgrau">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                  Verbunden
                </span>
                Access-Token läuft ab am{' '}
                <strong>{status.expiresAt.toLocaleString('de-DE')}</strong>
              </p>
              <p className="text-xs text-stahlgrau mt-1">
                Scope: <code className="font-mono">{status.scope}</code> — wird automatisch
                refreshed (kein manuelles Eingreifen nötig).
              </p>
            </div>

            <div className="pt-3 border-t border-stone">
              <CanvaDisconnectButton />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-nachtblau mb-1">Status</h3>
              <p className="text-sm text-stahlgrau">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone text-stahlgrau mr-2">
                  Nicht verbunden
                </span>
                Verbinde dein Canva-Konto, um Ordner und Asset-Namen im Wizard auszuwählen.
              </p>
            </div>

            <div className="pt-3 border-t border-stone">
              <a
                href="/api/canva/oauth"
className="inline-flex items-center gap-2 bg-nachtblau hover:bg-tiefblau text-white text-sm font-semibold px-4 py-2 rounded-lg transition"              >
                Canva verbinden →
              </a>
              <p className="text-xs text-stahlgrau mt-2">
                Du wirst zu canva.com weitergeleitet und nach der Freigabe automatisch
                hierher zurückgeleitet.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-2">
        <p className="font-semibold">Voraussetzungen für die Canva-Verbindung:</p>
        <ol className="space-y-1.5 list-none">
          <li><span className="font-bold">1.</span> Canva-App anlegen unter{' '}
            <a href="https://www.canva.com/developers/" target="_blank" rel="noopener noreferrer" className="underline">
              canva.com/developers
            </a>{' '}→ &bdquo;Connect&ldquo; Integration aktivieren
          </li>
          <li><span className="font-bold">2.</span> Redirect-URL in der Canva-App eintragen:{' '}
            <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">
              {process.env.NEXTAUTH_URL ?? 'https://deine-domain.de'}/api/canva/oauth/callback
            </code>
          </li>
          <li><span className="font-bold">3.</span> In Coolify (Umgebungsvariablen) setzen:
            <code className="font-mono bg-blue-100 px-1 py-0.5 rounded mx-1">CANVA_CLIENT_ID</code> und
            <code className="font-mono bg-blue-100 px-1 py-0.5 rounded ml-1">CANVA_CLIENT_SECRET</code>
          </li>
        </ol>
      </div>

      <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        <strong>Scope &amp; Datenschutz:</strong> Vysible erhält nur Lese-Rechte
        (<code className="font-mono">asset:read</code>{' '}
        <code className="font-mono">design:meta:read</code>). Es werden keine
        Designs erstellt oder geändert. Tokens werden AES-256-verschlüsselt
        gespeichert und nie an den Browser oder in Logs ausgegeben.
      </div>
    </div>
  )
}
