import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum – Vysible',
}

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-creme px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-xs text-stahlgrau hover:text-cognac transition mb-8"
        >
          ← Zurück zur Anmeldung
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-stone p-8">
          <h1 className="text-xl font-bold text-nachtblau mb-8">Impressum</h1>

          <div className="space-y-6 text-sm text-anthrazit leading-relaxed">

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stahlgrau mb-2">
                Inhaltlich verantwortlich
              </h2>
              <p>Vanessa Kohnert</p>
              <p className="mt-1">
                Im Gemeindegrund 14<br />
                46147 Oberhausen<br />
                <a href="mailto:kontakt@vysible.de" className="text-cognac hover:underline">
                  kontakt@vysible.de
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stahlgrau mb-2">
                Konzept und Design
              </h2>
              <p>VYSIBLE communication</p>
              <p className="mt-2">
                Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die
                Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich
                deren Betreiber verantwortlich. Wir sind bemüht, das vorliegende Webangebot stets
                aktuell und inhaltlich richtig sowie vollständig anzubieten. Dennoch ist das
                Auftreten von Fehlern nicht völlig auszuschließen. Wir übernehmen keine Haftung
                für die Aktualität, die inhaltliche Richtigkeit sowie für die Vollständigkeit der
                in unserem Webangebot eingestellten Informationen, es sei denn die Fehler wurden
                vorsätzlich oder grob fahrlässig aufgenommen.
              </p>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stahlgrau mb-2">
                Copyright
              </h2>
              <p>Die Inhalte dieser Internet-Seiten sind urheberrechtlich geschützt.</p>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stahlgrau mb-2">
                1. Gespeicherte Daten
              </h2>
              <p>
                Unvermeidlich ist, dass in den Serverstatistiken automatisch solche Daten
                gespeichert werden, die Ihr Browser uns übermittelt. Dies sind Browsertyp und
                Browserversion, das verwendete Betriebssystem, die Referrer URL (die zuvor
                besuchte Seite), der Hostname des zugreifenden Rechners (IP-Adresse) sowie die
                Uhrzeit der Serveranfrage. Diese Speicherung dient lediglich internen
                systembezogenen und statistischen Zwecken. Weitergehende personenbezogene Daten
                werden nur erfasst, wenn Sie diese Angaben freiwillig, etwa im Rahmen einer
                Anfrage und der Registrierung, machen.
              </p>
              <p className="mt-2">
                Die Verwendung der Kontaktdaten des Impressums zur gewerblichen Werbung ist
                ausdrücklich nicht erwünscht, es sei denn der Anbieter hatte zuvor seine
                schriftliche Einwilligung erteilt oder es besteht bereits eine
                Geschäftsbeziehung.
              </p>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stahlgrau mb-2">
                2. Nutzung und Weitergabe personenbezogener Daten
              </h2>
              <p>
                Soweit Sie uns personenbezogene Daten zur Verfügung gestellt haben, verwenden wir
                diese nur zur Beantwortung Ihrer Anfragen, zur Abwicklung mit uns geschlossener
                Verträge und für die technische Administration. Ihre personenbezogenen Daten
                werden an Dritte nur weitergegeben oder sonst übermittelt, wenn dies zum Zwecke
                der Vertragsabwicklung erforderlich ist, wenn dies zu Abrechnungszwecken
                erforderlich ist, oder Sie zuvor eingewilligt haben. Sie haben das Recht, eine
                erteilte Einwilligung mit Wirkung für die Zukunft jederzeit zu widerrufen.
              </p>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stahlgrau mb-2">
                3. Auskunftsrecht
              </h2>
              <p>
                Gerne geben wir Ihnen Auskunft über die bei uns gespeicherten persönlichen Daten.
                Wenn Sie Fragen zur Behandlung Ihrer Daten haben, genügt eine E-Mail an{' '}
                <a href="mailto:kontakt@vysible.de" className="text-cognac hover:underline">
                  kontakt@vysible.de
                </a>
                .
              </p>
            </section>

            <p className="text-xs text-stahlgrau border-t border-stone pt-4">
              Dieses Impressum gilt auch für die Plattformen: Facebook, Instagram, Youtube
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
