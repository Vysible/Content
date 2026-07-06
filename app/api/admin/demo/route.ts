import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils/logger'
import bcrypt from 'bcryptjs'

const DEMO_PROJECT_NAME = 'Demo – Coaching by Andrea Hoffmann'
const DEMO_PASSWORD = 'coaching2026'

const THEMES = [
  // ── Juli ──
  { monat: '2026-07', kanal: 'BLOG', thema: 'Innere Blockaden', seoTitel: 'Innere Blockaden auflösen: 5 Coaching-Methoden die wirklich funktionieren', kategorie: 'Persönlichkeitsentwicklung', zielgruppe: 'Berufstätige mit Wachstumswunsch', funnelStufe: 'Awareness', keywordPrimaer: 'innere blockaden auflösen', keywordSekundaer: ['coaching blockaden'], paaFragen: ['Was sind innere Blockaden?', 'Wie entstehen Glaubenssätze?'], contentWinkel: 'Praktische Anleitung', cta: 'Erstgespräch buchen', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-07', kanal: 'NEWSLETTER', thema: 'Sommerimpuls', seoTitel: 'Sommerimpuls: Nutzen Sie die ruhigen Wochen für Ihre Transformation', kategorie: 'Persönlichkeitsentwicklung', zielgruppe: 'Bestandskunden', funnelStufe: 'Retention', keywordPrimaer: 'coaching sommer', keywordSekundaer: [], paaFragen: ['Wie nutze ich freie Zeit für Wachstum?'], contentWinkel: 'Motivierender Impuls', cta: 'Intensiv-Coaching buchen', prioritaet: 'Mittel', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-07', kanal: 'SOCIAL_INSTAGRAM', thema: 'Blockaden-Zitat', seoTitel: 'Deine Gedanken sind nicht deine Grenzen — sie sind dein Ausgangspunkt', kategorie: 'Motivation', zielgruppe: 'Allgemein', funnelStufe: 'Awareness', keywordPrimaer: 'coaching motivation', keywordSekundaer: [], paaFragen: ['Was bedeutet Wachstumsmindset?'], contentWinkel: 'Inspirierendes Zitat', cta: 'Profil besuchen', prioritaet: 'Mittel', positionierungGenutzt: false, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-07', kanal: 'SOCIAL_INSTAGRAM', thema: 'GROW-Methode', seoTitel: 'Was ist die GROW-Methode? So strukturieren Coaches ein Gespräch', kategorie: 'Coaching-Wissen', zielgruppe: 'Interessierte', funnelStufe: 'Consideration', keywordPrimaer: 'grow methode coaching', keywordSekundaer: [], paaFragen: ['Wie läuft ein Coaching-Gespräch ab?'], contentWinkel: 'Erklärpost', cta: 'DM für Erstgespräch', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: true },
  { monat: '2026-07', kanal: 'SOCIAL_INSTAGRAM', thema: 'Testimonial Maria', seoTitel: 'Von der Erschöpfung zur Klarheit: Marias Geschichte in 4 Sitzungen', kategorie: 'Social Proof', zielgruppe: 'Skeptische Interessierte', funnelStufe: 'Consideration', keywordPrimaer: 'coaching erfahrung', keywordSekundaer: [], paaFragen: ['Wie lange dauert Coaching?'], contentWinkel: 'Testimonial-Story', cta: 'Deine Geschichte beginnt hier', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-07', kanal: 'SOCIAL_INSTAGRAM', thema: 'Selbst-Check', seoTitel: '5 Zeichen, dass du jetzt Coaching brauchst — erkennst du dich wieder?', kategorie: 'Lead-Generierung', zielgruppe: 'Zögernde', funnelStufe: 'Decision', keywordPrimaer: 'coaching wann sinnvoll', keywordSekundaer: [], paaFragen: ['Für wen ist Coaching geeignet?'], contentWinkel: 'Interaktiver Selbst-Check', cta: 'Erstgespräch vereinbaren', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: true },
  { monat: '2026-07', kanal: 'SOCIAL_LINKEDIN', thema: 'Führung & Coaching', seoTitel: 'Warum die besten Führungskräfte regelmäßig gecoachet werden', kategorie: 'Business Coaching', zielgruppe: 'Führungskräfte', funnelStufe: 'Awareness', keywordPrimaer: 'führungskräfte coaching', keywordSekundaer: ['executive coaching'], paaFragen: ['Was bringt Coaching für Führungskräfte?'], contentWinkel: 'Thought Leadership', cta: 'Vernetzen und austauschen', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-07', kanal: 'SOCIAL_LINKEDIN', thema: 'ROI von Coaching', seoTitel: 'Der ROI von Coaching: Was Studien über Rendite und Wirksamkeit zeigen', kategorie: 'Business Coaching', zielgruppe: 'HR-Entscheider', funnelStufe: 'Consideration', keywordPrimaer: 'coaching wirksamkeit studie', keywordSekundaer: [], paaFragen: ['Lohnt sich Coaching finanziell?'], contentWinkel: 'Datenbasierter Artikel', cta: 'Kommentieren & diskutieren', prioritaet: 'Mittel', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  // ── August ──
  { monat: '2026-08', kanal: 'BLOG', thema: 'Burnout-Prävention', seoTitel: 'Burnout erkennen und verhindern: Ein Coaching-Leitfaden für Berufstätige', kategorie: 'Burnout-Prävention', zielgruppe: 'Gestresste Berufstätige', funnelStufe: 'Awareness', keywordPrimaer: 'burnout verhindern coaching', keywordSekundaer: ['burnout prävention'], paaFragen: ['Wie erkenne ich einen drohenden Burnout?'], contentWinkel: 'Präventiver Ratgeber', cta: 'Kostenfreies Erstgespräch', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-08', kanal: 'NEWSLETTER', thema: 'Herbst-Momentum', seoTitel: 'Herbst-Momentum: Starten Sie mit neuer Energie in die zweite Jahreshälfte', kategorie: 'Persönlichkeitsentwicklung', zielgruppe: 'Bestandskunden', funnelStufe: 'Retention', keywordPrimaer: 'coaching herbst', keywordSekundaer: [], paaFragen: ['Wie starte ich motiviert in den Herbst?'], contentWinkel: 'Saisonaler Impuls', cta: 'Herbst-Intensivprogramm', prioritaet: 'Mittel', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-08', kanal: 'SOCIAL_INSTAGRAM', thema: 'Morgenroutine', seoTitel: 'Meine Morgenroutine als Coach: So starte ich mit voller Energie in den Tag', kategorie: 'Lifestyle', zielgruppe: 'Allgemein', funnelStufe: 'Awareness', keywordPrimaer: 'morgenroutine produktivität', keywordSekundaer: [], paaFragen: ['Wie verbessert eine Morgenroutine den Tag?'], contentWinkel: 'Persönlicher Einblick', cta: 'Speichern & ausprobieren', prioritaet: 'Mittel', positionierungGenutzt: false, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-08', kanal: 'SOCIAL_INSTAGRAM', thema: 'Burnout-Warnsignale', seoTitel: '7 frühe Warnsignale für Burnout — Nummer 4 übersehen die meisten', kategorie: 'Burnout-Prävention', zielgruppe: 'Berufstätige', funnelStufe: 'Awareness', keywordPrimaer: 'burnout symptome früh', keywordSekundaer: [], paaFragen: ['Was sind frühe Burnout-Zeichen?'], contentWinkel: 'Aufmerksamkeits-Post', cta: 'Kommentiere mit deiner Erfahrung', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: true },
  { monat: '2026-08', kanal: 'SOCIAL_INSTAGRAM', thema: 'Veränderung', seoTitel: 'Veränderung beginnt mit einer Entscheidung — nicht mit perfekten Umständen', kategorie: 'Motivation', zielgruppe: 'Allgemein', funnelStufe: 'Decision', keywordPrimaer: 'veränderung coaching', keywordSekundaer: [], paaFragen: ['Wie fange ich mit Veränderung an?'], contentWinkel: 'Motivationspost', cta: 'Erstgespräch buchen', prioritaet: 'Mittel', positionierungGenutzt: false, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-08', kanal: 'SOCIAL_INSTAGRAM', thema: 'Coaching-Prozess', seoTitel: 'So läuft ein 3-Monats-Coaching-Programm bei mir ab — Schritt für Schritt', kategorie: 'Angebot', zielgruppe: 'Interessierte', funnelStufe: 'Consideration', keywordPrimaer: 'coaching programm ablauf', keywordSekundaer: [], paaFragen: ['Was passiert in einem Coaching-Paket?'], contentWinkel: 'Transparenz über Prozess', cta: 'Programmdetails anfragen', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-08', kanal: 'SOCIAL_LINKEDIN', thema: 'Resilienz & Führung', seoTitel: 'Resilienz als Führungsqualität: Wie Sie Ihr Team durch Unsicherheit führen', kategorie: 'Business Coaching', zielgruppe: 'Führungskräfte', funnelStufe: 'Consideration', keywordPrimaer: 'resilienz führungskraft', keywordSekundaer: [], paaFragen: ['Wie stärke ich Resilienz im Team?'], contentWinkel: 'Führungsimpuls', cta: 'Kommentieren', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  // ── September ──
  { monat: '2026-09', kanal: 'BLOG', thema: 'Work-Life-Balance', seoTitel: 'Work-Life-Balance ist ein Mythos — was Sie stattdessen brauchen', kategorie: 'Work-Life', zielgruppe: 'Überarbeitete Berufstätige', funnelStufe: 'Awareness', keywordPrimaer: 'work life balance coaching', keywordSekundaer: ['work life integration'], paaFragen: ['Gibt es echte Work-Life-Balance?', 'Was ist Work-Life-Integration?'], contentWinkel: 'Provokativer Blickwechsel', cta: 'Coaching-Gespräch starten', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-09', kanal: 'NEWSLETTER', thema: 'Jahresendreview', seoTitel: 'Jahresendreview mit Coaching: Wie Sie 2026 abschließen und 2027 starten', kategorie: 'Jahresplanung', zielgruppe: 'Bestandskunden', funnelStufe: 'Retention', keywordPrimaer: 'jahresreview coaching', keywordSekundaer: [], paaFragen: ['Wie reflektiere ich das Jahr richtig?'], contentWinkel: 'Reflexions-Anleitung', cta: 'Jahresabschluss-Coaching', prioritaet: 'Mittel', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-09', kanal: 'SOCIAL_INSTAGRAM', thema: 'Herbst-Reflexion', seoTitel: '3 Fragen für Ihre Herbst-Reflexion — 10 Minuten die alles verändern können', kategorie: 'Selbstreflexion', zielgruppe: 'Allgemein', funnelStufe: 'Awareness', keywordPrimaer: 'selbstreflexion fragen', keywordSekundaer: [], paaFragen: ['Wie reflektiere ich effektiv?'], contentWinkel: 'Mini-Übung', cta: 'Speichern & in Ruhe beantworten', prioritaet: 'Mittel', positionierungGenutzt: false, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: true },
  { monat: '2026-09', kanal: 'SOCIAL_INSTAGRAM', thema: 'Ziele 2027', seoTitel: 'Warum 90% aller Vorsätze scheitern — und wie Coaching das ändert', kategorie: 'Zielsetzung', zielgruppe: 'Zielstrebige', funnelStufe: 'Consideration', keywordPrimaer: 'ziele erreichen coaching', keywordSekundaer: [], paaFragen: ['Warum scheitern Vorsätze?'], contentWinkel: 'Problem-Lösung', cta: '2027-Ziel-Session buchen', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: true },
  { monat: '2026-09', kanal: 'SOCIAL_INSTAGRAM', thema: 'Neues Programm', seoTitel: 'Neues Programm: 12 Wochen Transformation — erste Plätze jetzt verfügbar', kategorie: 'Angebot', zielgruppe: 'Entscheidungsbereite', funnelStufe: 'Decision', keywordPrimaer: 'coaching programm', keywordSekundaer: [], paaFragen: ['Was kostet ein Coaching-Programm?'], contentWinkel: 'Angebots-Launch', cta: 'Platz sichern', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-09', kanal: 'SOCIAL_INSTAGRAM', thema: 'Mindset-Shift', seoTitel: 'Der eine Mindset-Shift der mein Coaching verändert hat — für immer', kategorie: 'Persönlichkeitsentwicklung', zielgruppe: 'Allgemein', funnelStufe: 'Awareness', keywordPrimaer: 'mindset coaching', keywordSekundaer: [], paaFragen: ['Was ist ein Growth Mindset?'], contentWinkel: 'Persönliche Geschichte', cta: 'Folgen für mehr Impulse', prioritaet: 'Mittel', positionierungGenutzt: false, canvaOrdnerGenutzt: true, keywordsGenutzt: false, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
  { monat: '2026-09', kanal: 'SOCIAL_LINKEDIN', thema: 'Coaching-Kultur', seoTitel: 'Wie eine Coaching-Kultur im Unternehmen Fluktuation um 30% senken kann', kategorie: 'Business Coaching', zielgruppe: 'HR & Führung', funnelStufe: 'Consideration', keywordPrimaer: 'coaching kultur unternehmen', keywordSekundaer: [], paaFragen: ['Was ist eine Coaching-Kultur?'], contentWinkel: 'Daten & Praxisbeispiel', cta: 'Direkte Nachricht', prioritaet: 'Hoch', positionierungGenutzt: true, canvaOrdnerGenutzt: false, keywordsGenutzt: true, hwgFlag: 'gruen', praxisspezifisch: true, istFrage: false },
]

const TEXT_RESULTS = [
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
      metaBeschreibung: 'Erfahren Sie, wie Sie innere Blockaden mit professionellen Coaching-Methoden dauerhaft auflösen.',
      wordCount: 780,
      html: `<h1>Innere Blockaden auflösen: 5 Coaching-Methoden die wirklich funktionieren</h1>
<p>Kennen Sie das Gefühl, genau zu wissen was Sie wollen – und trotzdem nicht in die Umsetzung zu kommen? Innere Blockaden sind unsichtbare Bremsen, die uns davon abhalten, unser volles Potenzial zu leben.</p>
<h2>Was sind innere Blockaden wirklich?</h2>
<p>Innere Blockaden entstehen nicht aus Schwäche. Sie sind erlernte Schutzstrategien, die uns einst geholfen haben und nun zu Hindernissen geworden sind. Hinter jedem „Ich kann nicht" steckt meistens ein „Ich darf nicht" oder „Ich bin nicht gut genug".</p>
<h2>Methode 1: Den inneren Kritiker als Verbündeten gewinnen</h2>
<p>Der erste Schritt ist, den inneren Kritiker nicht zu bekämpfen, sondern kennenzulernen. Was will diese Stimme schützen? Was braucht sie, um sich sicher zu fühlen?</p>
<h2>Methode 2: Glaubenssätze kartieren und transformieren</h2>
<p>„Ich bin nicht gut genug" – dieser Satz sitzt tief. Im Coaching visualisieren wir, wo dieser Glaubenssatz seinen Ursprung hat, und entwickeln eine neue Überzeugung, die der Realität besser entspricht.</p>
<h2>Methode 3: Ressourcen aktivieren</h2>
<p>Jeder Mensch hat Momente erlebt, in denen er Hindernisse überwunden hat. Im Coaching holen wir diese Erinnerungen ins Bewusstsein und verankern sie als innere Kraftquelle.</p>
<h2>Methode 4: Körperarbeit als Türöffner</h2>
<p>Blockaden sitzen nicht nur im Kopf – sie manifestieren sich im Körper. Atemübungen und Körperwahrnehmung helfen, festgehaltene Energie freizusetzen.</p>
<h2>Methode 5: Kleinstschritte statt großer Sprünge</h2>
<p>Blockaden lösen sich selten durch einen einzigen mutigen Schritt. Wirkungsvoller sind Mini-Aktionen, die neue neuronale Bahnen anlegen und das Nervensystem umkonditionieren.</p>
<p>Wenn Sie bereit sind, Ihre Blockaden endlich loszulassen, freue ich mich auf ein kostenfreies Erstgespräch mit Ihnen.</p>`,
    },
    imageBrief: { motiv: 'Person die einen schweren Stein loslässt, symbolisch', stil: 'Warm, hoffnungsvoll', farben: 'Erdtöne', format: 'Quadratisch' },
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

Wenn Sie merken, dass Sie bei Frage 2 oder 3 stocken — das ist genau der Punkt, an dem Coaching ansetzt.

Herzlich,
Andrea Hoffmann`,
    },
    imageBrief: { motiv: 'Person sitzt ruhig in der Natur mit Notizbuch', stil: 'Kontemplativ, warm', farben: 'Sommerliche Naturtöne', format: 'Newsletter-Header' },
  },
  {
    monat: '2026-07',
    titel: 'Social Media Juli 2026',
    kanal: 'SOCIAL_INSTAGRAM',
    portalVisible: true,
    customerApproval: 'changes_requested',
    customerComment: 'Bitte das erste Instagram-Posting persönlicher formulieren — mehr ich-Stimme.',
    socialPosts: [
      { kanal: 'SOCIAL_INSTAGRAM', text: `Deine Gedanken sind nicht deine Grenzen — sie sind dein Ausgangspunkt. 💫\n\nWer sich das wirklich verinnerlichst hat, der weiß: Die entscheidende Veränderung beginnt immer im Innen, nicht im Außen.\n\nWas ist der Gedanke, der dich aktuell am meisten bremst? Schreib ihn gerne in die Kommentare. ⬇️\n\n#Coaching #MindsetShift #InnereBlockaden #Transformation` },
      { kanal: 'SOCIAL_INSTAGRAM', text: `Was ist die GROW-Methode? 🌱\n\nG – Goal: Was wollen Sie erreichen?\nR – Reality: Wo stehen Sie heute?\nO – Options: Welche Möglichkeiten gibt es?\nW – Will: Was werden Sie konkret tun?\n\nDiese 4 Fragen strukturieren jedes meiner Coaching-Gespräche.\n\n#CoachingMethoden #GROW #Selbstentwicklung` },
      { kanal: 'SOCIAL_INSTAGRAM', text: `„Ich wusste nicht, dass sich Erschöpfung so normal anfühlen kann – bis sie plötzlich weg war."\n\nDas sind die Worte von Maria, 38, Teamleiterin, nach unserem 4-Sitzungen-Programm.\n\nIhre Geschichte beginnt mit einem Gespräch. 💬 Link in Bio.\n\n#CoachingErfahrung #Transformation #LifeCoaching` },
      { kanal: 'SOCIAL_INSTAGRAM', text: `5 Zeichen, dass Coaching genau JETZT für dich richtig wäre 👇\n\n1️⃣ Du weißt was du willst – aber kommst nicht ins Tun\n2️⃣ Du fühlst dich erschöpft, obwohl du eigentlich alles hast\n3️⃣ Du wiederholst immer wieder dieselben Muster\n4️⃣ Deine Ziele fühlen sich fremd an\n5️⃣ Du sehnst dich nach einem echten Gesprächspartner\n\nErstgespräch ist kostenfrei. 🔗 Link in Bio.\n\n#Coaching2026` },
      { kanal: 'SOCIAL_LINKEDIN', text: `Warum lassen sich die besten Führungskräfte regelmäßig coachen?\n\nNicht weil sie Hilfe brauchen. Sondern weil sie wissen, dass blinde Flecken teuer sind.\n\nIn meiner Arbeit mit Führungskräften erlebe ich immer wieder denselben Durchbruch: Der Moment, in dem jemand aufhört, Performance zu optimieren – und anfängt, authentisch zu führen.\n\nWas sind Ihre Erfahrungen mit Coaching als Führungsinstrument?\n\n#FührungskräfteCoaching #Leadership` },
      { kanal: 'SOCIAL_LINKEDIN', text: `Der ROI von Coaching – was Zahlen wirklich zeigen:\n\n📊 ICF-Studie: Unternehmen berichten von einem durchschnittlichen ROI von 500-700%.\n\nWie setzt sich das zusammen?\n→ Geringere Fluktuation\n→ Höhere Produktivität\n→ Besseres Teamklima\n→ Weniger Fehlzeiten\n\nDas ist kein Wohlfühlprogramm. Das ist strategische Personalentwicklung.\n\n#CoachingROI #Personalentwicklung` },
    ],
    imageBrief: { motiv: 'Moderne motivierende Coaching-Grafik', stil: 'Professionell aber warmherzig', farben: 'Warme Töne', format: '1:1 für Instagram' },
  },
]

export async function POST() {
  try {
    const session = await requireAdmin()
    const userId = (session as { user?: { id?: string } }).user?.id
    if (!userId) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    // Altes Demo-Projekt löschen (idempotent)
    const existing = await prisma.project.findFirst({
      where: { name: DEMO_PROJECT_NAME, createdById: userId },
      select: { id: true },
    })
    if (existing) {
      await prisma.project.delete({ where: { id: existing.id } })
      logger.info({ projectId: existing.id }, '[demo] Altes Demo-Projekt gelöscht')
    }

    // Projekt anlegen
    const project = await prisma.project.create({
      data: {
        name: DEMO_PROJECT_NAME,
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
        positioningDocument: 'Andrea Hoffmann ist zertifizierter Life & Business Coach (ICF ACC) mit Fokus auf Berufstätige in Führungspositionen und Selbstständige. Sie begleitet Menschen dabei, innere Blockaden aufzulösen, Burnout zu verhindern und authentisch zu führen.',
        ansprache: 'Sie',
        googleAdsCustomerId: 'DEMO',
        status: 'ACTIVE',
        themeResults: THEMES,
        textResults: TEXT_RESULTS,
        createdById: userId,
      },
    })

    // Portal-Link
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
    const portalLink = await prisma.portalLink.create({
      data: {
        projectId: project.id,
        passwordHash,
        expiresAt: new Date('2027-12-31'),
        showAnalytics: true,
      },
    })

    logger.info({ projectId: project.id, token: portalLink.token }, '[demo] Coaching-Demo erstellt')

    return NextResponse.json({
      ok: true,
      projectId: project.id,
      projectName: project.name,
      portalToken: portalLink.token,
      portalUrl: `/portal/${portalLink.token}`,
      password: DEMO_PASSWORD,
    })
  } catch (err: unknown) {
    logger.error({ err }, '[demo] Demo-Erstellung fehlgeschlagen')
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await requireAdmin()
    const userId = (session as { user?: { id?: string } }).user?.id
    if (!userId) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const deleted = await prisma.project.deleteMany({
      where: { name: DEMO_PROJECT_NAME, createdById: userId },
    })

    return NextResponse.json({ ok: true, deleted: deleted.count })
  } catch (err: unknown) {
    logger.error({ err }, '[demo] Demo-Löschung fehlgeschlagen')
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
