import Link from 'next/link'

export default function WordPressSettingsPage() {
  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-nachtblau mb-1">WordPress-Verbindung</h2>
        <p className="text-sm text-stahlgrau">
          WordPress-Zugangsdaten werden pro Projekt konfiguriert, nicht global.
        </p>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 space-y-2">
        <p>
          <strong>Wo eintragen?</strong> Projekt öffnen &rarr; Einstellungen &rarr; Reiter{' '}
          <strong>Integrationen</strong> &rarr; WordPress.
        </p>
        <p>
          Dort können URL, Benutzername und Application Password (WP&nbsp;5.6+) pro Praxis
          hinterlegt und getestet werden.
        </p>
      </div>

      <Link
        href="/projects"
        className="inline-block px-4 py-2 bg-nachtblau hover:bg-tiefblau text-white text-sm font-semibold rounded-lg transition"
      >
        Zu den Projekten
      </Link>
    </div>
  )
}
