const STEPS = [
  {
    number: 1,
    title: 'Google Ads Developer-Token beantragen',
    description:
      'In deinem Google Ads Konto: Werkzeuge → API-Center → Entwickler-Token beantragen. Kann einige Tage dauern.',
  },
  {
    number: 2,
    title: 'OAuth-App in Google Cloud anlegen',
    description:
      'console.cloud.google.com → APIs & Dienste → Anmeldedaten → OAuth-Client-ID erstellen (Typ: Desktop-App oder Web). Client-ID und Client-Secret notieren.',
  },
  {
    number: 3,
    title: 'Google Ads API aktivieren',
    description:
      'In der Google Cloud Console: APIs & Dienste → Bibliothek → "Google Ads API" suchen und aktivieren.',
  },
  {
    number: 4,
    title: 'Refresh-Token generieren',
    description:
      'OAuth Playground (developers.google.com/oauthplayground) → Scope: https://www.googleapis.com/auth/adwords → Autorisieren → Refresh Token kopieren. Oder via OAuth-Flow mit dem Agentur-Account.',
  },
  {
    number: 5,
    title: 'Zugangsdaten in Coolify hinterlegen',
    description:
      'Vier Umgebungsvariablen setzen: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN. App neu starten.',
  },
  {
    number: 6,
    title: 'Customer-ID pro Projekt eintragen',
    description:
      'In Google Ads oben rechts sichtbar (Format: 123-456-7890). Hier im Feld eintragen.',
  },
]

export function GoogleAdsSetupGuide() {
  return (
    <div className="bg-white border border-stone rounded-xl p-6 mt-6">
      <h3 className="text-sm font-semibold text-nachtblau mb-1">
        Einrichtung — Schritt für Schritt
      </h3>
      <p className="text-xs text-stahlgrau mb-5">
        Einmalige Einrichtung. Danach wird die Customer-ID pro Projekt hinterlegt.
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
        <strong className="text-nachtblau">Tipp:</strong> Die Customer-ID steht in Google Ads oben
        rechts im Format <strong>123-456-7890</strong>. Beim Speichern werden Bindestriche
        automatisch entfernt.
      </div>
    </div>
  )
}
