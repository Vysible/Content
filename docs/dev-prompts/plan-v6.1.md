# KI-Content-Automationsplattform – plan.md
> Implementierungsplan für Claude Code · v6.1 · Mai 2026
> Erweitert um: Hedy-Integration · Praxis-Portal · WordPress-Connector · Klick-Tipp · KPI-Dashboard · VPS-Deployment · Kostentracking

---

## Entscheidungslog

| Datum | Entscheidung | Details |
|---|---|---|
| Mai 2026 | Geschäftsmodell | **Agentur-intern / Single-Tenant** – kein SaaS, keine Mandantentrennung im DB-Schema. Spätere Migration möglich. |
| Mai 2026 | Deployment (Dev) | **Lokal als MVP** – Docker Compose + Caddy + mkcert. VPS/Coolify erst bei Go-Live. |
| Mai 2026 | Auth-Library | **Auth.js v5** (statt NextAuth.js v4) – stabiler für Next.js 14 App Router, bereits implementiert. |
| Mai 2026 | Lokale Domain | **vysible.local** (via /etc/hosts + mkcert-CA) |
| Mai 2026 | Package Manager | **pnpm** |
| Mai 2026 | Phase 0 | ✅ **Abgeschlossen** – Auth, Scaffolding, Docker, SSL, YAML, KI-Adapter, AES-256 alle smoke-tested. |

---

## Projektübersicht

Browser-basierte KI-Plattform zur vollautomatisierten Erstellung von Content-Marketing-Paketen (Blog, Newsletter, Social Media) für Arzt- und Zahnarztpraxen. Input: Praxis-URL + Positionierungsdokument (oder Hedy-Transkript) + Keywords. Output: Redaktionspläne, Textentwürfe, Bildbriefings, Social-Media-Drafts, WordPress-Drafts, Klick-Tipp-Kampagnen, ZIP-Export.

**Validierungs-URL (Testfall nach jedem Slice):** `https://www.zahnzentrum-warendorf.de`

