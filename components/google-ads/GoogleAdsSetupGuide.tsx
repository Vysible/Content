export function GoogleAdsSetupGuide() {
  return (
    <div className="mt-5 p-4 bg-stone/20 rounded-lg space-y-3">
      <p className="text-xs font-semibold text-nachtblau">Wo finde ich die Customer-ID?</p>
      <ol className="space-y-2">
        <li className="flex gap-2 text-xs text-stahlgrau leading-relaxed">
          <span className="flex-shrink-0 font-semibold text-nachtblau">1.</span>
          <span>Google Ads öffnen und oben rechts auf den Kontonamen klicken</span>
        </li>
        <li className="flex gap-2 text-xs text-stahlgrau leading-relaxed">
          <span className="flex-shrink-0 font-semibold text-nachtblau">2.</span>
          <span>Die <strong className="text-nachtblau">Customer-ID</strong> steht direkt darunter im Format <code className="bg-stone/40 px-1 rounded">123-456-7890</code></span>
        </li>
        <li className="flex gap-2 text-xs text-stahlgrau leading-relaxed">
          <span className="flex-shrink-0 font-semibold text-nachtblau">3.</span>
          <span>Wichtig: die ID des <strong className="text-nachtblau">Kundenkontos</strong> eintragen — nicht die des Manager-Kontos (MCC)</span>
        </li>
      </ol>
      <p className="text-xs text-stahlgrau">
        Bindestriche werden beim Speichern automatisch entfernt.
      </p>
    </div>
  )
}
