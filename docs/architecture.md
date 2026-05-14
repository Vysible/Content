# Architektur — Vysible

> Autoritative Quelle für Architektur-Übersicht.
> Entscheidungen mit Begründung: `docs/decisions.md`.
> Abweichungen von Forge-Regeln: `docs/forge-web-deviations.md`.

---

## System-Übersicht

Vysible ist eine Single-Tenant-SaaS-Plattform (agentur-intern) zur vollautomatisierten Erstellung von Content-Marketing-Paketen für Arzt- und Zahnarztpraxen.

```
Browser
  └── Next.js 14 App (Port 3000)
        ├── Auth.js v5 (JWT, HTTP-only Cookie)
        ├── API Routes (app/api/)
        ├── Server Components (Datenzugriff via Prisma)
        └── Client Components (SSE-Streaming, Editor, Chat)

Next.js App
  ├── PostgreSQL 16 (via Prisma 5)
  ├── Playwright-Service (Port 3001, eigener Container)
  └── Externe APIs
        ├── Anthropic / OpenAI (KI-Generierung)
        ├── Canva Connect REST API (Asset-Listing, read-only)
        ├── Meta Graph API (Facebook/Instagram Drafts)
        ├── LinkedIn REST API (Post Drafts)
        ├── DataForSEO API (PAA + Autocomplete)
        ├── WordPress REST API v2 (Blog Drafts)
        ├── KlickTipp REST API (Newsletter-Kampagnen)
        └── Hedy Bot API (Transkript-Import)
```

## Deployment-Topologie (Produktion)

```
Internet
  └── Cloudflare Tunnel (kein offener Port)
        └── vysible.cloud → localhost:3000
              └── Coolify (Hostinger VPS, Ubuntu 24.04)
                    ├── Next.js App (Docker, standalone)
                    ├── PostgreSQL 16-alpine (Coolify-managed)
                    └── Playwright-Service (Docker, mem_limit: 512MB)
```

**VPS läuft bis:** 2027-02-28

## Tech-Stack

| Schicht | Technologie | Begründung |
|---|---|---|
| Framework | Next.js 14 App Router, TypeScript strict | SSR, API-Routes, Server Components |
| Styling | Tailwind CSS | Utility-first, kein CDN |
| Auth | Auth.js v5 (Credentials) | Next.js-native, Rollen, JWT, Cookie |
| DB | PostgreSQL 16 | Mehrbenutzer, Concurrency, ab Phase 0 (kein SQLite) |
| ORM | Prisma 5 | Typsichere Queries, Migrations |
| KI | Anthropic SDK + OpenAI SDK | Provider-agnostisch via Key-Manager |
| Scraping | Playwright (Chromium) | Einzige Option für JS-gerenderte Seiten |
| Streaming | SSE via Next.js API Route | Native Browser-Support, Polling-Fallback |
| Crypto | AES-256-GCM (node:crypto) | Envelope-Encryption für alle API-Keys |
| E-Mail | nodemailer (SMTP) | Kein Cloud-Mail-Service (DSGVO) |
| Export | xlsx + docx + pdfkit + jszip | Stabile Libraries, kein puppeteer |
| Paketmanager | pnpm 9 | Schnell, deterministisch |
| Governance | Forge-Web 2.2.0 | Regel-Sync, Maturity `DEVELOPMENT` |

## Datenmodell (Kernentitäten)

```
User (ADMIN | STAFF)
  └── ApiKey (AES-verschlüsselt: ANTHROPIC, OPENAI, DATASEO, CANVA, ...)
  └── Project
        ├── ShareLink (passwortgeschützt, Ablaufdatum)
        ├── PraxisUser (Token-basierte Einladung)
        ├── Comment
        ├── CostEntry (pro KI-Call: Modell, Tokens, EUR)
        └── CostReport (monatliche Aggregation)
```

**Fehlende Tabellen (geplant):**
- `generation_jobs` — DB-persistierter Job-State (NFA-18, Sprint 0)
- `audit_log` — Compliance-Log aller Aktionen (FA-B-11, Sprint 1 / Slice 28)

## KI-Generation-Pipeline

```
/api/generate/start
  └── createJob() → In-Memory JobState (→ DB-Migration Sprint 0)
        └── runGenerationPipeline()
              ├── scrape_done       → Playwright-Service → scrapedData in DB
              ├── positioning_injected → context-builder.ts
              ├── canva_loaded      → (Stub, Canva-Context fehlt noch)
              ├── pool_loaded       → themenPool aus Project
              ├── keywords_loaded   → keywords aus Project
              ├── themes_done       → generateThemes() → Anthropic → ThemenItem[]
              ├── plans_done        → (Redaktionsplan-Aggregation)
              └── texts_done        → generateTexts() → Blog/Newsletter/Social/Bildbriefing
                    └── textResults in DB, status → ACTIVE

SSE-Stream: /api/generate/stream/[jobId]
Retry ab fehlgeschlagenem Schritt: /api/generate/retry/[jobId]
```

**KI-Kontext-Priorität:**
1. Positionierungsdokument (max. 4.000 Tokens)
2. Canva-Asset-Kontext (Stub, noch nicht injiziert)
3. Keyword/PAA-Input
4. Themen-Pool
5. Homepage-Analyse (Scrape-Result)

## Sicherheits-Constraints

- **API-Keys:** AES-256-GCM, `encryptedKey` nie als Klartext zurückgegeben
- **Passwörter:** bcrypt 12 Rounds
- **Sessions:** JWT (1h) + HTTP-only Cookie (maxAge 30 Tage)
- **Route-Schutz:** `middleware.ts` — Ausnahmen: `/api/auth/*`, `/api/share/*`, `/api/praxis/*`, `/api/healthz`, `/api/setup`, `/share/*`
- **PII:** `User.email`, `User.name`, `PraxisUser.email` in Plaintext (bekannte Abweichung, Timeline Sprint 3)
- **HTTPS:** Cloudflare Tunnel (Prod), mkcert (Dev)

## Prompts & Templates

Alle KI-Prompts ausschliesslich in `/prompts/*.yaml` — nie im TypeScript-Code.
Fachgebiet-Templates in `/templates/*.yaml` — editierbar ohne Deployment.

```
prompts/
  themes.yaml         Themenplanung (ThemenItem-Schema)
  blog.yaml           Blog-Texterstellung
  newsletter.yaml     Newsletter-Texterstellung
  social.yaml         Social-Media-Posts
  image-brief.yaml    Bildbriefing
  positioning.yaml    Hedy-Transkript → Positionierungsdokument

templates/
  zahnarzt.yaml       Vorbelegte Keywords, saisonale Themen
  kfo.yaml
  gynaekologe.yaml
```
