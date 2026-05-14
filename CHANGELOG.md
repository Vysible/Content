# Changelog

Alle relevanten Änderungen an Vysible werden hier dokumentiert.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

## [Unreleased]

### Added
- `docs/dev-prompts/Pre_Sprint_Review.md` (v2.0.0) — fachliche Sprint-Prompt-Prüfung
  durch Maintainer + Cursor vor Übergabe an den Implementierungs-Agent. 8 Checks
  (Scope, Abhängigkeiten, ADRs, Forge-Regeln, FA-/NFA-IDs, Code-Realität, Acceptance,
  Risiken), verbindliche Check-Reihenfolge, GO/WARN/FAIL-Schwellwerte mit
  Eskalations-Pfaden, Pflicht zu min. 2 Optionen in der Empfehlung.
- `docs/dev-prompts/sprint-p2a-editor-chat.md` — Sprint-Prompt P2-A (Slice 6 + 8).
- `docs/dev-prompts/sprint-p2b-kalender-sharing.md` — Sprint-Prompt P2-B (Slice 7 + 10).
- `docs/dev-prompts/sprint-p2c-email.md` — Sprint-Prompt P2-C (Slice 19).

### Changed
- `docs/dev-prompts/Pre_Slice_Validation.md` (v1.1.0) — Check E (Vitest) aktiviert,
  da Sprint 2 abgeschlossen. Abgrenzung zum neuen `Pre_Sprint_Review.md` ergänzt.

### Added (Sprints)
- Slice 4 — API-Key-Manager Erweiterungen (Phase-1-Restarbeiten):
  - Pro-Projekt-Key-Auswahl (FA-F-11a): `Project.apiKeyId` (nullable FK zu `ApiKey`), Prisma-Migration `20260514211000_project_api_key_selection`
  - `lib/ai/client.ts` MOD: `getAnthropicClient(projectApiKeyId?)` und `getOpenAIClient(projectApiKeyId?)` — projektspezifischer Key mit globalem Default-Fallback
  - Pipeline, themes.ts, texts.ts: `project.apiKeyId` wird an AI-Client weitergereicht
  - `/api/projects/[id]/settings` (GET/PATCH): apiKeyId lesen und speichern
  - `/projects/[id]/settings` UI: Dropdown zur Key-Auswahl pro Provider (Anthropic, OpenAI)
  - API-Keys-Seite: `SocialTokenStatusSection` — zeigt Canva-Token-Status (gültig/abgelaufen) mit "Bitte erneuern"-Hinweis
  - `lib/types/prisma.ts` MOD: `apiKeyId` im Project-Interface ergänzt

- Slice 16 — Auth-Lücken (Phase-1-Restarbeiten):
  - Passwort-Vergessen-Flow: `/api/auth/forgot-password` (Token-Generierung + SMTP), `/api/auth/reset-password` (Token-Validierung + bcrypt-Hash), `app/(auth)/reset-password/page.tsx` (Reset-Formular)
  - Login-Seite: "Passwort vergessen?"-Link + Inline-Formular ohne Seitennavigation
  - Prisma-Migration `20260514210000_auth_reset_token`: `User.resetToken`, `User.resetTokenExpiry` (nullable, Single-Use, 1h Ablauf)
  - Admin-User-Verwaltung: `GET /api/admin/users`, `PATCH /api/admin/users/[id]` (active, role), UI unter `/settings/users` (nur Admins sichtbar)
  - `components/auth/AutoLogoutProvider.tsx`: Client-Komponente mit 30-Min-Inaktivitäts-Timer (reset bei click/keypress/mousemove/scroll/touchstart)
  - Dashboard-Layout: `AutoLogoutProvider` eingebunden
  - AuditAction-Typen: `admin.user.update`, `admin.user.create` ergänzt

- Sprint 3 — PII-Encryption & Structured Logging:
  - `lib/utils/logger.ts` — Pino-Logger (strukturiertes JSON-Logging, PII-Redaction für email/password/name/encryptedKey)
  - `lib/crypto/aes.ts` MOD: Versions-Präfix `v1:` im Ciphertext-Format (Key-Rotation-vorbereitet)
  - `lib/crypto/aes.ts` MOD: `decrypt()` abwärtskompatibel (erkennt Legacy-Format ohne `v1:`)
  - Prisma-Migration `20260514202000_pii_encryption_fields`: `User.emailEncrypted`, `User.nameEncrypted`, `PraxisUser.emailEncrypted`, `PraxisUser.nameEncrypted` (AES-256-GCM, nullable)
  - `scripts/migrate-pii.ts` — idempotentes Datenmigrations-Skript (Plaintext → AES-256-GCM)
  - Alle `console.*`-Calls in `lib/` ersetzt durch strukturierte `logger.*`-Calls

