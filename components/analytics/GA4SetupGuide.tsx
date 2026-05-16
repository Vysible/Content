const STEPS = [
  {
    number: 1,
    title: 'Google Cloud Projekt öffnen',
    description: 'Gehe zu console.cloud.google.com und wähle dein Projekt (oder lege ein neues an).',
  },
  {
    number: 2,
    title: 'Service Account anlegen',
    description:
      'Navigation: IAM & Verwaltung → Dienstkonten → Dienstkonto erstellen. Name z. B. "vysible-analytics". Keine Rolle nötig. Abschließen.',
  },
  {
    number: 3,
    title: 'JSON-Schlüssel herunterladen',
    description:
      'Dienstkonto anklicken → Tab "Schlüssel" → Schlüssel hinzufügen → Neuen Schlüssel erstellen → JSON. Die heruntergeladene Datei enthält alles was Vysible braucht.',
  },
  {
    number: 4,
    title: 'Service Account in GA4 als Betrachter eintragen',
    description:
      'In Google Analytics: Verwaltung (Zahnrad) → Property → Property-Zugriffsmanagement → Nutzer hinzufügen (+). E-Mail-Adresse des Service Accounts eintragen (steht im JSON als "client_email"), Rolle "Betrachter" wählen.',
  },
  {
    number: 5,
    title: 'JSON in Coolify hinterlegen',
    description:
      'In Coolify: App öffnen → Umgebungsvariablen → Neue Variable: Name GA4_SERVICE_ACCOUNT_JSON, Wert = gesamter Inhalt der JSON-Datei (als eine Zeile oder mehrzeilig). App neu starten.',
  },
  {
    number: 6,
    title: 'GA4 Property-ID eintragen',
    description:
      'In Google Analytics: Verwaltung → Property → Property-Details → Property-ID (z. B. 123456789). Hier in das Feld "properties/123456789" eintragen und speichern.',
  },
]

export function GA4SetupGuide() {
  return (
    <div className="bg-white border border-stone rounded-xl p-6 mt-6">
      <h3 className="text-sm font-semibold text-nachtblau mb-1">
        Einrichtung — Schritt für Schritt
      </h3>
      <p className="text-xs text-stahlgrau mb-5">
        Einmalige Einrichtung. Danach werden alle Projekte über denselben Service Account abgerufen.
      </p>

      <ol className="space-y-4">
        {STEPS.map((step) => (
          <li key={step.number} className="flex gap-4">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-nachtblau text-creme text-xs font-bold flex items-center justify-center mt-0.5">
              {step.number}
            </span>
            <div>
              <p className="text-sm font-medium text-nachtblau">{step.title}</p>
              <p className="text-xs text-stahlgrau mt-0.5 leading-relaxed">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 p-3 bg-stone/20 rounded-lg text-xs text-stahlgrau leading-relaxed">
        <strong className="text-nachtblau">Tipp:</strong> Die Property-ID steht auch direkt in der
        GA4-URL: analytics.google.com/analytics/web/#/p<strong>123456789</strong>/…
      </div>
    </div>
  )
}
