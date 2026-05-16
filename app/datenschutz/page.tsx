import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung – Vysible',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-stahlgrau mb-2">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-anthrazit leading-relaxed">{children}</p>
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside text-sm text-anthrazit leading-relaxed space-y-0.5 ml-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

export default function DatenschutzPage() {
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
          <h1 className="text-xl font-bold text-nachtblau mb-2">Datenschutzerklärung</h1>
          <p className="text-xs text-stahlgrau mb-8">Stand: Oktober 2023</p>

          <div className="space-y-8 text-sm text-anthrazit leading-relaxed">

            <P>
              Nachfolgend erhalten Sie Informationen über die Erhebung personenbezogener Daten bei
              Nutzung unserer Internetseite. Zu den personenbezogenen Daten gehören alle Daten, die
              auf Sie persönlich beziehbar sind (z.&nbsp;B. Name, Adresse, E-Mail-Adressen,
              Nutzerverhalten, IP-Adresse).
            </P>

            <Section title="Verantwortlicher (Art. 4 Abs. 7 DSGVO)">
              <P>
                Vysible communication<br />
                Vanessa Kohnert<br />
                Im Gemeindegrund 14<br />
                46147 Oberhausen<br />
                <a href="mailto:kontakt@vysible.de" className="text-cognac hover:underline">
                  kontakt@vysible.de
                </a>
              </P>
              <P>
                Datenschutzbeauftragte/r: Vanessa Kohnert (gleiche Anschrift)
              </P>
            </Section>

            <Section title="Sicherheit und Schutz Ihrer personenbezogenen Daten">
              <P>
                Wir betrachten es als unsere vorrangige Aufgabe, die Vertraulichkeit der von Ihnen
                bereitgestellten personenbezogenen Daten zu wahren und diese vor unbefugten
                Zugriffen zu schützen. Als privatrechtliches Unternehmen unterliegen wir den
                Bestimmungen der europäischen Datenschutzgrundverordnung (DSGVO) und den
                Regelungen des Bundesdatenschutzgesetzes (BDSG).
              </P>
            </Section>

            <Section title="Begriffsbestimmungen">
              <P>
                <strong>Personenbezogene Daten:</strong> Alle Informationen, die sich auf eine
                identifizierte oder identifizierbare natürliche Person beziehen.
              </P>
              <P>
                <strong>Verarbeitung:</strong> Jeder Vorgang im Zusammenhang mit personenbezogenen
                Daten wie Erheben, Erfassen, Speichern, Anpassen, Lesen, Nutzen, Übermitteln oder
                Löschen.
              </P>
              <P>
                <strong>Einschränkung der Verarbeitung:</strong> Markierung gespeicherter
                personenbezogener Daten mit dem Ziel, ihre künftige Verarbeitung einzuschränken.
              </P>
              <P>
                <strong>Profiling:</strong> Automatisierte Verarbeitung personenbezogener Daten zur
                Bewertung bestimmter persönlicher Aspekte einer natürlichen Person.
              </P>
              <P>
                <strong>Pseudonymisierung:</strong> Verarbeitung personenbezogener Daten in einer
                Weise, dass die Daten ohne Hinzuziehung zusätzlicher Informationen nicht mehr einer
                spezifischen Person zugeordnet werden können.
              </P>
            </Section>

            <Section title="Rechtmäßigkeit der Verarbeitung">
              <P>
                Die Verarbeitung personenbezogener Daten ist nur rechtmäßig, wenn eine
                Rechtsgrundlage besteht. Rechtsgrundlagen gemäß Art. 6 Abs. 1 lit. a–f DSGVO:
              </P>
              <Ul items={[
                'Einwilligung der betroffenen Person (lit. a)',
                'Erfüllung eines Vertrags (lit. b)',
                'Erfüllung einer rechtlichen Verpflichtung (lit. c)',
                'Schutz lebenswichtiger Interessen (lit. d)',
                'Wahrnehmung einer Aufgabe im öffentlichen Interesse (lit. e)',
                'Wahrung berechtigter Interessen des Verantwortlichen (lit. f)',
              ]} />
            </Section>

            <Section title="Erhebung personenbezogener Daten">
              <P>
                (1) Wir erheben personenbezogene Daten von Interessenten und Nutzern unserer
                Internetseite sowie natürlichen Personen, die in Kontakt mit uns stehen.
              </P>
              <P>
                (2) Bei einer Kontaktaufnahme per E-Mail oder über ein Kontaktformular werden die
                mitgeteilten Daten (E-Mail-Adresse, ggf. Name, Telefonnummer) gespeichert, um Ihre
                Fragen zu beantworten. Die Daten werden gelöscht, sobald die Speicherung nicht mehr
                erforderlich ist. Dritten werden diese Daten nicht zugänglich gemacht.
              </P>
              <P>
                (3) Angaben zu Kindern erheben wir nur, wenn diese durch Erziehungsberechtigte
                vorgestellt werden.
              </P>
            </Section>

            <Section title="Erhebung von Daten bei Besuch unserer Website">
              <P>
                Bei der informatorischen Nutzung der Website erheben wir nur die personenbezogenen
                Daten, die Ihr Browser an unseren Server übermittelt (Rechtsgrundlage:
                Art. 6 Abs. 1 S. 1 lit. f DSGVO):
              </P>
              <Ul items={[
                'IP-Adresse',
                'Datum und Uhrzeit der Anfrage',
                'Zeitzonendifferenz zur GMT',
                'Inhalt der Anforderung (konkrete Seite)',
                'Zugriffsstatus / HTTP-Statuscode',
                'Übertragene Datenmenge',
                'Referrer URL (zuvor besuchte Seite)',
                'Browser, Betriebssystem, Sprache und Browserversion',
              ]} />
            </Section>

            <Section title="Ihre Rechte">
              <P>Sie haben uns gegenüber folgende Rechte:</P>
              <Ul items={[
                'Recht auf Berichtigung und Löschung',
                'Recht auf Auskunft',
                'Recht auf Einschränkung der Verarbeitung',
                'Recht auf Datenübertragbarkeit',
                'Recht auf Widerspruch gegen die Verarbeitung',
              ]} />
              <P>
                Aufsichtsbehörde: Der Landesbeauftragte für den Datenschutz und die
                Informationsfreiheit NRW · Postfach 20 04 44 · 40102 Düsseldorf ·
                Tel. +49 (0)211 38424–0
              </P>
            </Section>

            <Section title="Rechte der betroffenen Personen">
              <P>
                (1) Recht auf Auskunft über verarbeitete Daten sowie Kopie der Daten
                (Art. 15 DSGVO).
              </P>
              <P>
                (2) Recht auf Vervollständigung oder Berichtigung unrichtiger Daten
                (Art. 16 DSGVO).
              </P>
              <P>
                (3) Recht auf Löschung oder Einschränkung der Verarbeitung (Art. 17/18 DSGVO).
              </P>
              <P>
                (4) Recht auf Datenübertragbarkeit und Übermittlung an andere Verantwortliche
                (Art. 20 DSGVO).
              </P>
              <P>
                (5) Recht auf Beschwerde bei der zuständigen Aufsichtsbehörde (Art. 77 DSGVO).
              </P>
            </Section>

            <Section title="Widerrufsrecht">
              <P>
                Sie haben das Recht, erteilte Einwilligungen gem. Art. 7 Abs. 3 DSGVO mit Wirkung
                für die Zukunft jederzeit zu widerrufen.
              </P>
            </Section>

            <Section title="Widerspruchsrecht">
              <P>
                Sie können der künftigen Verarbeitung der Sie betreffenden Daten nach Maßgabe des
                Art. 21 DSGVO jederzeit widersprechen, insbesondere gegen die Verarbeitung für
                Zwecke der Direktwerbung.
              </P>
            </Section>

            <Section title="Einsatz von Cookies">
              <P>
                (1) Bei der Nutzung unserer Website werden Cookies auf Ihrem Rechner gespeichert.
                Cookies sind kleine Textdateien, die auf Ihrer Festplatte dem von Ihnen verwendeten
                Browser zugeordnet gespeichert werden. Sie können keine Programme ausführen oder
                Viren übertragen.
              </P>
              <P>
                (2) Diese Website nutzt technisch notwendige Session-Cookies (transiente Cookies),
                die automatisch gelöscht werden, wenn Sie den Browser schließen oder sich
                ausloggen. Persistente Cookies werden nach einer vorgegebenen Dauer automatisch
                gelöscht. Sie können Cookies in den Sicherheitseinstellungen Ihres Browsers
                jederzeit löschen.
              </P>
            </Section>

            <Section title="Server-Log-Files">
              <P>
                Der Provider erhebt und speichert automatisch Informationen in Server-Log-Files:
              </P>
              <Ul items={[
                'Browsertyp und -version',
                'Verwendetes Betriebssystem',
                'Referrer URL',
                'Hostname des zugreifenden Rechners',
                'Uhrzeit der Serveranfrage',
              ]} />
              <P>
                Diese Daten sind nicht bestimmten Personen zuzuordnen. Eine Zusammenführung mit
                anderen Datenquellen wird nicht vorgenommen.
              </P>
            </Section>

            <Section title="Datensicherheit">
              <P>
                Diese Seite nutzt aus Gründen der Sicherheit eine SSL-Verschlüsselung. Eine
                verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers
                von „http://“ auf „https://“ wechselt.
              </P>
            </Section>

            <Section title="Google Analytics">
              <P>
                Diese Website benutzt Google Analytics (Google Ireland Ltd., Gordon House, Barrow
                Street, Dublin 4, Irland). Google Analytics verwendet Cookies zur Analyse der
                Benutzung der Website. Die erzeugten Informationen werden in der Regel an einen
                Server von Google in den USA übertragen und dort gespeichert. IP-Anonymisierung
                ist aktiviert. Rechtsgrundlage: Art. 6 Abs. 1 S. 1 lit. f DSGVO. Opt-out:{' '}
                <a
                  href="http://tools.google.com/dlpage/gaoptout?hl=de"
                  className="text-cognac hover:underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  tools.google.com/dlpage/gaoptout
                </a>
                . Wir haben mit Google einen Vertrag zur Auftragsdatenverarbeitung geschlossen.
              </P>
            </Section>

            <Section title="Google Tag Manager">
              <P>
                Diese Website benutzt den Google Tag Manager. Der Google Tag Manager selbst setzt
                keine Cookies und erfasst keine personenbezogenen Daten. Er sorgt für die
                Auslösung anderer Tags, die ihrerseits unter Umständen Daten erfassen.
              </P>
            </Section>

            <Section title="Google Ads">
              <P>
                Der Websitebetreiber verwendet Google Ads (Google Ireland Limited). Google Ads
                ermöglicht Werbeanzeigen in der Google-Suchmaschine oder auf Drittwebseiten.
                Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TTDSG. Die
                Einwilligung ist jederzeit widerrufbar. Datenübertragung in die USA erfolgt auf
                Basis der Standardvertragsklauseln der EU-Kommission.
              </P>
            </Section>

            <Section title="Meta-Pixel (ehemals Facebook Pixel)">
              <P>
                Diese Website nutzt den Besucheraktions-Pixel von Facebook/Meta (Meta Platforms
                Ireland Limited, 4 Grand Canal Square, Dublin 2, Irland). Rechtsgrundlage:
                Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TTDSG. Die Einwilligung ist jederzeit
                widerrufbar. Die Datenübertragung in die USA erfolgt auf Basis der
                Standardvertragsklauseln der EU-Kommission. Wir sind mit Meta gemeinsam
                Verantwortliche für die Erfassung der Daten (Art. 26 DSGVO).
              </P>
              <P>
                Datenschutzerklärung Meta:{' '}
                <a
                  href="https://de-de.facebook.com/about/privacy/"
                  className="text-cognac hover:underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  de-de.facebook.com/about/privacy
                </a>
              </P>
            </Section>

            <Section title="Hotjar">
              <P>
                Diese Website nutzt Hotjar (Hotjar Ltd., Level 2, St Julians Business Centre,
                3 Elia Zammit Street, St Julians STJ 1000, Malta). Hotjar analysiert das
                Nutzerverhalten (Maus- und Scrollbewegungen, Klicks, Heatmaps). Rechtsgrundlage:
                Art. 6 Abs. 1 lit. a DSGVO / Art. 6 Abs. 1 lit. f DSGVO. Opt-out:{' '}
                <a
                  href="https://www.hotjar.com/policies/do-not-track/"
                  className="text-cognac hover:underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  hotjar.com/policies/do-not-track
                </a>
              </P>
            </Section>

            <Section title="Nutzung von Zapier und Make">
              <P>
                Wir nutzen die Automatisierungstools Zapier und Make, um bestimmte Prozesse zu
                automatisieren. Diese Tools agieren als Auftragsverarbeiter gemäß Art. 28 DSGVO.
                Datenschutzrichtlinien:{' '}
                <a href="https://zapier.com/privacy" className="text-cognac hover:underline" target="_blank" rel="noopener noreferrer">
                  Zapier
                </a>{' '}
                ·{' '}
                <a href="https://www.make.com/en/privacy-notice" className="text-cognac hover:underline" target="_blank" rel="noopener noreferrer">
                  Make
                </a>
                . Wir haben einen Vertrag über Auftragsverarbeitung (AVV) geschlossen.
              </P>
            </Section>

            <Section title="Klick-Tipp">
              <P>
                Wir nutzen Klick-Tipp für unser E-Mail-Marketing (KLICK-TIPP LIMITED,
                15 Cambridge Court, 210 Shepherd’s Bush Road, London W6 7NJ, UK). Eingegebene
                Daten (E-Mail-Adresse, Name) werden an Klick-Tipp übermittelt und in Deutschland
                gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO. Weitere Informationen:{' '}
                <a
                  href="https://www.klicktipp.com/de/datenschutzerklarung"
                  className="text-cognac hover:underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  klicktipp.com/de/datenschutzerklarung
                </a>
              </P>
            </Section>

            <Section title="Kontaktformular">
              <P>
                Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden die
                mitgeteilten Daten (E-Mail-Adresse, Name, Telefonnummer) gespeichert, um Ihre
                Fragen zu beantworten. Diese Daten werden gelöscht, sobald sie nicht mehr
                benötigt werden. Dritten werden sie nicht zugänglich gemacht.
              </P>
            </Section>

            <Section title="Aktualität dieser Datenschutzerklärung">
              <P>
                Diese Datenschutzerklärung ist aktuell gültig und hat den Stand Oktober 2023. Durch
                die Weiterentwicklung unserer Website kann es notwendig werden, diese
                Datenschutzerklärung zu ändern. Die jeweils aktuelle Version ist unter{' '}
                <a href="https://vysible.cloud/datenschutz" className="text-cognac hover:underline">
                  vysible.cloud/datenschutz
                </a>{' '}
                abrufbar.
              </P>
            </Section>

          </div>
        </div>
      </div>
    </main>
  )
}
