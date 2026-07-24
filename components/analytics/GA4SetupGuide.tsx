export function GA4SetupGuide() {
  return (
    <div className="mt-5 p-4 bg-stone/20 rounded-lg space-y-3">
      <p className="text-xs font-semibold text-nachtblau">Wo finde ich die Property-ID?</p>
      <ol className="space-y-2">
        <li className="flex gap-2 text-xs text-stahlgrau leading-relaxed">
          <span className="flex-shrink-0 font-semibold text-nachtblau">1.</span>
          <span>Google Analytics öffnen → unten links auf <strong className="text-nachtblau">Verwaltung</strong> (Zahnrad) klicken</span>
        </li>
        <li className="flex gap-2 text-xs text-stahlgrau leading-relaxed">
          <span className="flex-shrink-0 font-semibold text-nachtblau">2.</span>
          <span>Spalte <strong className="text-nachtblau">Property</strong> → <strong className="text-nachtblau">Property-Details</strong></span>
        </li>
        <li className="flex gap-2 text-xs text-stahlgrau leading-relaxed">
          <span className="flex-shrink-0 font-semibold text-nachtblau">3.</span>
          <span>Die <strong className="text-nachtblau">Property-ID</strong> steht oben rechts — nur die Zahl eintragen, z. B. <code className="bg-stone/40 px-1 rounded">123456789</code></span>
        </li>
      </ol>
      <p className="text-xs text-stahlgrau">
        Voraussetzung: der Vysible-Google-Account muss in diesem GA4-Konto als Betrachter eingetragen sein.
      </p>
    </div>
  )
}