### Fixed
- `docs/forge-web-deviations.md`: Abweichungen `User.email Plaintext`, `web-encryption-at-rest Versions-Präfix` und `terminal-output` auf Status Resolved gesetzt (Sprint 3)
- Sidebar: Menüpunkt "Ergebnisansicht" (`/results`) wiederhergestellt — war in Commit `fd71beb` versehentlich entfernt worden; Icon und Reihenfolge entsprechen wieder dem Stand vor dem Verlust
- Production-Deploy (`vysible.cloud`): Root Cause identifiziert — Coolify-App `f58gu47l7uwwchjhhd25c0gy` lief seit Stunden auf Commit `90948c4`; manueller Re-Deploy über SSH ausgelöst

### Added (Sprint 2)
- Sprint 2 — Test-Infrastruktur (NFA-16):
  - Vitest 4 Setup: `vitest.config.ts`, Prisma-Mock in `__tests__/setup.ts`, Coverage-Provider v8 (60 %-Schwelle)
  - Unit-Tests: `lib/crypto/aes.ts` — AES-256-GCM Roundtrip, IV-Zufälligkeit, Fehlerfälle (6 Cases)
  - Unit-Tests: `lib/generation/themes-schema.ts` — Schema-Validierung (5 Cases)
  - Unit-Tests: `lib/compliance/hwg-gate.ts` — HWG-Gate Logik (2 Cases)
  - Unit-Tests: `lib/utils/retry.ts` — Exponential-Backoff, 404/429-Handling (5 Cases)
  - Integration-Test: `POST /api/generate/start` — Mock-AI, Job-Anlage, Fehlerpfade (4 Cases)
  - E2E Playwright: Login-Flow — `__tests__/e2e/login.spec.ts` (läuft lokal gegen Dev-Server)
  - GitHub Actions CI: `.github/workflows/ci.yml` — lint + typecheck + vitest (E2E nicht in CI)
  - `lib/compliance/hwg-gate.ts`: `checkHwgGate()` extrahiert aus Export/WordPress-Route — testbar + dedupliziert
  - `app/(auth)/login/page.tsx`: `data-testid="login-error"` für E2E-Playwright ergänzt

- Sprint 1 — Slice 28 (Compliance & Governance):
  - `AuditLog`-Tabelle: vollständiges Aktivitätsprotokoll pro Projekt mit Action, Entity, User, Meta (FA-B-11)
  - `lib/audit/logger.ts`: `writeAuditLog()` — zentraler Audit-Service, eingebunden in project.create, export.download, review mode/flag changes
  - `ReviewMode`-Enum + `reviewMode`-Feld in `Project`: SIMPLE / COMPLETE Review-Workflow (FA-F-31)
  - `hwgFlag`-Boolean in `Project`: Heilmittelwerbegesetz-Compliance-Flag — blockiert Export wenn gesetzt (FA-B-13)
  - `PATCH /api/projects/[id]/review`: Review-Modus und HWG-Flag setzen mit Audit-Log
  - `GET /api/projects/[id]/audit`: Audit-Log-Einträge pro Projekt abrufen (max. 50, neueste zuerst)
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
- Slice 28 Post-Audit Korrekturen:
  - HWG-Gate in `app/api/wordpress/draft/route.ts` ergänzt — WordPress-Drafts werden bei gesetztem `hwgFlag` mit 403 blockiert (analog Export-Route)
  - `writeAuditLog('generation.start')` in `app/api/generate/start/route.ts` ergänzt — Generierungsstarts werden jetzt protokolliert (FA-B-11)
  - `writeAuditLog('api_key.create')` in `app/api/api-keys/route.ts` ergänzt — API-Key-Anlage wird protokolliert (FA-B-11)
  - PII-Leak behoben: `GET /api/projects/[id]/audit` gibt nicht mehr `userEmail` zurück — nur noch `userId`
  - `AuditLogTab.tsx`: `userEmail` aus Render entfernt; Interface auf `userId` umgestellt
  - `GET /api/projects/[id]/audit`: Limit von 100 auf 50 korrigiert; 404-Guard für ungültige projectId ergänzt; Response-Format auf `{ logs }` vereinheitlicht
  - `PATCH /api/projects/[id]/review`: Ownership-Check ergänzt (403 bei fremden Projekten); `.refine()`-Validierung für leere Body-Payloads ergänzt
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
