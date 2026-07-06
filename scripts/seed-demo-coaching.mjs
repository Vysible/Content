/**
 * Demo-Datensatz für den Coaching-Bereich.
 * Erstellt ein Beispielprojekt "Coaching Demo" mit Themen, Texten und einem Portal-Link.
 *
 * Aufruf: node scripts/seed-demo-coaching.mjs
 * Passwort für das Portal: coaching2026
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ── Hilfsdaten ──────────────────────────────────────────────────────────────

const MONTHS = ['2026-07', '2026-08', '2026-09']

const THEMES = [
  // ── Juli ──
  { monat: '2026-07', kanal: 'BLOG', thema: 'Innere Blockaden', seoTitel: 'Innere Blockaden auflösen: 5 Coaching-Methoden die wirklich funktionieren', kategorie: 'Persönlichkeitsentwicklung', zielgruppe: 'Berufstätige mit Wachstumswunsch', funnelStufe: 'Awareness', keywordPrimaer: 'innere blockaden auflösen', keywordSekundaer: ['coaching blockaden', 'selbstlimitierende glaubenssätze'], paaFragen: ['Was sind innere Blockaden?', 'Wie entstehen Glaubenssätze?'], contentWinkel: 'Praktische Anleitung', cta: 'Erstgespräch buchen', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-07', kanal: 'NEWSLETTER', thema: 'Sommerimpuls', seoTitel: 'Sommerimpuls: Nutzen Sie die ruhigen Wochen für Ihre Transformation', kategorie: 'Persönlichkeitsentwicklung', zielgruppe: 'Bestandskunden', funnelStufe: 'Retention', keywordPrimaer: 'coaching sommer', keywordSekundaer: [], paaFragen: ['Wie nutze ich freie Zeit für Wachstum?'], contentWinkel: 'Motivierender Impuls', cta: 'Intensiv-Coaching buchen', prioritaet: 'Mittel', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-07', kanal: 'SOCIAL_INSTAGRAM', thema: 'Blockaden-Zitat', seoTitel: 'Deine Gedanken sind nicht deine Grenzen — sie sind dein Ausgangspunkt', kategorie: 'Motivation', zielgruppe: 'Allgemein', funnelStufe: 'Awareness', keywordPrimaer: 'coaching motivation', keywordSekundaer: [], paaFragen: ['Was bedeutet Wachstumsmindset?'], contentWinkel: 'Inspirierendes Zitat + Kontext', cta: 'Profil besuchen', prioritaet: 'Mittel', positionierungGenutzt: false, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-07', kanal: 'SOCIAL_INSTAGRAM', thema: 'Coaching-Methode', seoTitel: 'Was ist die GROW-Methode? So strukturieren Coaches ein Gespräch', kategorie: 'Coaching-Wissen', zielgruppe: 'Interessierte', funnelStufe: 'Consideration', keywordPrimaer: 'grow methode coaching', keywordSekundaer: [], paaFragen: ['Wie läuft ein Coaching-Gespräch ab?'], contentWinkel: 'Erklärpost', cta: 'DM für Erstgespräch', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: true },
  { monat: '2026-07', kanal: 'SOCIAL_INSTAGRAM', thema: 'Kundenstimme', seoTitel: 'Von der Erschöpfung zur Klarheit: Marias Geschichte in 4 Sitzungen', kategorie: 'Social Proof', zielgruppe: 'Skeptische Interessierte', funnelStufe: 'Consideration', keywordPrimaer: 'coaching erfahrung', keywordSekundaer: [], paaFragen: ['Wie lange dauert Coaching?'], contentWinkel: 'Testimonial-Story', cta: 'Deine Geschichte beginnt hier', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-07', kanal: 'SOCIAL_INSTAGRAM', thema: 'Selbst-Check', seoTitel: '5 Zeichen, dass du jetzt Coaching brauchst — erkennst du dich wieder?', kategorie: 'Lead-Generierung', zielgruppe: 'Zögernde', funnelStufe: 'Decision', keywordPrimaer: 'coaching wann sinnvoll', keywordSekundaer: [], paaFragen: ['Für wen ist Coaching geeignet?'], contentWinkel: 'Interaktiver Selbst-Check', cta: 'Erstgespräch vereinbaren', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: true },
  { monat: '2026-07', kanal: 'SOCIAL_LINKEDIN', thema: 'Führung & Coaching', seoTitel: 'Warum die besten Führungskräfte regelmäßig gecoachet werden', kategorie: 'Business Coaching', zielgruppe: 'Führungskräfte', funnelStufe: 'Awareness', keywordPrimaer: 'führungskräfte coaching', keywordSekundaer: ['executive coaching'], paaFragen: ['Was bringt Coaching für Führungskräfte?'], contentWinkel: 'Thought Leadership', cta: 'Vernetzen und austauschen', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-07', kanal: 'SOCIAL_LINKEDIN', thema: 'ROI von Coaching', seoTitel: 'Der ROI von Coaching: Was Studien über Rendite und Wirksamkeit zeigen', kategorie: 'Business Coaching', zielgruppe: 'HR-Entscheider', funnelStufe: 'Consideration', keywordPrimaer: 'coaching wirksamkeit studie', keywordSekundaer: [], paaFragen: ['Lohnt sich Coaching finanziell?'], contentWinkel: 'Datenbasierter Artikel', cta: 'Kommentieren & diskutieren', prioritaet: 'Mittel', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },

  // ── August ──
  { monat: '2026-08', kanal: 'BLOG', thema: 'Burnout-Prävention', seoTitel: 'Burnout erkennen und verhindern: Ein Coaching-Leitfaden für Berufstätige', kategorie: 'Burnout-Prävention', zielgruppe: 'Gestresste Berufstätige', funnelStufe: 'Awareness', keywordPrimaer: 'burnout verhindern coaching', keywordSekundaer: ['burnout prävention', 'erschöpfung coaching'], paaFragen: ['Wie erkenne ich einen drohenden Burnout?', 'Was kann ich gegen Burnout tun?'], contentWinkel: 'Präventiver Ratgeber', cta: 'Kostenfreies Erstgespräch', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-08', kanal: 'NEWSLETTER', thema: 'Herbst-Momentum', seoTitel: 'Herbst-Momentum: Starten Sie in die zweite Jahreshälfte mit neuer Energie', kategorie: 'Persönlichkeitsentwicklung', zielgruppe: 'Bestandskunden', funnelStufe: 'Retention', keywordPrimaer: 'coaching herbst', keywordSekundaer: [], paaFragen: ['Wie starte ich motiviert in den Herbst?'], contentWinkel: 'Saisonaler Impuls', cta: 'Herbst-Intensivprogramm', prioritaet: 'Mittel', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-08', kanal: 'SOCIAL_INSTAGRAM', thema: 'Energie-Routine', seoTitel: 'Meine Morgenroutine als Coach: So starte ich mit voller Energie in den Tag', kategorie: 'Lifestyle', zielgruppe: 'Allgemein', funnelStufe: 'Awareness', keywordPrimaer: 'morgenroutine produktivität', keywordSekundaer: [], paaFragen: ['Wie verbessert eine Morgenroutine den Tag?'], contentWinkel: 'Persönlicher Einblick', cta: 'Speichern & ausprobieren', prioritaet: 'Mittel', positionierungGenutzt: false, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-08', kanal: 'SOCIAL_INSTAGRAM', thema: 'Burnout-Check', seoTitel: '7 frühe Warnsignale für Burnout — Nummer 4 übersehen die meisten', kategorie: 'Burnout-Prävention', zielgruppe: 'Berufstätige', funnelStufe: 'Awareness', keywordPrimaer: 'burnout symptome früh', keywordSekundaer: [], paaFragen: ['Was sind frühe Burnout-Zeichen?'], contentWinkel: 'Aufmerksamkeits-Post', cta: 'Kommentiere mit deiner Erfahrung', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: true },
  { monat: '2026-08', kanal: 'SOCIAL_INSTAGRAM', thema: 'Veränderung', seoTitel: 'Veränderung beginnt mit einer Entscheidung — nicht mit perfekten Umständen', kategorie: 'Motivation', zielgruppe: 'Allgemein', funnelStufe: 'Decision', keywordPrimaer: 'veränderung coaching', keywordSekundaer: [], paaFragen: ['Wie fange ich mit Veränderung an?'], contentWinkel: 'Motivationspost', cta: 'Erstgespräch buchen', prioritaet: 'Mittel', positionierungGenutzt: false, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-08', kanal: 'SOCIAL_INSTAGRAM', thema: 'Coaching-Prozess', seoTitel: 'So läuft ein 3-Monats-Coaching-Programm bei mir ab — Schritt für Schritt', kategorie: 'Angebot', zielgruppe: 'Interessierte', funnelStufe: 'Consideration', keywordPrimaer: 'coaching programm ablauf', keywordSekundaer: [], paaFragen: ['Was passiert in einem Coaching-Paket?'], contentWinkel: 'Transparenz über Prozess', cta: 'Programmdetails anfragen', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-08', kanal: 'SOCIAL_LINKEDIN', thema: 'Resilienz & Führung', seoTitel: 'Resilienz als Führungsqualität: Wie Sie Ihr Team durch Unsicherheit führen', kategorie: 'Business Coaching', zielgruppe: 'Führungskräfte', funnelStufe: 'Consideration', keywordPrimaer: 'resilienz führungskraft', keywordSekundaer: [], paaFragen: ['Wie stärke ich Resilienz im Team?'], contentWinkel: 'Führungsimpuls', cta: 'Kommentieren', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },

  // ── September ──
  { monat: '2026-09', kanal: 'BLOG', thema: 'Work-Life-Balance', seoTitel: 'Work-Life-Balance ist ein Mythos — was Sie stattdessen brauchen', kategorie: 'Work-Life', zielgruppe: 'Überarbeitete Berufstätige', funnelStufe: 'Awareness', keywordPrimaer: 'work life balance coaching', keywordSekundaer: ['work life integration', 'balance beruf privat'], paaFragen: ['Gibt es echte Work-Life-Balance?', 'Was ist Work-Life-Integration?'], contentWinkel: 'Provokativer Blickwechsel', cta: 'Coaching-Gespräch starten', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-09', kanal: 'NEWSLETTER', thema: 'Jahresendreview', seoTitel: 'Jahresendreview mit Coaching: Wie Sie 2026 abschließen und 2027 starten', kategorie: 'Jahresplanung', zielgruppe: 'Bestandskunden', funnelStufe: 'Retention', keywordPrimaer: 'jahresreview coaching', keywordSekundaer: [], paaFragen: ['Wie reflektiere ich das Jahr richtig?'], contentWinkel: 'Reflexions-Anleitung', cta: 'Jahresabschluss-Coaching', prioritaet: 'Mittel', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-09', kanal: 'SOCIAL_INSTAGRAM', thema: 'Herbst-Reflexion', seoTitel: '3 Fragen für Ihre Herbst-Reflexion — 10 Minuten die alles verändern können', kategorie: 'Selbstreflexion', zielgruppe: 'Allgemein', funnelStufe: 'Awareness', keywordPrimaer: 'selbstreflexion fragen', keywordSekundaer: [], paaFragen: ['Wie reflektiere ich effektiv?'], contentWinkel: 'Mini-Übung', cta: 'Speichern & in Ruhe beantworten', prioritaet: 'Mittel', positionierungGenutzt: false, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: true },
  { monat: '2026-09', kanal: 'SOCIAL_INSTAGRAM', thema: 'Ziele 2027', seoTitel: 'Warum 90% aller Vorsätze scheitern — und wie Coaching das ändert', kategorie: 'Zielsetzung', zielgruppe: 'Zielstrebige', funnelStufe: 'Consideration', keywordPrimaer: 'ziele erreichen coaching', keywordSekundaer: [], paaFragen: ['Warum scheitern Vorsätze?'], contentWinkel: 'Problem-Lösung', cta: '2027-Ziel-Session buchen', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: true },
  { monat: '2026-09', kanal: 'SOCIAL_INSTAGRAM', thema: 'Coaching-Angebot', seoTitel: 'Neues Programm: 12 Wochen Transformation — erste Plätze jetzt verfügbar', kategorie: 'Angebot', zielgruppe: 'Entscheidungsbereite', funnelStufe: 'Decision', keywordPrimaer: 'coaching programm', keywordSekundaer: [], paaFragen: ['Was kostet ein Coaching-Programm?'], contentWinkel: 'Angebots-Launch', cta: 'Platz sichern', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-09', kanal: 'SOCIAL_INSTAGRAM', thema: 'Mindset-Shift', seoTitel: 'Der eine Mindset-Shift der mein Coaching verändert hat — für immer', kategorie: 'Persönlichkeitsentwicklung', zielgruppe: 'Allgemein', funnelStufe: 'Awareness', keywordPrimaer: 'mindset coaching', keywordSekundaer: [], paaFragen: ['Was ist ein Growth Mindset?'], contentWinkel: 'Persönliche Geschichte', cta: 'Folgen für mehr Impulse', prioritaet: 'Mittel', positionierungGenutzt: false, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-09', kanal: 'SOCIAL_LINKEDIN', thema: 'Coaching-Kultur', seoTitel: 'Wie eine Coaching-Kultur im Unternehmen Fluktuation um 30% senken kann', kategorie: 'Business Coaching', zielgruppe: 'HR & Führung', funnelStufe: 'Consideration', keywordPrimaer: 'coaching kultur unternehmen', keywordSekundaer: [], paaFragen: ['Was ist eine Coaching-Kultur?'], contentWinkel: 'Daten & Praxisbeispiel', cta: 'Direkte Nachricht', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
]

const TEXT_RESULTS = [
  // ── Monat 1: Blog + Newsletter + Social vollständig im Portal ──
  {
    monat: '2026-07',
    titel: 'Innere Blockaden auflösen: 5 Coaching-Methoden die wirklich funktionieren',
    kanal: 'BLOG',
    portalVisible: true,
    customerApproval: 'approved',
    blog: {
      monat: '2026-07',
      titel: 'Innere Blockaden auflösen: 5 Coaching-Methoden die wirklich funktionieren',
      keyword: 'innere blockaden auflösen',
      metaTitel: 'Innere Blockaden auflösen – 5 bewährte Coaching-Methoden',
      metaBeschreibung: 'Erfahren Sie, wie Sie innere Blockaden mit professionellen Coaching-Methoden dauerhaft auflösen und Ihr volles Potenzial entfalten.',
      wordCount: 920,
      html: `<h1>Innere Blockaden auflösen: 5 Coaching-Methoden die wirklich funktionieren</h1>
<p>Kennen Sie das Gefühl, genau zu wissen was Sie wollen – und trotzdem nicht in die Umsetzung zu kommen? Innere Blockaden sind unsichtbare Bremsen, die uns davon abhalten, unser volles Potenzial zu leben. Als Coach erlebe ich täglich, wie Menschen mit diesen stillen Saboteuren kämpfen.</p>
<h2>Was sind innere Blockaden wirklich?</h2>
<p>Innere Blockaden entstehen nicht aus Schwäche. Sie sind erlernte Schutzstrategien, die uns einst geholfen haben und nun zu Hindernissen geworden sind. Hinter jedem „Ich kann nicht" steckt meistens ein „Ich darf nicht" oder „Ich bin nicht gut genug".</p>
<h2>Methode 1: Der innere Kritiker als Verbündeter</h2>
<p>Der erste Schritt ist, den inneren Kritiker nicht zu bekämpfen, sondern kennenzulernen. Im Coaching fragen wir: Was will diese Stimme schützen? Was braucht sie, um sich sicher zu fühlen? Oft steckt dahinter eine tiefe Fürsorge – nur mit veralteten Methoden.</p>
<h2>Methode 2: Glaubenssätze kartieren und transformieren</h2>
<p>„Ich bin nicht gut genug" – dieser Satz sitzt tief. Im Coaching visualisieren wir, wo dieser Glaubenssatz seinen Ursprung hat, und entwickeln gemeinsam eine neue Überzeugung, die der Realität besser entspricht.</p>
<h2>Methode 3: Körperarbeit als Türöffner</h2>
<p>Blockaden sitzen nicht nur im Kopf – sie manifestieren sich im Körper. Atemübungen, Körperwahrnehmung und gezielte Bewegungsimpulse helfen, festgehaltene Energie freizusetzen.</p>
<h2>Methode 4: Ressourcen aktivieren</h2>
<p>Jeder Mensch hat Momente erlebt, in denen er Hindernisse überwunden hat. Im Coaching holen wir diese Ressourcen-Erinnerungen ins Bewusstsein und verankern sie als innere Kraftquelle.</p>
<h2>Methode 5: Kleinstschritte statt großer Sprünge</h2>
<p>Blockaden lösen sich selten durch einen einzigen mutigen Schritt. Viel wirkungsvoller sind mini-Aktionen, die das Nervensystem langsam umkonditionieren und neue neuronale Bahnen anlegen.</p>
<p>Der Schlüssel: Diese Methoden wirken am tiefsten im geschützten Rahmen eines professionellen Coachings. Wenn Sie bereit sind, Ihre Blockaden endlich loszulassen, freue ich mich auf ein kostenfreies Erstgespräch mit Ihnen.</p>`,
    },
    imageBrief: { motiv: 'Person die einen schweren Stein loslässt, symbolisch für das Loslassen von Blockaden', stil: 'Warm, hoffnungsvoll, authentisch', farben: 'Warme Erdtöne, helles Licht im Hintergrund', format: 'Quadratisch für Instagram, 16:9 für Blog-Header' },
  },
  {
    monat: '2026-07',
    titel: 'Sommerimpuls: Nutzen Sie die ruhigen Wochen für Ihre Transformation',
    kanal: 'NEWSLETTER',
    portalVisible: true,
    customerApproval: 'pending',
    newsletter: {
      monat: '2026-07',
      titel: 'Sommerimpuls: Nutzen Sie die ruhigen Wochen für Ihre Transformation',
      betreffA: 'Ihr Sommerimpuls: Die ruhigen Wochen als Transformationszeit nutzen',
      betreffB: '☀️ Pause oder Aufbruch? Wie Sie den Sommer für sich nutzen',
      preheader: 'Eine Übung, die in 15 Minuten mehr Klarheit bringt als ein langer Planungsabend.',
      body: `Liebe Leserinnen und Leser,

der Sommer bringt für viele eine natürliche Verlangsamung — weniger Termine, weniger Lärm, mehr Raum. Genau diese ruhigen Wochen sind goldwert für innere Arbeit.

Denn Transformation braucht kein Drama und keine Krise. Sie braucht Stille.

Eine kleine Übung für Sie:

Nehmen Sie sich heute 15 Minuten und beantworten Sie diese drei Fragen schriftlich:

1. Was hat mich in diesem Jahr bereits weitergebracht, auch wenn es sich nicht so angefühlt hat?
2. Was möchte ich in der zweiten Jahreshälfte loslassen?
3. Was darf in meinem Leben mehr Raum einnehmen?

Keine Bewertung. Kein Druck. Nur ehrliche Antworten.

Diese einfache Reflexion ist oft der Beginn einer echten Veränderung.

Wenn Sie merken, dass Sie bei Frage 2 oder 3 stocken — das ist genau der Punkt, an dem Coaching ansetzt. Ich begleite Sie gerne.

Herzlich,
Andrea Hoffmann
Zertifizierter Life & Business Coach`,
    },
    imageBrief: { motiv: 'Person sitzt ruhig in der Natur, Notizbuch in der Hand', stil: 'Kontemplativ, warm', farben: 'Sommerliche Naturtöne', format: 'Newsletter-Header 600×300' },
  },
  {
    monat: '2026-07',
    titel: 'Prophylaxe-Tipps für den Sommer',
    kanal: 'SOCIAL_INSTAGRAM',
    portalVisible: true,
    customerApproval: 'changes_requested',
    customerComment: 'Bitte das erste Instagram-Posting noch etwas persönlicher formulieren — mehr ich-Stimme.',
    socialPosts: [
      {
        kanal: 'SOCIAL_INSTAGRAM',
        text: `Deine Gedanken sind nicht deine Grenzen — sie sind dein Ausgangspunkt. 💫

Wer sich das wirklich verinnerlichst hat, der weiß: Die entscheidende Veränderung beginnt immer im Innen, nicht im Außen.

Was ist der Gedanke, der dich aktuell am meisten bremst? Schreib ihn gerne in die Kommentare — ohne Bewertung. ⬇️

#Coaching #MindsetShift #InnereBlockaden #Transformation #PersonalDevelopment`,
      },
      {
        kanal: 'SOCIAL_INSTAGRAM',
        text: `Was ist die GROW-Methode? 🌱

G – Goal: Was wollen Sie erreichen?
R – Reality: Wo stehen Sie heute wirklich?
O – Options: Welche Möglichkeiten gibt es?
W – Will: Was werden Sie konkret tun?

Diese 4 Fragen strukturieren jedes meiner Coaching-Gespräche. Einfach. Kraftvoll. Wirkungsvoll.

Haben Sie schon einmal mit GROW gearbeitet? 👇

#CoachingMethoden #GROW #BusinessCoaching #Selbstentwicklung`,
      },
      {
        kanal: 'SOCIAL_INSTAGRAM',
        text: `„Ich wusste nicht, dass sich Erschöpfung so normal anfühlen kann – bis sie plötzlich weg war."

Das sind die Worte von Maria, 38, Teamleiterin in einem Konzern, nach unserem 4-Sitzungen-Programm.

Was hat sich verändert? Sie hat aufgehört, ihre Erschöpfung als persönliches Versagen zu behandeln. Und angefangen, sich selbst zu führen wie die Mitarbeiterin, die sie am meisten schätzt.

Ihre Geschichte beginnt mit einem Gespräch. 💬 Link in Bio.

#CoachingErfahrung #Transformation #LifeCoaching #Authentizität`,
      },
      {
        kanal: 'SOCIAL_INSTAGRAM',
        text: `5 Zeichen, dass Coaching genau JETZT für dich richtig wäre 👇

1️⃣ Du weißt was du willst – aber kommst nicht ins Tun
2️⃣ Du fühlst dich erschöpft, obwohl du eigentlich alles hast
3️⃣ Du wiederholst immer wieder dieselben Muster
4️⃣ Deine Ziele fühlen sich fremd an – wie Ziele anderer
5️⃣ Du sehnst dich nach einem echten Gesprächspartner ohne Agenda

Erkennst du dich wieder? Dann lass uns reden. Erstgespräch ist kostenfrei. 🔗 Link in Bio.

#CoachingBrauche #Erstgespräch #Coaching2026`,
      },
      {
        kanal: 'SOCIAL_LINKEDIN',
        text: `Warum lassen sich die besten Führungskräfte regelmäßig coachen?

Nicht weil sie Hilfe brauchen. Sondern weil sie wissen, dass blinde Flecken teuer sind.

Ein CEO einer mittelständischen Unternehmensgruppe sagte mir kürzlich: „Coaching ist mein wichtigstes Führungsinstrument – nicht weil es mich schwächer macht, sondern weil es mich klarer macht."

In meiner Arbeit mit Führungskräften erlebe ich immer wieder denselben Durchbruch: Der Moment, in dem jemand aufhört, Performance zu optimieren – und anfängt, authentisch zu führen.

Das ist keine Soft-Skill-Story. Das ist Ergebnisverbesserung.

Was sind Ihre Erfahrungen mit Coaching als Führungsinstrument?

#FührungskräfteCoaching #ExecutiveCoaching #Leadership #Coaching`,
      },
      {
        kanal: 'SOCIAL_LINKEDIN',
        text: `Der ROI von Coaching – was Zahlen und Studien wirklich zeigen:

📊 Die ICF-Studie zeigt: Unternehmen, die in Coaching investieren, berichten von einem durchschnittlichen ROI von 500-700%.

Wie setzt sich das zusammen?
→ Geringere Fluktuation (Recruiting-Kosten sinken)
→ Höhere Produktivität durch klarere Entscheidungen
→ Besseres Teamklima durch authentischere Führung
→ Weniger krankheitsbedingte Ausfälle

Das ist kein Wohlfühlprogramm. Das ist strategische Personalentwicklung.

Wenn Sie als HR-Verantwortliche oder Führungskraft wissen möchten, wie Sie Coaching gezielt einsetzen können – sprechen Sie mich gerne direkt an.

#CoachingROI #HR #Personalentwicklung #BusinessCoaching`,
      },
    ],
    imageBrief: { motiv: 'Moderne, motivierende Coaching-Grafik, hell und einladend', stil: 'Professionell aber warmherzig', farben: 'Warme Töne, Akzentfarbe der Marke', format: 'Quadratisch 1:1 für Instagram, 1.91:1 für LinkedIn' },
  },
]

// ── Hauptfunktion ────────────────────────────────────────────────────────────

async function main() {
  console.log('🎯 Demo-Datensatz Coaching wird erstellt...\n')

  // 1. Ersten Admin-User finden
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', active: true },
    select: { id: true, email: true },
  })

  if (!admin) {
    console.error('❌ Kein aktiver Admin-User gefunden. Bitte zuerst seed-admin.mjs ausführen.')
    process.exit(1)
  }

  console.log(`👤 Admin: ${admin.email}`)

  // 2. Altes Demo-Projekt löschen (idempotent)
  const existing = await prisma.project.findFirst({
    where: { name: 'Demo – Coaching by Andrea Hoffmann', createdById: admin.id },
    select: { id: true },
  })
  if (existing) {
    await prisma.project.delete({ where: { id: existing.id } })
    console.log('🗑️  Altes Demo-Projekt gelöscht')
  }

  // 3. Projekt anlegen
  const project = await prisma.project.create({
    data: {
      name: 'Demo – Coaching by Andrea Hoffmann',
      praxisUrl: 'https://andrea-hoffmann-coaching.de',
      praxisName: 'Andrea Hoffmann Coaching',
      fachgebiet: 'Life & Business Coaching',
      planningStart: new Date('2026-07-01'),
      planningEnd: new Date('2026-09-30'),
      channels: ['BLOG', 'NEWSLETTER', 'SOCIAL_INSTAGRAM', 'SOCIAL_LINKEDIN'],
      channelQuantities: {
        BLOG: { count: 1 },
        NEWSLETTER: { count: 1 },
        SOCIAL_INSTAGRAM: { posts: 4, postsUnit: 'month' },
        SOCIAL_LINKEDIN: { posts: 2, postsUnit: 'month' },
      },
      keywords: ['life coaching', 'business coaching', 'innere blockaden', 'burnout prävention', 'führungskräfte coaching'],
      positioningDocument: `Andrea Hoffmann ist zertifizierter Life & Business Coach (ICF ACC) mit Fokus auf Berufstätige in Führungspositionen und Selbstständige, die ihr Potenzial voll entfalten wollen. Sie begleitet Menschen dabei, innere Blockaden aufzulösen, Burnout zu verhindern und authentisch zu führen. Ihr Ansatz verbindet systemisches Coaching mit körperorientierter Arbeit und nachweisbarer Ergebnisorientierung.`,
      ansprache: 'Sie',
      status: 'ACTIVE',
      themeResults: THEMES,
      textResults: TEXT_RESULTS,
      createdById: admin.id,
    },
  })

  console.log(`✅ Projekt erstellt: ${project.id}`)

  // 4. Portal-Link anlegen (Passwort: coaching2026)
  const passwordHash = await bcrypt.hash('coaching2026', 10)
  const portalLink = await prisma.portalLink.create({
    data: {
      projectId: project.id,
      passwordHash,
      expiresAt: new Date('2027-12-31'),
      showAnalytics: false,
    },
  })

  console.log(`\n✅ Portal-Link erstellt`)
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`🔗 Portal-URL:   /portal/${portalLink.token}`)
  console.log(`🔑 Passwort:     coaching2026`)
  console.log(`${'─'.repeat(60)}\n`)
  console.log('Fertig! Das Demo-Projekt ist unter "Demo – Coaching by Andrea Hoffmann" sichtbar.')
}

main()
  .catch((err) => {
    console.error('❌ Fehler:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