---

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Auth | **Auth.js v5** (Credentials Provider), bcrypt 12 Rounds |
| Scraping | Playwright (Chromium) |
| Parsing | pdfjs-dist, mammoth |
| KI | Anthropic SDK + OpenAI SDK (Adapter-Pattern) |
| Canva | Canva Connect REST API + OAuth 2.0 |
| Social Media | Meta Graph API + LinkedIn REST API |
| Newsletter | Klick-Tipp REST API |
| CMS | WordPress REST API v2 |
| Hedy | Hedy Bot API (Transkript-Import) |
| E-Mail | nodemailer (SMTP) |
| Streaming | Server-Sent Events (SSE) via Next.js API Route |
| DB | SQLite (Dev) → PostgreSQL (Prod via Coolify) |
| Export | xlsx, docx, puppeteer (PDF), html (kopierbarer CMS-Output) |
| SSL lokal | **mkcert + Caddy** (Reverse Proxy lokal, bereits konfiguriert) |
| Lokale Domain | **vysible.local** (via /etc/hosts + mkcert-CA-Trust) |
| Deployment | Docker Compose → Coolify (VPS) |
| Reverse Proxy Prod | Cloudflare Tunnel (kein offener Port) |
| KI-Prompts | /prompts/*.yaml (nie im Code) |

---

## VPS-Deployment (Produktionsbetrieb)

> Zielinfrastruktur: Hostinger VPS Frankfurt · Ubuntu 24.04 · Coolify bereits installiert · Cloudflare Tunnel aktiv

### Architektur

```
Internet
  └── Cloudflare Tunnel (Tunnel-ID: 87411b6c-7972-46ec-8222-6dd8efb1a465)
        └── content-plattform.domain.de → localhost:3000
                └── Coolify
                      ├── Next.js App (Docker)
                      ├── PostgreSQL (Coolify-managed)
                      └── Playwright-Service (separater Container)
```

### Deployment-Regeln

- **Kein offener Port nach außen.** Alle externen Zugriffe ausschließlich via Cloudflare Tunnel.
- **Coolify managed:** Postgres, SSL-Terminierung, Environment Variables, Auto-Deploy via GitHub-Webhook.
- **Keine manuelle SSH-Intervention** für reguläre Deployments. Nur für Infrastruktur-Updates.
- **Playwright in eigenem Container:** Chromium-Prozesse laufen isoliert. Memory-Limit: 512MB.
- **Backups:** PostgreSQL-Dump täglich via Coolify Backup → Hostinger Object Storage.
- **VPS läuft bis:** 2027-02-28 → Verlängerung vor Ablauf einplanen.

### docker-compose.prod.yml (Coolify-kompatibel)

```yaml
services:
  app:
    build: .
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - postgres
    restart: unless-stopped

  playwright:
    build: ./services/playwright
    restart: unless-stopped
    mem_limit: 512m

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### README (max. 5 Befehle bis zur laufenden App)

```bash
git clone <repo>
cp .env.example .env          # Secrets eintragen
docker compose up -d          # Dev mit SQLite + mkcert
# Prod: via Coolify Dashboard deployen → GitHub-Webhook
```

---

## Projektstruktur (Zielzustand)

```
/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── page.tsx                    # Agentur-Dashboard + KPI
│   │   ├── kpi/page.tsx                # KPI-Dashboard (Slice 24)
│   │   └── projects/
│   │       └── [id]/
│   │           ├── page.tsx            # Ergebnisansicht
│   │           ├── editor/
│   │           ├── calendar/
│   │           ├── export/
│   │           └── settings/
│   ├── (praxis)/                       # Praxis-Portal (Slice 21)
│   │   └── review/[token]/
│   │       └── page.tsx
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── projects/
│       ├── generate/stream/
│       ├── scrape/
│       ├── hedy/import/                # Hedy (Slice 20)
│       ├── canva/
│       ├── social/
│       ├── wordpress/                  # WP (Slice 22)
│       ├── klicktipp/                  # KT (Slice 23)
│       ├── email/
│       ├── kpi/                        # KPIs + Kosten (Slice 24/27)
│       └── tokens/status/             # Token-Warnsystem (Slice 26)
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── kpi/
│   ├── wizard/
│   ├── editor/
│   ├── chat/
│   ├── praxis-portal/
│   └── export/
├── lib/
│   ├── db/
│   ├── auth/
│   ├── scraper/
│   ├── hedy/
│   ├── ai/
│   │   ├── client.ts
│   │   ├── pipeline.ts
│   │   └── validators/
│   ├── canva/
│   ├── social/
│   ├── wordpress/
│   ├── klicktipp/
│   ├── email/
│   ├── tokens/
│   └── costs/
├── prompts/
│   ├── themes.yaml
│   ├── blog.yaml
│   ├── newsletter.yaml
│   ├── social.yaml
│   ├── image-brief.yaml
│   └── positioning.yaml               # NEU: Hedy-Transkript → Positionierungsdok.
├── templates/                         # NEU: Fachgebiet-Templates (Slice 25)
│   ├── zahnarzt.yaml
│   ├── kfo.yaml
│   ├── gynaekologie.yaml
│   └── dermatologie.yaml
├── config/
│   └── model-prices.ts                # Token-Preise (einzige Quelle)
├── prisma/schema.prisma
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

---

## Nicht-funktionale Pflicht-Constraints

- **Sicherheit:** API-Keys, OAuth-Tokens, SMTP-Passwörter, KT-Credentials, WP-Application-Passwords: AES-256 serverseitig. Nie im Frontend.
- **Passwörter:** bcrypt, min. 10 Rounds.
- **Sessions:** HTTP-only Cookies oder JWT (1h) + Refresh-Token (30 Tage). Auto-Logout 30 Min.
- **HTTPS:** Cloudflare Tunnel in Prod. mkcert lokal. Kein offener HTTP-Port in Prod.
- **Scraping:** robots.txt-Check vor Crawl. Min. 2s Pause. Playwright in eigenem Container.
- **Retry:** Exponentieller Backoff, max. 3 Retries. HTTP 429 → 60s Pause + Nutzer-Warnung.
- **Logging:** Strukturiertes JSON (Timestamp, Modell, Tokens, Kosten-EUR, Projekt-ID, User-ID, Fehlercode). 30 Tage lokal.
- **Datenschutz:** Anthropic API mit ZDR. Vollständige Datenlöschung bei Projekt-Löschung ≤ 24h.
- **KI-Prompts:** Ausschließlich in `/prompts/*.yaml`.
- **Concurrency:** Max. 3 gleichzeitige Generierungen.
- **Token-Kosten:** Jeder KI-Call → CostEntry in DB (Modell, Input-Tokens, Output-Tokens, EUR, Projekt-ID, Step).

---

## Qualitätskriterien (Definition of Quality)

| Kriterium | Mindeststandard | Prüfmethode |
|---|---|---|
| Praxisspezifität | Praxisname + mind. 1 USP im Text | Automatischer String-Check |
| Positionierungstreue | Tonalität entspricht Positionierungsdokument | Manuelle Prüfung |
| Keyword-Alignment | Primärkeyword in Überschrift; mind. 1 PAA-Frage als H2 | Automatischer Keyword-Check |
| HWG-Compliance | Disclaimer vorhanden, keine unzulässigen Heilsversprechen | Automatischer Disclaimer-Check |
| Kanalspezifität | Blog ≥600 W · Newsletter 250–350 W · Social ≤200 Z. | Automatische Wortanzahl-Prüfung |

> **Reviewpflicht:** Download, WP-Draft, KT-Kampagne und Social-Draft erst aktiv wenn ≥1 Artefakt auf „Geprüft" gesetzt.

---

## KI-Kontext-Priorität

```
1. Positionierungsdokument   (max. 4.000 Tokens – aus Upload ODER Hedy-Transkript)
2. Canva-Asset-Kontext
3. Keyword/PAA-Input
4. Themen-Pool
5. Homepage-Analyse
```

---

## ThemenItem-Schema

```typescript
interface ThemenItem {
  monat: string;
  thema: string;
  seoTitel: string;
  kategorie: string;
  zielgruppe: string;
  funnelStufe: 'Awareness' | 'Consideration' | 'Decision' | 'Retention';
  keywordPrimaer: string;
  keywordSekundaer: string[];
  paaFragen: string[];
  kanaele: ('blog' | 'newsletter' | 'social')[];
  contentWinkel: string;
  cta: string;
  prioritaet: 'Hoch' | 'Mittel' | 'Niedrig';
  positionierungGenutzt: boolean;
  canvaOrdnerGenutzt: boolean;
  keywordsGenutzt: boolean;
  hwgFlag: 'gruen' | 'gelb' | 'rot';
  canvaAssetReferenz?: string;
  wpDraftStatus?: 'ausstehend' | 'in_wordpress' | 'veroeffentlicht';
  ktCampaignId?: string;
  ktStatus?: 'ausstehend' | 'kampagne_erstellt' | 'versendet';
}
```

---

## Kosten-Modell pro Kunde

> Jedes Generierungspaket (6 Monate, alle Kanäle) wird mit echten Kosten erfasst.

### Token-Verbrauch pro Paket (Schätzung)

| Schritt | Modell | Input-Tokens | Output-Tokens | Kosten (ca.) |
|---|---|---|---|---|
| Themenplanung | Claude Sonnet 4.6 | 8.000 | 4.000 | ~0,06 € |
| Blog x6 (je 800 W) | Claude Sonnet 4.6 | 6.000 | 18.000 | ~0,26 € |
| Newsletter x6 | Claude Sonnet 4.6 | 4.000 | 9.000 | ~0,13 € |
| Social x18 Posts | Claude Sonnet 4.6 | 3.000 | 5.400 | ~0,08 € |
| Bildbriefings x6 | Claude Sonnet 4.6 | 2.000 | 3.600 | ~0,05 € |
| Chat-Überarbeitungen | Claude Sonnet 4.6 | variabel | variabel | ~0,10 € |
| Hedy-Positionierung | Claude Sonnet 4.6 | 10.000 | 3.000 | ~0,08 € |
| DataForSEO (optional) | — | — | — | <0,50 € |
| **Gesamt pro Paket** | | | | **~1,26 € pro Kunde/Monat** |

> Empfohlene Kalkulation: 3–5 €/Monat an KI-Kosten weiterberechnen → Marge ~250–400%.

### Kosten-Tracking in DB

```typescript
interface CostEntry {
  id: string;
  projectId: string;
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costEur: number;        // inputTokens * priceIn + outputTokens * priceOut
  step: string;           // 'themes'|'blog'|'newsletter'|'social'|'chat'|'positioning'|'dataseo'
}
```

### Preise (Stand Mai 2026 – pflegen in `/config/model-prices.ts`)

```typescript
export const MODEL_PRICES = {
  'claude-sonnet-4-6': { input: 0.000003, output: 0.000015 }, // EUR per Token
  'claude-opus-4-6':   { input: 0.000015, output: 0.000075 },
  'gpt-4o':            { input: 0.000005, output: 0.000015 },
};
```

---

## Dateinamen-Konvention

```
[PraxisKürzel]_[Kanal]_[MonatJahr]_v[N].[ext]
Beispiel: WAR_Blog_Apr2026_v1.docx / WAR_Blog_Apr2026_v1.html
```

---

## Social-Media-Limits

| Plattform | Zeichenlimit | Besonderheit |
|---|---|---|
| Instagram | max. 200 Zeichen | HWG §11: keine Vorher-Nachher ohne Einwilligung |
| Facebook | max. 80 Zeichen | — |
| LinkedIn | max. 700 Zeichen | — |

---

## Phasenstruktur (v6.0)

| Phase | Name | Slices | Definition of Done | Aufwand |
|---|---|---|---|---|
| ✅ **0** | Foundation | Slice 16, Scaffolding, Caddy, SSL, YAML | ~~Login funktioniert. App via Docker. Claude-API-Call + Kosten-Logging OK.~~ **Abgeschlossen Mai 2026.** Auth.js v5, Prisma, Docker Compose, mkcert+Caddy, YAML-Stubs, AES-256, KI-Adapter – alle smoke-tested. | ~~3–4 Tage~~ ✅ |
| **1** | Core MVP | Slices 4, 11, 2, 3a, 3b, 12, 13, 5, 9 | Content-Paket generiert, ZIP + HTML heruntergeladen, Quality-Kriterien erfüllt, Kosten geloggt. | 3–4 Wochen |
| **2** | Collaboration & Integration | Slices 6–8, 10, 11a, 17–19 | Feedback-Loop vollständig. Drafts auf Social. E-Mail bei Veröffentlichung. Token-Warnungen aktiv. | 3–4 Wochen |
| **3** | Erweiterungen | Slices 20–27 | Hedy-Import, Praxis-Portal, WP-Connector, KT-Connector, KPI-Dashboard, Fachgebiet-Templates. | 4–5 Wochen |
| **4** | Quality & Scale | Slices 14–15, NFA-Härtung, Performance | Content übertrifft manuelle Beispiele. Stabiler Betrieb mit 10+ Projekten. | 2–3 Wochen |

---

## Implementierungsreihenfolge (verbindlich)

```
✅ Phase 0:  Slice 16 → Scaffolding+Caddy → SSL (mkcert) → YAML-Struktur → config/model-prices.ts  [ABGESCHLOSSEN]
→  Phase 1:  Slice 4 → Slice 11 → Slice 2 → Slice 3a → Slice 3b → Slice 12 → Slice 13 → Slice 5 → Slice 9
   Phase 2:  Slice 6 → Slice 8 → Slice 7 → Slice 10 → Slice 11a → Slice 17 → Slice 18 → Slice 19
   Phase 3:  Slice 27 → Slice 20 → Slice 21 → Slice 22 → Slice 23 → Slice 24 → Slice 25 → Slice 26
   Phase 4:  Slice 14 → Slice 15 → NFA-Härtung → Performance
```

> ✅ **Phase 0 abgeschlossen.** Nächster Schritt: **Slice 4 (API-Key-Manager)**.
> ⚠️ **Slice 27 (Kosten-Tracking) vor Slice 20–24**, damit ab Phase 3 alle neuen Operationen sofort geloggt werden.

---

## Slice-Katalog

---

### PHASE 0 – Foundation

---

#### ✅ Slice 16 – Auth & Nutzermanagement `[PHASE 0 – ABGESCHLOSSEN]`

**GOAL:**
Vollständiges Login- und Session-System. App ohne Auth nicht zugänglich.

**FILES TO CREATE/CHANGE:**
- `app/(auth)/login/page.tsx`
- `app/api/auth/[...nextauth]/route.ts`
- `app/(dashboard)/admin/users/page.tsx`
- `lib/auth/session.ts`
- `prisma/schema.prisma` – User, Session, Role
- `middleware.ts`

**REQUIREMENTS:**
- Login: E-Mail + Passwort, HTTPS erzwungen, Passwort-Vergessen mit E-Mail-Reset, "Angemeldet bleiben" (max. 30 Tage)
- Rollen: `ADMIN` (vollständig) und `STAFF` (ohne Nutzerverwaltung)
- Session: Auto-Logout 30 Min. JWT (1h) + Refresh-Token (30 Tage). HTTP-only Cookies.
- bcrypt, min. 10 Rounds
- Rate-Limiting: max. 10 fehlgeschlagene Versuche/IP/Stunde → Sperre
- Direktzugriff ohne Login → Redirect `/login`

**ACCEPTANCE CHECKLIST:**
- [ ] Login korrekt → Dashboard
- [ ] Login falsch → Fehlermeldung (kein Stack-Trace)
- [ ] Admin sieht Nutzerverwaltung, STAFF nicht
- [ ] Deaktivierter Nutzer → Login verweigert
- [ ] 30 Min. Inaktivität → Auto-Logout
- [ ] Coolify-Deploy via Cloudflare Tunnel erreichbar unter HTTPS

**STOP CONDITIONS:**
- Kein Feature-Code außerhalb Auth-Scope

---

#### ✅ Slice – Scaffolding, Coolify, SSL, YAML, Kosten-Config `[PHASE 0 – ABGESCHLOSSEN]`

**GOAL:**
Projektgerüst mit Coolify-kompatiblem Docker Compose, Cloudflare Tunnel, Prisma, YAML-Prompts, Kosten-Config und Anthropic-Test-Call mit Kosten-Logging.

**FILES TO CREATE/CHANGE:**
- `docker-compose.yml` (Dev: SQLite + mkcert)
- `docker-compose.prod.yml` (Prod: PostgreSQL + Coolify)
- `Dockerfile`, `services/playwright/Dockerfile`
- `.env.example`
- `prisma/schema.prisma` – inkl. CostEntry-Table
- `prompts/*.yaml` – leere Starter
- `lib/ai/client.ts`
- `lib/costs/tracker.ts` – Basis-Implementierung
- `config/model-prices.ts`
- `README.md`

**REQUIREMENTS:**
- Coolify-Deploy: App via Tunnel erreichbar ohne offenen Port
- Anthropic-Test-Call loggt CostEntry in DB (Tokens + EUR)
- `config/model-prices.ts` als einzige Stelle für Token-Preise
- Alle Secrets via Coolify Secret Manager

**ACCEPTANCE CHECKLIST:**
- [ ] `docker compose up` → `https://localhost:3000` erreichbar
- [ ] Coolify-Deploy → Domain via Tunnel erreichbar
- [ ] Test-Call → CostEntry in DB mit korrekten Werten
- [ ] README: max. 5 Befehle

---

### PHASE 1 – Core MVP

---

#### Slice 4 – API-Key-Manager `[PHASE 1]`

**GOAL:**
Named Keys pro Provider, AES-256, Test-Call, Kosten-Voranschlag.

**REQUIREMENTS:**
- Providers Phase 1: Anthropic, OpenAI
- Providers Phase 3: DataForSEO, Klick-Tipp, WordPress (vorbereiten, nicht aktivieren)
- AES-256, nie im Frontend
- Kosten-Voranschlag vor Generierungsstart (via `config/model-prices.ts`)
- KI-Modell: Claude Sonnet 4.6 (Standard), Claude Opus 4.6, GPT-4o

**ACCEPTANCE CHECKLIST:**
- [ ] Key → verschlüsselt in DB, nie als Klartext zurückgegeben
- [ ] Test-Call → Erfolg + EUR-Schätzung angezeigt

---

#### Slice 11 – Scraper-Service `[PHASE 1]`

**GOAL:**
Playwright-Scraper in eigenem Container, robots.txt-Check, Rate-Limiting, JSON-Output.

**REQUIREMENTS:**
- Playwright (Chromium) in `services/playwright` Container (mem_limit: 512MB)
- robots.txt-Check, min. 2s Pause, max. 2 Ebenen Tiefe
- Output: strukturiertes JSON
- Fallback: Freitext min. 200 Zeichen

**ACCEPTANCE CHECKLIST:**
- [ ] `zahnzentrum-warendorf.de` → strukturiertes JSON
- [ ] robots.txt Disallow → kein Crawl, Fallback angeboten
- [ ] Playwright-Container: kein Memory-Overflow bei 3 parallelen Scrapes

---

#### Slice 2 – URL & alle Inputs `[PHASE 1]`

**GOAL:**
3-Schritt-Wizard mit URL-Validierung, Uploads, Keywords. Kontext-Vorbereitung.

**REQUIREMENTS:**
- Schritt 1: URL + HTTP-Check + robots.txt
- Schritt 2: Planungszeitraum + Kanal-Auswahl
- Schritt 3 (optional): Positionierungsdokument · Themen-Pool · Keywords · Canva · **Hedy-Import-Button** · **Fachgebiet-Template-Dropdown**
- Kontext-Priorität in `lib/ai/context-builder.ts`
- Positionierungsdokument > 4.000 Tokens → Kürzung mit UI-Hinweis
- Kein Positionierungsdokument → Warnung + Hinweis auf Hedy-Import

**ACCEPTANCE CHECKLIST:**
- [ ] Hedy-Import-Button sichtbar in Schritt 3 (auch wenn Slice 20 noch nicht aktiv)
- [ ] Fachgebiet-Template-Dropdown vorhanden (auch wenn Slice 25 noch nicht aktiv)
- [ ] Warnung bei fehlendem Positionierungsdokument

---

#### Slice 3a – SSE-Infrastruktur `[PHASE 1]`

**REQUIREMENTS:**
- 8 Events: `scrape_done · positioning_injected · canva_loaded · pool_loaded · keywords_loaded · themes_done · plans_done · texts_done`
- Fallback: Polling alle 3s
- Fehler: Retry ab fehlgeschlagenem Schritt

---

#### Slice 3b – Prozess-Orchestrierung `[PHASE 1]`

**REQUIREMENTS:**
- Vorprüfung: URL? Key? Kosten-Voranschlag angezeigt und bestätigt?
- Queue: max. 3 gleichzeitig, Position angezeigt
- Jeder Schritt: SSE-Event + CostEntry in DB

**ACCEPTANCE CHECKLIST:**
- [ ] Kosten-Voranschlag erscheint vor Start
- [ ] Tatsächliche Kosten nach Generierung in Projekt-Übersicht

---

#### Slice 12 – KI-Themenplanung `[PHASE 1]`

**REQUIREMENTS:**
- JSON-Array nach ThemenItem-Schema, max. 2 Retries
- ≥80% praxisspezifisch, ≥50% SEO-Titel als Frage oder mit Keyword
- HWG-Flag je Item
- CostEntry in DB (step='themes')

**ACCEPTANCE CHECKLIST:**
- [ ] Valides JSON nach ThemenItem-Schema
- [ ] CostEntry mit korrekten Token-Zahlen und EUR-Betrag
- [ ] Kein Prompt im TypeScript-Code

---

#### Slice 13 – KI-Texte `[PHASE 1]`

**REQUIREMENTS:**
- Blog: 600–900 W, PAA als H2, Keyword in H1, Disclaimer
- Newsletter: 250–350 W, A/B-Betreff, Preheader (max. 100 Z.), CTA
- Social: ≤200 Z. (IG), ≤80 (FB), ≤700 (LI)
- Bildbriefing: Motiv, Stil, Farbwelt, Textoverlay, Canva-Asset-Empfehlung
- CostEntry je Generierungsschritt (step='blog'/'newsletter'/'social'/'image-brief')

---

#### Slice 5 – Ergebnisansicht `[PHASE 1]`

**REQUIREMENTS:**
- Tabs: Themenübersicht · Blog · Newsletter · Social · Textentwürfe · Bildbriefings
- Sortierbar: Monat, Priorität, Status, Funnel
- Inline-Editing, Server-Autosave 5s
- Zusätzliche Status-Spalten:
  - Social: Ausstehend / Hochgeladen / Freigegeben
  - Blog: Ausstehend / In WordPress / Veröffentlicht
  - Newsletter: Ausstehend / KT-Kampagne erstellt / Versendet

---

#### Slice 9 – Export & Download + HTML `[PHASE 1]`

**GOAL:**
ZIP-Export, Einzelexporte, kopierbarer HTML-Output für CMS und E-Mail.

**FILES TO CREATE/CHANGE:**
- `lib/export/zip.ts`, `xlsx.ts`, `docx.ts`, `pdf.ts`
- `lib/export/html.ts` – NEU

**REQUIREMENTS:**
- ZIP: XLSX + DOCX + PDF + HTML (je Kanal)

**HTML-Export – Blog (WordPress-optimiert):**
- Semantisches HTML: `<h1>`, `<h2>`, `<h3>`, `<p>`, `<ul>` – keine Inline-Styles
- HWG-Disclaimer als `<div class="disclaimer">` am Ende
- Hinweis-Banner im Download: „In WordPress → Beitrag → HTML-Modus einfügen"
- Je Artikel eine separate `.html`-Datei im ZIP

**HTML-Export – Newsletter (E-Mail-kompatibel):**
- Inline CSS (Klick-Tipp und andere E-Mail-Clients)
- Tabellenlayout für maximale Client-Kompatibilität
- `{{unsubscribe_link}}` als Platzhalter für KT-Merge-Tag
- Praxisadresse im Footer (DSGVO)

**Dateinamen-Konvention:** `[PraxisKürzel]_[Kanal]_[MonatJahr]_v[N].[ext]`

**ACCEPTANCE CHECKLIST:**
- [ ] HTML-Blog in WordPress Gutenberg → HTML-Block → korrekte Darstellung
- [ ] Newsletter-HTML: Inline-CSS, Tabellenlayout, Unsubscribe-Platzhalter
- [ ] Download-Button inaktiv solange kein Artefakt auf „Geprüft"

---

### PHASE 2 – Collaboration & Integration

---

#### Slice 6 – Text-Editor `[PHASE 2]`
- Rich-Text: Fett, Kursiv, H2, H3, Listen
- Server-Autosave 5s, Indikator: Gespeichert / Speichern... / Fehler

---

#### Slice 8 – Chat & Versionen `[PHASE 2]`
- Split View: Editor links, Chat rechts
- Kontext-Binding: aktives Artefakt als Header injiziert
- Max. 10 Versionen pro Artefakt
- Chips: Kürzer · Formaler · Lockerer · Mehr Praxisbezug · CTA stärker · SEO verbessern · Keyword integrieren
- CostEntry für Chat-Überarbeitungen (step='chat')

---

#### Slice 7 – Kalender-Ansicht `[PHASE 2]`
- Monatskalender, Drag & Drop
- Farbcodierung: Ausstehend (grau) / Hochgeladen (gelb) / Freigegeben (grün) / Veröffentlicht (blau)
- WP-Status + KT-Status ebenfalls farbcodiert

---

#### Slice 10 – Kunden-Sharing `[PHASE 2]`
- Passwortgeschützter Freigabelink (7 Tage, read-only)
- Temporär – nicht zu verwechseln mit permanentem Praxis-Portal (Slice 21)

---

#### Slice 11a – Keyword-Recherche (DataForSEO) `[PHASE 2]`
- PAA + Autocomplete für Fachgebiet + Standort, bis zu 5 Keywords/PAA
- Abruf < 10s, editierbare Liste vor Generierung
- CostEntry mit step='dataseo', Kosten aus API-Response

---

#### Slice 17 – Canva-Integration `[PHASE 2]`
- OAuth 2.0, Auto-Refresh, Token im API-Key-Manager
- Ordner-Mapping, Asset-Abruf, Kontext-Injektion im System-Prompt
- Scope: nur Lesen. Kein Design-Rendering.

---

#### Slice 18 – Social-Media-Draft-Posting `[PHASE 2]`
- Meta Graph API: Instagram + Facebook Draft
- LinkedIn UGC Posts Draft
- Status: Ausstehend / Hochgeladen / Freigegeben / Veröffentlicht
- ⚠️ Meta-Business-Verifizierung: **sofort beantragen** (Vorlaufzeit Wochen)
- Token-Ablauf-Warnung: Slice 26 muss parallel geplant sein

---

#### Slice 19 – E-Mail-Benachrichtigungen `[PHASE 2]`
- SMTP: Host, Port, TLS, User, Passwort (AES-256), Test-E-Mail
- Bis zu 5 Empfänger pro Projekt
- Trigger: Draft hochgeladen · Veröffentlicht · Generierung abgeschlossen · Freigabe erteilt

---

### PHASE 3 – Erweiterungen

---

#### Slice 27 – Kosten-Tracking pro Kunde `[PHASE 3 – ERSTER SLICE]`

**GOAL:**
Vollständiges Kosten-Tracking als Abrechnungsgrundlage. Alle KI-Calls sind einem Projekt zugeordnet und in EUR beziffert.

**FILES TO CREATE/CHANGE:**
- `lib/costs/tracker.ts` – vervollständigen
- `lib/costs/aggregator.ts`
- `lib/costs/invoice-export.ts`
- `app/(dashboard)/settings/billing/page.tsx`
- `app/api/kpi/costs/[projectId]/route.ts`

**REQUIREMENTS:**
- Pro Projekt: Kosten aktueller Monat / gesamt / nach Step aufgeschlüsselt
- Durchschnitt pro Artikel / Newsletter / Social-Post
- CSV-Export: alle CostEntries mit Timestamp, Modell, Tokens, EUR
- Agentur-Marge-Kalkulation: Feld „Kundenpreis/Monat" → zeigt Marge in %
- Schwellwert-E-Mail: wenn Projektkosten/Monat > konfigurierbarer Wert

**ACCEPTANCE CHECKLIST:**
- [ ] Projekt mit 3 Generierungen: Gesamtkosten stimmt mit Anthropic-Dashboard überein
- [ ] CSV-Export vollständig und korrekt
- [ ] Marge-Kalkulation: 5 € Kundenpreis → korrekter Marge-Prozentsatz

---

#### Slice 20 – Hedy-Integration: Transkript → Positionierungsdokument `[PHASE 3]`

**GOAL:**
Positionierungsworkshop (Hedy-Call) → Transkript per API importieren → KI transformiert zu Positionierungsdokument. Kein manuelles Copy-Paste.

**Workflow:**

```
Positionierungsworkshop (Hedy-Call, 60–90 Min.)
  └── Hedy Transkript (automatisch)
        └── Plattform: GET Hedy API → Transkript
              └── prompts/positioning.yaml → Claude Sonnet 4.6
                    └── Positionierungsdokument (Markdown, max. 2.000 W)
                          └── Editierbare Vorschau → Speichern
                                └── Identisch zu manuellem Upload im Kontext-Builder
```

**FILES TO CREATE/CHANGE:**
- `lib/hedy/client.ts`
- `lib/hedy/transcript-parser.ts`
- `app/api/hedy/import/route.ts`
- `components/wizard/HedyImport.tsx`
- `prompts/positioning.yaml` – NEU

**REQUIREMENTS:**
- Hedy API: `https://api.hedy.bot/mcp`
- Import-Flow:
  1. "Aus Hedy importieren" → Liste letzter 20 Sessions (Titel, Datum, Dauer)
  2. Session wählen → Transkript abrufen (< 10s)
  3. KI-Transformation via `prompts/positioning.yaml`
  4. Editierbare Vorschau anzeigen
  5. Bestätigen → gespeichert als Positionierungsdokument des Projekts
- Hedy-API-Key im API-Key-Manager als separater Provider
- CostEntry (step='positioning_generation')

**prompts/positioning.yaml – Pflichtfelder im Output:**

```yaml
system: |
  Du bist Experte für Praxis-Positionierung im Gesundheitswesen.
  Analysiere das Transkript eines Positionierungsworkshops und erstelle
  ein strukturiertes Positionierungsdokument.

  Extrahiere zwingend (wenn nicht genannt: [nicht besprochen]):
  1. Praxisname und Standort
  2. Fachgebiet(e) und Leistungsschwerpunkte
  3. Einzigartige Stärken / USPs (max. 5)
  4. Primäre Zielgruppe (Alter, Lebensumstand, Schmerzpunkt)
  5. Sekundäre Zielgruppe
  6. Gewünschte Tonalität (warm / sachlich / modern / akademisch)
  7. Differenzierung zum Wettbewerb
  8. Saisonale Besonderheiten oder Aktionsschwerpunkte

  Ausgabe: Strukturiertes Markdown-Dokument, max. 2.000 Wörter.
  Direkt beginnen, keine Einleitung, kein Kommentar.
```

**ACCEPTANCE CHECKLIST:**
- [ ] Hedy-Session-Liste: letzte 20 Sessions mit Titel + Datum
- [ ] Transkript-Abruf < 10s
- [ ] KI-Output: alle 8 Pflichtfelder vorhanden
- [ ] Vorschau editierbar vor Speicherung
- [ ] Gespeichertes Dokument identisch im Kontext-Builder wie manueller Upload
- [ ] CostEntry in DB (step='positioning_generation')

**STOP CONDITIONS:**
- Kein Zugriff auf Hedy-Audio oder Rohdaten, nur Transkript
- Keine Hedy-Session-Erstellung aus dem Tool

---

#### Slice 21 – Praxis-Portal `[PHASE 3]`

**GOAL:**
Arztpraxis bekommt permanenten Login zum eigenen Content: lesen, kommentieren, freigeben.

**Workflow:**

```
Agentur legt Praxis-User an (Name + E-Mail)
  └── Einladungs-E-Mail mit Link (24h gültig)
        └── Praxis logt sich ein (eigene Auth-Route /review/*)
              └── Sieht nur eigene Inhalte (Mandantentrennung per JWT-Claim)
                    ├── Blog / Social / Newsletter: lesen + kommentieren
                    └── "Freigeben"-Button pro Artikel
                          └── Status "Praxis freigegeben" → E-Mail an Agentur
```

**FILES TO CREATE/CHANGE:**
- `app/(praxis)/review/[token]/page.tsx`
- `components/praxis-portal/ArticleView.tsx`
- `components/praxis-portal/CommentThread.tsx`
- `components/praxis-portal/ApprovalButton.tsx`
- `app/api/praxis/comments/route.ts`
- `app/api/praxis/approve/route.ts`
- `prisma/schema.prisma` – PraxisUser, Comment, ApprovalStatus

**REQUIREMENTS:**
- Separate Auth-Route `/review/*`, vollständig getrennt von Agentur-Dashboard
- Mandantentrennung: Praxis sieht nur eigenes Projekt (JWT-Claim: `projectId`)
- Kommentarfunktion: pro Artikel, threadartig
- Freigabe: setzt `approvalStatus = 'praxis_approved'` + E-Mail an Agentur
- Agentur-Dashboard: Badge für ausstehende Praxis-Freigaben
- Einladungslink: 24h gültig, danach ungültig
- Mobile-optimiert (Praxis öffnet oft auf Smartphone, min. 44px Touch-Targets)

**ACCEPTANCE CHECKLIST:**
- [ ] Praxis-Login → sieht nur eigene Inhalte
- [ ] Direktzugriff auf anderes Projekt-Token → 403
- [ ] Kommentar absenden → erscheint im Agentur-Dashboard
- [ ] "Freigeben" → Status "Praxis freigegeben" + E-Mail an Agentur
- [ ] Mobil: Artikel lesbar, Buttons fingertauglich
- [ ] Einladungslink nach 24h ungültig

**STOP CONDITIONS:**
- Praxis kann nicht bearbeiten, nur lesen und kommentieren
- Kein Zugriff auf andere Projekte oder Einstellungen

---

#### Slice 22 – WordPress REST API Connector `[PHASE 3]`

**GOAL:**
Blog-Artikel direkt als Draft in WordPress anlegen. Kein manuelles Copy-Paste.

**Workflow:**

```
Blog-Artikel generiert + „Geprüft"
  └── "Als WordPress-Draft anlegen"
        └── WP REST API v2: POST /wp-json/wp/v2/posts (status: draft)
              └── Erscheint in WordPress → Beiträge → Entwürfe
                    └── Status im Tool: "In WordPress" + klickbarer WP-Link
```

**FILES TO CREATE/CHANGE:**
- `lib/wordpress/client.ts`
- `lib/wordpress/formatter.ts`
- `app/api/wordpress/draft/route.ts`
- `components/results/WordPressDraftButton.tsx`
- `app/(dashboard)/settings/wordpress/page.tsx`

**REQUIREMENTS:**
- Auth: **WordPress Application Password** (WP 5.6+, kein OAuth)
  - Nutzer erstellt in WP: Profil → Application Passwords → Generieren
  - Format: `username:app_password` → Base64 → `Authorization: Basic ...`
  - Im API-Key-Manager als Provider "WordPress" (AES-256)
- Pro Projekt: WP-URL konfigurierbar
- Formatter: Blog-Artikel → Gutenberg-kompatibles HTML
  - `<h1>` → WP Post Title
  - `<h2>`, `<h3>`, `<p>`, `<ul>`, `<ol>` → Gutenberg Blocks
  - HWG-Disclaimer → separater `<!-- wp:paragraph {"className":"disclaimer"} -->` Block
  - Bild-Referenzen → `<!-- wp:image -->` Placeholder mit Canva-Asset-Hinweis
- Status-Tracking: Ausstehend / In WordPress (Draft) / Veröffentlicht
- WP-Link nach Upload direkt klickbar im Tool

**Fallback (kein WP konfiguriert):**
- "HTML kopieren"-Button mit Clipboard-Copy
- Tooltip: „In WordPress → Neuer Beitrag → HTML-Modus einfügen"

**ACCEPTANCE CHECKLIST:**
- [ ] WP Application Password → Test-Call erfolgreich
- [ ] Blog-Artikel → WP Draft → erscheint unter Entwürfe in WordPress
- [ ] Titel = SEO-Titel aus Tool
- [ ] Gutenberg: korrekte Blockstruktur (H1/H2/Paragraphen)
- [ ] HWG-Disclaimer als eigener Block
- [ ] Ohne WP-Konfiguration: "HTML kopieren" aktiv
- [ ] Status "In WordPress" + klickbarer Link zur WP-Bearbeitungsseite
- [ ] Kein automatisches Veröffentlichen (nur Draft)

**STOP CONDITIONS:**
- Kein Zugriff auf andere WP-Inhalte außer dem zu erstellenden Post
- Kein automatisches Veröffentlichen

---

#### Slice 23 – Klick-Tipp Newsletter Connector `[PHASE 3]`

**GOAL:**
Newsletter-Texte direkt als Klick-Tipp-Kampagne anlegen. A/B-Betreff, Empfänger-Liste und Versandzeitpunkt aus Redaktionsplan.

**Workflow:**

```
Newsletter generiert + „Geprüft"
  └── "Als KT-Kampagne anlegen"
        └── Klick-Tipp REST API: POST /campaigns
              ├── Subject A + Subject B
              ├── Preheader
              ├── HTML-Body (aus Slice 9 Newsletter-HTML-Export)
              └── Empfänger-Liste aus Projekt-Einstellungen
                    └── Erscheint in KT → Kampagnen → Entwürfe
                          └── Status: "KT-Kampagne erstellt" + KT-Link
```

**FILES TO CREATE/CHANGE:**
- `lib/klicktipp/client.ts`
- `lib/klicktipp/newsletter-formatter.ts`
- `app/api/klicktipp/campaign/route.ts`
- `components/results/KlickTippButton.tsx`
- `app/(dashboard)/settings/klicktipp/page.tsx`

**REQUIREMENTS:**
- Klick-Tipp REST API: `https://api.klicktipp.com`
- Auth: API-Key (Username + Password) aus API-Key-Manager (AES-256)
- Newsletter-Formatter: HTML aus Slice 9 → KT-kompatibles E-Mail-HTML
  - Inline CSS (KT rendert keine externen Styles)
  - Tabellenlayout (E-Mail-Client-Kompatibilität)
  - CTA als Button-Tabelle mit Hintergrundfarbe
  - `{{unsubscribe_link}}` Merge-Tag (Pflicht in KT, sonst Fehler)
  - Praxisname + Adresse im Footer (DSGVO)
- Pro Projekt: KT-Empfänger-Listen-ID konfigurierbar
- A/B-Betreff: Subject A und Subject B als separate KT-Felder
- Preheader in KT-Kampagnen-Einstellungen
- Versandzeitpunkt aus Redaktionsplan (KT scheduled send)
- Status: Ausstehend / KT-Kampagne erstellt / Versendet
- KT-Link nach Erstellung klickbar

**ACCEPTANCE CHECKLIST:**
- [ ] KT-API-Key → Test-Verbindung erfolgreich
- [ ] Newsletter → KT-Kampagne → erscheint in KT unter Entwürfe
- [ ] A/B-Betreff korrekt übertragen
- [ ] `{{unsubscribe_link}}` in HTML vorhanden (sonst KT-API-Fehler)
- [ ] HTML in KT-Vorschau korrekt dargestellt
- [ ] Versanddatum aus Redaktionsplan in KT-Kampagne gesetzt
- [ ] Status "KT-Kampagne erstellt" + klickbarer Link

**STOP CONDITIONS:**
- Kein Versenden aus dem Tool (nur Kampagne anlegen)
- Kein Zugriff auf KT-Kontakte oder andere Kampagnen

---

#### Slice 24 – KPI-Dashboard & Automatischer Monatsreport `[PHASE 3]`

**GOAL:**
Zentrales Dashboard mit Produktivitäts-, Qualitäts- und Kosten-KPIs. Automatischer PDF-Report am 1. jeden Monats.

**FILES TO CREATE/CHANGE:**
- `app/(dashboard)/kpi/page.tsx`
- `components/kpi/CostChart.tsx`
- `components/kpi/ProjectKPICard.tsx`
- `components/kpi/MonthlyOverview.tsx`
- `lib/costs/reporter.ts`
- `lib/costs/aggregator.ts`
- `app/api/kpi/route.ts`

**KPI-Dashboard – Global:**

| KPI | Beschreibung |
|---|---|
| Projekte gesamt / aktiv / archiviert | Überblick |
| Artikel / Newsletter / Social Posts generiert | Kumuliert + laufender Monat |
| KI-Kosten gesamt (EUR) | Laufender Monat / letzter Monat / kumuliert |
| Ø Kosten pro Content-Paket | EUR |
| Ø Generierungszeit | Minuten |
| Offene Praxis-Freigaben | Anzahl (Badge) |
| Token-Warnungen | Anzahl ablaufender Tokens |

**KPI-Dashboard – Pro Projekt:**

| KPI | Beschreibung |
|---|---|
| KI-Kosten gesamt / letztes Paket / Trend (Sparkline 6 Monate) | EUR |
| WP-Drafts erstellt / veröffentlicht | Wenn WP verbunden |
| KT-Kampagnen erstellt / versendet | Wenn KT verbunden |
| Social Drafts hochgeladen / freigegeben | — |
| Praxis-Freigaben ausstehend | Badge |
| Qualitäts-Score | Ø letzter 3 Generierungen |
| Ø Überarbeitungen per Artefakt | Chat-Iterationen |

**Automatischer Monatsreport:**
- Cron: 1. des Monats, 08:00 Uhr (node-cron im App-Container)
- PDF (puppeteer): alle KPIs des Vormonats, pro Projekt aufgeschlüsselt
- Inhalt je Projekt: generierte Inhalte, veröffentlicht/ausstehend, KI-Kosten (EUR), offene Kommentare, Qualitäts-Score
- Versand: automatisch per E-Mail an alle Admins + optionale externe Empfänger
- Report-History: letzte 12 Reports als PDF downloadbar im Dashboard
- Dateiname: `Report_[JJJJMM].pdf`
- Kostenwarnung: E-Mail wenn Monatssumme > konfigurierbarer Schwellwert (Standard: 50 €)

**ACCEPTANCE CHECKLIST:**
- [ ] KPI-Dashboard: Gesamtkosten stimmt mit DB überein
- [ ] Cost-Chart rendert für Projekt mit 3+ Generierungen
- [ ] Cron-Job: am 1. des Monats → PDF generiert + E-Mail versendet
- [ ] PDF: alle Projekte mit Kosten + Status-Übersicht
- [ ] Kostenwarnung bei Schwellwert-Überschreitung → E-Mail ausgelöst
- [ ] Report-History: letzte 12 PDFs downloadbar

---

#### Slice 25 – Fachgebiet-Templates & Klon-Funktion `[PHASE 3]`

**GOAL:**
Neue Praxis des gleichen Fachgebiets in unter 10 Minuten onboarden. Vorbelegte Themen-Pools, saisonale Planung, Standard-Keywords je Specialty.

**FILES TO CREATE/CHANGE:**
- `templates/zahnarzt.yaml`, `kfo.yaml`, `gynaekologie.yaml`, `dermatologie.yaml`
- `lib/templates/loader.ts`
- `components/wizard/TemplateSelector.tsx`
- `app/api/projects/clone/route.ts`

**Template-Struktur (Beispiel zahnarzt.yaml):**

```yaml
specialty: Zahnarzt
defaultCategories:
  - Implantologie
  - Aligner
  - Prophylaxe
  - Zahnästhetik
  - Zahnerhalt
seasonalTopics:
  januar: Neujahrsvorsätze + Prophylaxe-Check
  februar: Valentinstag + Zähne bleichen
  april: Frühjahrscheck Zahngesundheit
  juni: Urlaubscheck vor Fernreise
  september: Back-to-school Kinderzahnmedizin
  november: Weihnachtslächeln vorbereiten
defaultKeywords:
  - "Zahnarzt [Ort]"
  - "Aligner Kosten"
  - "Zahnimplantat Erfahrungen"
  - "Zähne bleichen Zahnarzt"
hwgHighRiskCategories:
  - Implantologie
  - Zahnästhetik
defaultCta: "Termin vereinbaren"
defaultFunnelDistribution:
  awareness: 30%
  consideration: 40%
  decision: 20%
  retention: 10%
```

**Klon-Funktion:**
- "Neues Projekt ähnlich wie..." → Projekt auswählen
- Kopiert: Fachgebiet, Kanäle, Keywords, KT-Listen-ID, WP-URL, API-Key-Zuordnung
- Kopiert nicht: Positionierungsdokument, Canva-Ordner, generierte Inhalte
- Nach Klon: Hedy-Import-Button hervorgehoben mit Hinweis „Positionierungsworkshop für neue Praxis importieren"

**ACCEPTANCE CHECKLIST:**
- [ ] Template "Zahnarzt" → Wizard mit vorbelegten Keywords und Themen-Pool
- [ ] Klon → neues Projekt mit kopierten Einstellungen in < 2 Min. angelegt
- [ ] Template-YAML editierbar ohne Deployment

---

#### Slice 26 – Token-Ablauf-Warnsystem `[PHASE 3]`

**GOAL:**
Proaktive Warnung bei ablaufenden OAuth-Tokens (Meta, LinkedIn, Canva) bevor Workflow blockiert wird.

**FILES TO CREATE/CHANGE:**
- `lib/tokens/expiry-checker.ts`
- `components/dashboard/TokenWarningBanner.tsx`
- `app/api/tokens/status/route.ts`

**REQUIREMENTS:**
- Cron täglich 07:00: prüft alle OAuth-Tokens auf Ablaufdatum

| Ablauf in | Aktion |
|---|---|
| 14 Tage | Gelbes Banner im Dashboard |
| 7 Tage | Oranges Banner + E-Mail an Admin |
| 1 Tag | Rotes Banner + E-Mail + Browser-Notification |
| Abgelaufen | Rotes Banner + Draft-Posting-Buttons inaktiv + "Token erneuern"-Button prominent |

- One-Click-Reauth direkt aus dem Banner (öffnet OAuth-Flow)
- Token-Status in API-Key-Manager: Ablaufdatum + Ampel

**ACCEPTANCE CHECKLIST:**
- [ ] Token 6 Tage vor Ablauf → oranges Banner + E-Mail
- [ ] Abgelaufener Token → Draft-Posting-Button inaktiv
- [ ] One-Click-Reauth → OAuth-Flow → Token aktualisiert → Banner weg

---

### PHASE 4 – Quality & Scale

---

#### Slice 14 – SEO-Analyse `[PHASE 4]`
- Keyword-Dichte, Meta-Description, Title-Tag je Blog-Artikel
- Anzeige in Ergebnisansicht

---

#### Slice 15 – Bildbriefing (erweitert) `[PHASE 4]`
- DOCX: Motiv, Stil, Farbwelt, Textoverlay, Stock-Suchbegriffe, Canva-Asset-Empfehlung
- HWG §11-Pflichtprüfung
- Optional: DALL-E 3 Prompt für nicht-patientenbezogene Motive
- Bei HWG-heiklem Motiv: Unsplash-API-Suchlinks

---

## Hedy-Integration – Architektur im Detail

```
┌──────────────────────────────────────────────────────┐
│              POSITIONIERUNGSWORKSHOP                  │
│  Hedy zeichnet auf → automatisches Transkript         │
└───────────────────────────┬──────────────────────────┘
                            │ Hedy API
                            ▼
┌──────────────────────────────────────────────────────┐
│           CONTENT-PLATTFORM (Slice 20)                │
│  GET https://api.hedy.bot/mcp → Sessions + Transkript│
│  → prompts/positioning.yaml                           │
│  → Claude Sonnet 4.6                                  │
│  → Positionierungsdokument (Markdown, max. 2.000 W)  │
│  → Editierbare Vorschau → Speichern                   │
│  → Identisch zu manuellem Upload im Kontext-Builder   │
└──────────────────────────────────────────────────────┘
```

---

## Offene Punkte (vor Phase 4 entscheiden)

| Punkt | Optionen | Empfehlung |
|---|---|---|
| ~~Geschäftsmodell~~ | ~~Agentur-intern vs. SaaS~~ | ✅ **Entschieden: Agentur-intern / Single-Tenant** |
| Meta-Business-Verifizierung | Vor Phase 2 beantragen | **Sofort starten** |
| Canva Apps SDK | REST vs. Apps SDK für Design-Rendering | REST für Phase 2; Apps SDK als Phase 5 |
| DataForSEO-Validierung | PAA für 3 Praxis-URLs vorab testen | Vor Slice 11a |
| VPS-Kapazität | Läuft bis 2027-02-28 | Verlängerung oder Upgrade vor Launch |
| KT-Listenstrategie | Eine Liste vs. Tagging-Strategie | Separate Sublisten je Praxis empfohlen |
| WP-Varianten | Nicht alle Praxen nutzen WordPress | Jimdo/Wix: nur HTML-Export, kein API-Connector |
| Qualitäts-Trending | Ab wann sinnvoll? | Ab 3 Generierungen pro Projekt aktivieren |

---

## Slice-Übersicht Gesamt (27 Slices + Scaffolding)

| # | Name | Phase | Prio | Status |
|---|---|---|---|---|
| 16 | Auth & Nutzermanagement | 0 | P1 | ✅ |
| — | Scaffolding + Caddy + SSL + Kosten-Config | 0 | P1 | ✅ |
| 4 | API-Key-Manager | 1 | P1 | ⬜ **← nächster Schritt** |
| 11 | Scraper-Service | 1 | P1 | ⬜ |
| 2 | URL & alle Inputs | 1 | P1 | ⬜ |
| 3a | SSE-Infrastruktur | 1 | P1 | ⬜ |
| 3b | Prozess-Orchestrierung | 1 | P1 | ⬜ |
| 12 | KI-Themenplanung | 1 | P1 | ⬜ |
| 13 | KI-Texte | 1 | P1 | ⬜ |
| 5 | Ergebnisansicht | 1 | P1 | ⬜ |
| 9 | Export + HTML | 1 | P1 | ⬜ |
| 6 | Text-Editor | 2 | P1 | ⬜ |
| 8 | Chat & Versionen | 2 | P1 | ⬜ |
| 7 | Kalender-Ansicht | 2 | P2 | ⬜ |
| 10 | Kunden-Sharing | 2 | P2 | ⬜ |
| 11a | Keyword-Recherche (DataForSEO) | 2 | P2 | ⬜ |
| 17 | Canva-Integration | 2 | P2 | ⬜ |
| 18 | Social-Media-Draft-Posting | 2 | P2 | ⬜ |
| 19 | E-Mail-Benachrichtigungen | 2 | P2 | ⬜ |
| **27** | **Kosten-Tracking pro Kunde** | **3** | **P1** | ⬜ |
| **20** | **Hedy → Positionierungsdokument** | **3** | **P1** | ⬜ |
| **21** | **Praxis-Portal (lesen + kommentieren + freigeben)** | **3** | **P1** | ⬜ |
| **22** | **WordPress REST API Connector + HTML-Export** | **3** | **P1** | ⬜ |
| **23** | **Klick-Tipp Newsletter Connector** | **3** | **P1** | ⬜ |
| **24** | **KPI-Dashboard + Automatischer Monatsreport** | **3** | **P1** | ⬜ |
| **25** | **Fachgebiet-Templates + Klon-Funktion** | **3** | **P2** | ⬜ |
| **26** | **Token-Ablauf-Warnsystem** | **3** | **P2** | ⬜ |
| 14 | SEO-Analyse | 4 | P2 | ⬜ |
| 15 | Bildbriefing (erweitert) | 4 | P2 | ⬜ |

---

## Prompt-Format für jeden Cursor-Slice

```
GOAL: [Was soll dieser Slice leisten?]

FILES TO CHANGE:
- [Datei 1]
- [Datei 2]

REQUIREMENTS:
- [Anforderung 1]
- [Anforderung 2]

ACCEPTANCE CHECKLIST:
- [ ] [Testbares Kriterium 1]
- [ ] [Testbares Kriterium 2]

STOP CONDITIONS:
- [Was darf NICHT in diesem Slice passieren]
- Validierungs-URL: https://www.zahnzentrum-warendorf.de
- Kosten-Logging: jeder KI-Call schreibt CostEntry in DB mit Modell, Tokens und EUR
```

---

*– Ende des Implementierungsplans v6.1 – Phase 0 abgeschlossen · Nächster Schritt: Slice 4 (API-Key-Manager) –*
