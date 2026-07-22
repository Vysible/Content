const STEPS = [
  {
    number: 1,
    title: 'Google Cloud Projekt öffnen',
    description: 'Gehe zu console.cloud.google.com und öffne das Projekt, das ihr auch für Google Ads nutzt (oder lege ein neues an).',
  },
  {
    number: 2,
    title: 'Google Analytics Data API aktivieren',
    description:
      'Navigation: APIs & Dienste → Bibliothek → "Google Analytics Data API" suchen → Aktivieren.',
  },
  {
    number: 3,
    title: 'OAuth-Scope für GA4 ergänzen',
    description:
      'Falls ihr bereits OAuth-Credentials für Google Ads habt: denselben Client ID / Secret verwenden. Beim Generieren des Refresh Tokens (OAuth Playground) den Scope "https://www.googleapis.com/auth/analytics.readonly" hinzufügen.',
  },
  {
    number: 4,
    title: 'Refresh Token generieren',
    description:
      'OAuth Playground öffnen (developers.google.com/oauthplayground) → Scope "analytics.readonly" eingeben → "Authorize APIs" → mit dem Vysible-Google-Account einloggen → "Exchange authorization code for tokens" → Refresh Token kopieren.',
  },
  {
    number: 5,
    title: 'Token in Coolify hinterlegen',
    description:
      'In Coolify: App öffnen → Umgebungsvariablen → Neue Variable: Name GA4_REFRESH_TOKEN, Wert = kopierter Refresh Token. App neu starten. GA4_CLIENT_ID und GA4_CLIENT_SECRET nur eintragen, wenn ihr andere Credentials als für Google Ads verwendet.',
  },
  {
    number: 6,
    title: 'GA4 Property-ID pro Projekt eintragen',
    description:
      'In Google Analytics: Verwaltung → Property → Property-Details → Property-ID (z. B. 123456789). Nur die Zahl eintragen — ohne "properties/" davor. Einmal pro Projekt.',
  },
]

export function GA4SetupGuide() {
  return (
    <div className="bg-white border border-stone rounded-xl p-6 mt-6">
      <h3 className="text-sm font-semibold text-nachtblau mb-1">
        Einrichtung — Schritt für Schritt
      </h3>
      <p className="text-xs text-stahlgrau mb-5">
        Einmalige Einrichtung mit eurem Vysible-Google-Account. Danach habt ihr automatisch Zugriff auf alle GA4-Properties, auf die dieser Account Zugriff hat — kein manuelles Einladen pro Kunden nötig.
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
        <strong className="text-nachtblau">Tipp:</strong> Voraussetzung ist, dass euer Vysible-Google-Account in den jeweiligen GA4-Konten als Betrachter eingetragen ist. Das ist einmalig pro Kunden-Konto nötig — danach gelten alle neuen Properties automatisch.
      </div>
    </div>
  )
}
