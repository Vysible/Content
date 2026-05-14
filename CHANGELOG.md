# Changelog

Alle relevanten Änderungen an Vysible werden hier dokumentiert.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

## [Unreleased]

### Added
- Sprint 1 — Slice 28 (Compliance & Governance):
  - `AuditLog`-Tabelle: vollständiges Aktivitätsprotokoll pro Projekt mit Action, Entity, User, Meta (FA-B-11)
  - `lib/audit/logger.ts`: `writeAuditLog()` — zentraler Audit-Service, eingebunden in project.create, export.download, review mode/flag changes
  - `ReviewMode`-Enum + `reviewMode`-Feld in `Project`: SIMPLE / COMPLETE Review-Workflow (FA-F-31)
  - `hwgFlag`-Boolean in `Project`: Heilmittelwerbegesetz-Compliance-Flag — blockiert Export wenn gesetzt (FA-B-13)
  - `PATCH /api/projects/[id]/review`: Review-Modus und HWG-Flag setzen mit Audit-Log
  - `GET /api/projects/[id]/audit`: Audit-Log-Einträge pro Projekt abrufen (max. 100, neueste zuerst)
  - `components/project/ReviewPanel.tsx`: Client-Komponente zum Umschalten von ReviewMode und HWG-Flag
  - `components/project/AuditLogTab.tsx`: Aktivitätsprotokoll-Tab auf der Projekt-Detailseite (FA-F-32)
  - `/api/projects GET`: Filtert jetzt auf `createdById === session.user.id` — nur eigene Projekte (FA-B-12)
- Navigation: „Praxis-Portal" und „Web-Analytics" in Sidebar eingetragen (Seiten waren implementiert, fehlten nur in `navItems`)
- `GenerationJob`-Tabelle in Prisma: Job-State wird jetzt DB-persistiert — kein Reload-Verlust mehr (NFA-18)
- `SmtpConfig`-Tabelle in Prisma: SMTP-Konfiguration in eigenem Modell statt HEDY-ApiKey-Hack
- `lib/utils/retry.ts`: Gemeinsamer `withRetry`-Wrapper mit exponentiellem Backoff (3 Versuche, 2s/4s/8s)
- `withRetry` auf alle externen IO-Calls angewendet: `scrapeUrl`, `generateThemes`, `generateBlogPost`, `generateNewsletter`, `generateSocialPosts`, `generateImageBrief`, `sendMail` (NFA-06, `resilience.mdc §3c`)
- Forge-Web Consumer-Setup (`forge-web.config.json`, `.github/workflows/forge-sync.yml`)
- Forge-Web Regel-Sync: 14 Governance-Regeln in `.cursor/rules/` und `.windsurf/rules/`
- Maturity-Level `DEVELOPMENT` gesetzt
- Governance-Dokumentation: `docs/decisions.md`, `docs/component-ownership.md`, `docs/forge-web-deviations.md`
- Architektur-Audit und Konzept-Vergleich: `docs/forge-migration-audit.md`, `docs/concept-vs-implementation.md`

### Fixed
- Playwright-Service: `playwright` npm-Abhängigkeit von `^1.49.1` auf exakte Version `1.60.0` gepinnt und `package-lock.json` committet — verhindert automatisches Upgrade auf inkompatible Browser-Binaries bei `npm install`
- `sendNotification(...).catch(() => {})` in `pipeline.ts`: Fehler werden jetzt geloggt statt stumm verworfen (`resilience.mdc §3a`)
- `checkScraperHealth` in `scraper/client.ts`: Bare `catch` durch `catch (err)` mit Warning-Log ersetzt
- DataForSEO-Client: 2 stille Catches mit Warning-Logs versehen (Autocomplete + PAA)
- `blog.yaml`: Variable `{{tonalitaet}}` wurde nicht ersetzt (Key-Mismatch mit `tonalität`)

### Changed
- `job-store.ts`: In-Memory-Store auf DB-backed Hybrid-Store umgestellt (EventEmitter bleibt in-memory für SSE, State in `GenerationJob`)
- `mailer.ts`: Liest SMTP-Konfiguration jetzt aus `SmtpConfig`-Tabelle statt aus zweckentfremdetem HEDY-`ApiKey`-Eintrag
- `themes.ts`: Manueller Retry-Loop durch gemeinsamen `withRetry`-Wrapper ersetzt
- Queue-Modul (`queue.ts`): `tryEnqueue` ist jetzt async (DB-Schreibzugriffe für Status-Updates)
- Alle `emitEvent`/`setStatus`-Aufrufe in API-Routes und Pipeline auf `await` aktualisiert

### Security
- `/api/debug`: Auth-Check hinzugefügt — Endpoint war unauthentifiziert erreichbar
- `/api/setup`: Plaintext-Passwort aus HTTP-Response entfernt

## [0.1.0] — 2026-05

### Added
- Next.js 14 App Router mit TypeScript strict mode
- Auth.js v5 (Credentials Provider), bcrypt 12 Rounds, JWT-Sessions
- PostgreSQL via Prisma 5 (Docker Compose lokal, Coolify Prod)
- AES-256-GCM Envelope-Encryption für alle API-Keys
- Playwright-Scraper als eigenständiger Microservice mit robots.txt-Check
- KI-Generation-Pipeline: Themenplanung → Texte → Bildbriefings via SSE-Streaming
- YAML-Prompts (themes, blog, newsletter, social, image-brief, positioning)
- Zod-Schema-Validierung für KI-Output inkl. HWG-Flag und Qualitätsschwellen
- API-Key-Manager: Named Keys pro Provider, Test-Call, AES-256 verschlüsselt
- Praxis-Portal: Token-basierte Einladung, Kommentar-Thread, Freigabe-Workflow
- Share-Links: passwortgeschützt (bcrypt), Ablaufdatum
- Export: ZIP, DOCX, PDF, XLSX, HTML
- Cost-Tracking: CostEntry pro KI-Call mit Modell, Tokens, EUR, Step
- Cron-Jobs: monatlicher Cost-Report, tägliche Token-Expiry-Prüfung
- E-Mail-Benachrichtigungen via nodemailer (Trigger: generation_complete)
- Social-Media-Stubs: Meta Graph API (Facebook/Instagram), LinkedIn UGC
- Canva-Integration: Asset-Listing (read-only) via Connect REST API
- DataForSEO-Client: PAA-Fragen + Autocomplete
- Fachgebiet-Templates: zahnarzt.yaml, kfo.yaml, gynaekologe.yaml
- Docker multi-stage Dockerfile, docker-compose.yml, docker-compose.prod.yml
- Coolify-kompatibles Deployment (Cloudflare Tunnel, kein offener Port)
