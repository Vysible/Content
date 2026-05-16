# Forge-Web Deviations

Dokumentierte Abweichungen von Forge-Web-Regeln.
Alle Einträge mit `Status: Pending` blockieren einen PR-Merge.

Forge-Web-Version bei Migration: **2.2.0**  
Migrations-Datum: **2026-05-14**

---

## Offene Abweichungen

| Rule-ID | Datum | forge-web-Version | Status | Begründung | Timeline |
|---|---|---|---|---|---|
| `schicht-0/resilience` (§3a) — Client-Component-Logger | 2026-05-14 | 2.2.0 | Accepted | Client-Components nutzen `console.warn/error('[Vysible] …')` statt `logger.*`, weil `lib/utils/logger.ts` (`pino` mit `pino-pretty`-Transport) nur Server-side funktioniert. Konsistent mit AGENTS.md-Konvention. Alle catches loggen explizit — kein stiller Catch. Browser-tauglicher Logger (z.B. `pino/browser` oder isomorpher Wrapper) wird separat eingeführt. | Backlog |
| `schicht-2/web-env-validation` — Kein zentrales `env.ts` | 2026-05-16 | 2.2.0 | Accepted | Kein `env.ts` mit Zod-Validierung vorhanden. Raw `process.env` in: `lib/canva/auth.ts`, `lib/crypto/aes.ts`, `lib/generation/config.ts`, `lib/praxis/session.ts`, `lib/scraper/client.ts`, `lib/costs/reporter.ts`, `lib/tokens/expiry-checker.ts`, `lib/unsplash/client.ts`, 5 API Routes. Applikation wirft zur Laufzeit wenn Vars fehlen — kein Fail-Fast. Ausnahmen: `process.env.NODE_ENV` (Framework-Konstante, per Regel exempt). | Sprint 3 |
| `schicht-2/web-api-route-discipline §2` — Direkte `prisma`-Imports in allen Route-Handlern | 2026-05-16 | 2.2.0 | Accepted | Alle 49 `app/api/**/*.ts` Route-Handler importieren `prisma` direkt aus `@/lib/db` und enthalten DB-Calls oder Business-Logic inline. Keine Service-Schicht. Refactoring ist eine grössere Umstrukturierung — wird im Kontext von Sprint 4 (Quality & Scale) adressiert. Bis dahin: neue Routes müssen Business-Logic in `lib/`-Module auslagern. | Sprint 4 |
| `schicht-2/web-sse-pattern §3` — SSE-Fehler als `data:{type:'error'}` statt named `event: error` | 2026-05-16 | 2.2.0 | Accepted | `app/api/generate/stream/[jobId]/route.ts` sendet alle Events (inkl. Fehler) als `data: ${JSON.stringify(event)}\n\n`. Die Regel fordert `event: error\ndata: ...\n\n` (named SSE events). Die aktuelle Implementierung ist in sich konsistent: `lib/hooks/useGenerationStream.ts` liest via `es.onmessage` und wertet `event.type === 'error'` im JSON aus. Ein Wechsel auf named Events erfordert koordinierte Änderungen in Server + Client und bietet keinen funktionalen Mehrwert bei Single-Consumer-SSE. | Backlog |

---

## Geschlossene Abweichungen

| Rule-ID | Datum geschlossen | Massnahme |
|---|---|---|
| `schicht-0/resilience` (§3a) — `sendNotification(...).catch(() => {})` in `lib/generation/pipeline.ts` | 2026-05-14 | Sprint 0 (Commit `b5c80f2`): catch loggt nun via `logger.error({ err }, '…')` und blockiert die Pipeline nicht (`pipeline.ts:235-237`). |
| `schicht-0/resilience` (§3a) — `checkScraperHealth` bare catch | 2026-05-14 | Sprint 0 (Commit `b5c80f2`): catch loggt via `logger.warn({ err }, 'Scraper-Health-Check fehlgeschlagen')` (`lib/scraper/client.ts:65-67`). |
| `schicht-0/resilience` (§3c) — fehlender Retry-Wrapper | 2026-05-14 | Sprint 0 (Commit `b5c80f2`): `withRetry` in `lib/utils/retry.ts` eingeführt; auf `scrapeUrl`, AI-Calls und `sendMail` angewendet. |
| `schicht-0/resilience` (§3a) — `components/wizard/TemplateSelector.tsx:23` stiller Catch | 2026-05-15 | Sprint P3-G: `.catch(() => {})` durch `console.warn('[Vysible] Templates konnten nicht geladen werden', err)` ersetzt. Letzter verbleibender Punkt der Restbestand-Kategorie — Kategorie damit vollständig geschlossen. |
| `schicht-0/resilience` (§3a) — `SocialTokenStatusSection.tsx:42` stiller Catch | 2026-05-15 | Sprint P2-F: `.catch(() => {})` durch `console.warn('[Vysible] Social-Token-Status konnte nicht geladen werden', err)` ersetzt. |
| `schicht-2/web-encryption-at-rest` (User.email/name Plaintext) | 2026-05-14 | Sprint 3: `emailEncrypted`/`nameEncrypted` in `User` und `PraxisUser` via Prisma-Migration hinzugefügt. `scripts/migrate-pii.ts` für idempotente Datenmigration. |
| `schicht-2/web-encryption-at-rest` (Versions-Präfix) | 2026-05-14 | Sprint 3: `lib/crypto/aes.ts` mit `v1:`-Präfix und abwärtskompatiblem `decrypt()` aktualisiert. |
| `schicht-0/terminal-output` | 2026-05-14 | Sprint 3: `pino`-Logger in `lib/utils/logger.ts` eingeführt, PII-Redaction konfiguriert. |
| `/api/debug` unauthentifiziert | 2026-05-16 | R-01: `requireAuth()` in `app/api/debug/route.ts:7` hinzugefügt (Audit-Fix). |
| `/api/setup` Plaintext-Passwort in Response | 2026-05-16 | R-02: `password`-Feld aus Response in `app/api/setup/route.ts:29-33` entfernt (Audit-Fix). |

---

## Audit-Log

| Datum | Durchgeführt von | Befund |
|---|---|---|
| 2026-05-16 | Cascade (Windsurf Agent) | R-01, R-02 als Regressions identifiziert und direkt behoben. N-01 (`web-env-validation`) und N-02 (`web-api-route-discipline §2`) als neue systemic violations erfasst (Accepted). Resilience, SSE-Pattern, Encryption, OAuth: konform. |
| 2026-05-16 | Cascade (Windsurf Agent) | Vollständiger Forge-Sync-Audit. V-01 (`useGenerationStream.ts:53+97` — Silent catches) und V-02 (`themes.ts:135` — Silent catch) direkt behoben. V-03 (`web-sse-pattern §3` — named events) als Accepted-Deviation dokumentiert. Alle anderen Regeln (§3b SSL, §3c Retry, OAuth-Tokens, Encryption, Server/Client-Separation, Secrets): vollständig konform. |

---

## Hinweise

- `Status: Accepted` bedeutet: Abweichung ist bekannt, begründet und zeitlich eingeplant.
- Neue Abweichungen entstehen wenn `forge-web sync` Konflikte in forge-managed Dateien meldet (Exit-Code 4).
- Workflow: `forge-web sync --report-only` → Dokumentieren → `Status: Accepted` setzen → `forge-web sync --force`.
