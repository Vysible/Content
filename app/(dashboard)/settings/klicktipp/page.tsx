import Link from 'next/link'

export default function KlickTippSettingsPage() {
  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-nachtblau mb-1">KlickTipp-Verbindung</h2>
        <p className="text-sm text-stahlgrau">
          KlickTipp-Integration ist derzeit nicht aktiv.
        </p>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-2">
        <p>
          <strong>Status:</strong> Die KlickTipp-API ist noch nicht öffentlich freigegeben.
          Die Anbindung wird aktiviert, sobald der API-Zugang verfügbar ist.
        </p>
        <p>
          Sobald die Integration verfügbar ist, werden Zugangsdaten{' '}
          <strong>pro Projekt</strong> konfiguriert — unter Projekt &rarr; Einstellungen &rarr;
          Integrationen.
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
