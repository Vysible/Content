# CLAUDE.md — Vysible

## Was ist das?

Vysible ist eine browser-basierte KI-Content-Automationsplattform für Arzt- und Zahnarztpraxen im DACH-Raum. Single-Tenant, agentur-intern. Generiert 6-Monats-Content-Pakete (Blog, Newsletter, Social Media) aus einer Praxis-URL + Positionierungsdokument + Keywords.

Vollständige Anforderungen: `KI_Content_Plattform_Anforderungen_v6.0` (Konzeptdokument)  
Implementierungsplan: `docs/dev-prompts/plan-v6.1.md` (v6.1 — erweitert v6.0 um Slices 20–27)  
Architekturentscheidungen: `docs/decisions.md`  
Bekannte Abweichungen: `docs/forge-web-deviations.md`

## Aktueller Stand (Mai 2026)

**Forge-Web:** Integriert, Maturity `DEVELOPMENT`. Alle Regeln in `.windsurf/rules/` aktiv.

**Implementierungsstand (grob):**

| Phase | Status | Letzter Schritt |
|---|---|---|
| **0** Foundation | ✅ | Auth.js v5, Prisma, Docker, AES-256, YAML-Stubs |
| **1** Core MVP | ~70 % | Pipeline, SSE, Export, API-Keys, Share-Links implementiert |
| **2** Collaboration | ~45 % | Chat, Editor, Kalender, Social-Stubs, Canva-Stub, E-Mail-Stub |
| **3** Erweiterungen | ~15 % | Cost-Tracking, KPI-Dashboard, Praxis-Portal begonnen |
| **4** Quality & Scale | ~0 % | — |

**Nächste Prioritäten:**
1. ~~Sprint 0: Resilience-Fixes + `generation_jobs`-DB-Tabelle~~ ✅ Abgeschlossen (2026-05-14)
2. Sprint 1: Slice 28 — Audit-Log, Compliance-Gate (HWG), Review-Workflow (FA-B-11/12/13, FA-F-31)
3. Sprint 2: Tests (Vitest + Playwright E2E, NFA-16)

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript strict |
| Styling | Tailwind CSS |
| Auth | Auth.js v5 (Credentials Provider), bcrypt 12 Rounds |
| DB | PostgreSQL 16 (lokal + Prod via Docker) |
| ORM | Prisma 5 |
| KI | Anthropic SDK + OpenAI SDK |
| Verschlüsselung | AES-256-GCM für alle API-Keys (`lib/crypto/aes.ts`) |
| Scraping | Playwright-Microservice (`services/playwright/`) |
| Container | Docker / Docker Compose |
| Deploy | Coolify auf Hostinger VPS, Cloudflare Tunnel |
| Governance | Forge-Web 2.2.0 |

## Dateistruktur (Kernmodule)

```
app/
  (auth)/login/           Login-Seite
  (dashboard)/            Geschützter Agentur-Bereich
  (praxis)/review/[token] Praxis-Portal (read-only)
  api/                    API Route Handlers
lib/
  ai/                     Anthropic/OpenAI Clients
  crypto/aes.ts           AES-256-GCM (einzige Crypto-Stelle)
  generation/             Pipeline, Job-Store, Themes, Texts, SSE
  scraper/                HTTP-Client → Playwright-Service
  costs/                  CostEntry Tracking
  export/                 DOCX, PDF, XLSX, HTML, ZIP
  email/mailer.ts         nodemailer SMTP
  canva/, social/, dataseo/, wordpress/, klicktipp/, hedy/  Integrationen
prompts/*.yaml            KI-Prompts (nie im TypeScript-Code)
templates/*.yaml          Fachgebiet-Templates
prisma/schema.prisma      DB-Schema
```

## Governance-Regeln (verbindlich für alle KI-Agenten)

Die vollständigen Regeln liegen in `.windsurf/rules/` (Windsurf injiziert sie automatisch).  
Bei Arbeit **ohne Windsurf** (z.B. Claude API, ChatGPT, Cursor) gelten diese Kernprinzipien zwingend:

### Sicherheit
- **Keine Secrets im Code.** API-Keys, Passwörter, Tokens ausschliesslich via `process.env`. Nie hardcoden, nie committen.
- **Keine PII in Logs.** Nur IDs loggen, nie E-Mail, Name, Telefon.
- **AES-256-GCM** für alle externen API-Keys — einzige Stelle: `lib/crypto/aes.ts`.

### Resilience (IO-Calls)
- **Kein stiller Catch.** Jeder `catch`-Block muss loggen oder re-throwen — `catch {}` ist verboten.
- **Retry auf alle externen Calls.** `scrapeUrl`, AI-Calls, `sendMail` etc. über `lib/utils/retry.ts` (`withRetry`) wrappen.
- **Kein `rejectUnauthorized: false`** hardcoded — SSL-Verhalten immer via Config.

### Code-Qualität
- **Keine Duplikation.** Vor jedem neuen Helper/Funktion: prüfen ob bereits vorhanden.
- **Server vs. Client Components.** `'use client'` nur wenn Hooks oder Browser-APIs genutzt werden.
- **Daten-Fetch in Server Components**, nicht in Client Components (ausser bei User-Interaktion).

### Commits & Changelog
- **CHANGELOG.md** wird im selben Commit aktualisiert wie die Änderung — nie als Follow-up.
- **Kein Commit ohne explizite Anfrage** durch den Nutzer.

### Prompts
- **KI-Prompts gehören in `/prompts/*.yaml`** — nie als String im TypeScript-Code.
- **Vibe-Coding-Prompts** (Entwicklerprompts) in `docs/dev-prompts/`.

## Konventionen

- Deutsche UI-Texte, englische Code-Bezeichner
- `console.log('[Vysible]', ...)` mit Projekt-Prefix (bis strukturierter Logger eingeführt wird)
- Kein `var`, immer `const`/`let`
- Alle externen API-Keys AES-256-verschlüsselt, nie im Frontend
- Kein PII in Logs — nur IDs

## Sicherheits-Constraints

- **API-Keys:** AES-256-GCM, `encryptedKey` wird nie als Klartext zurückgegeben
- **Passwörter:** bcrypt 12 Rounds
- **Sessions:** JWT (1h) + Cookie maxAge 30 Tage, HTTP-only
- **Route-Schutz:** `middleware.ts` schützt alle Routen ausser `/login`, `/api/auth/*`, `/share/*`, `/api/healthz`
- **PII:** User.email/name in Plaintext (bekannte Abweichung, Timeline Sprint 3 — siehe `docs/forge-web-deviations.md`)

## Deployment

- **Production:** `https://vysible.cloud` (Coolify auto-deploys on push to `main`)
- **DNS:** A-record → Hostinger VPS (Cloudflare Tunnel, kein offener Port)
- **VPS läuft bis:** 2027-02-28
