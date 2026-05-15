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
| `schicht-0/resilience` (§3a) — Restbestand stiller Catches | 2026-05-14 | 2.2.0 | Accepted | Zwei stille `.catch(() => {})` aus Slices 25/26, eingeführt vor Forge-Migration: `components/wizard/TemplateSelector.tsx:23`. (`components/layout/TokenWarningBanner.tsx:21` geschlossen in Sprint P3-H. `lib/tokens/expiry-checker.ts:21` war bereits vor Sprint P3-H gefixt — Eintrag war stale. `lib/klicktipp/client.ts:34` geschlossen in Sprint P3-E. `lib/costs/reporter.ts:56` geschlossen in Sprint P3-F.) | Sprint P3-G (TemplateSelector, geplant) |

---

## Geschlossene Abweichungen

| Rule-ID | Datum geschlossen | Massnahme |
|---|---|---|
| `schicht-0/resilience` (§3a) — `sendNotification(...).catch(() => {})` in `lib/generation/pipeline.ts` | 2026-05-14 | Sprint 0 (Commit `b5c80f2`): catch loggt nun via `logger.error({ err }, '…')` und blockiert die Pipeline nicht (`pipeline.ts:235-237`). |
| `schicht-0/resilience` (§3a) — `checkScraperHealth` bare catch | 2026-05-14 | Sprint 0 (Commit `b5c80f2`): catch loggt via `logger.warn({ err }, 'Scraper-Health-Check fehlgeschlagen')` (`lib/scraper/client.ts:65-67`). |
| `schicht-0/resilience` (§3c) — fehlender Retry-Wrapper | 2026-05-14 | Sprint 0 (Commit `b5c80f2`): `withRetry` in `lib/utils/retry.ts` eingeführt; auf `scrapeUrl`, AI-Calls und `sendMail` angewendet. |
| `schicht-0/resilience` (§3a) — `components/wizard/TemplateSelector.tsx:23` stiller Catch | 2026-05-15 | Sprint P3-G: `.catch(() => {})` durch `console.warn('[Vysible] Templates konnten nicht geladen werden', err)` ersetzt. |
| `schicht-2/web-encryption-at-rest` (User.email/name Plaintext) | 2026-05-14 | Sprint 3: `emailEncrypted`/`nameEncrypted` in `User` und `PraxisUser` via Prisma-Migration hinzugefügt. `scripts/migrate-pii.ts` für idempotente Datenmigration. |
| `schicht-2/web-encryption-at-rest` (Versions-Präfix) | 2026-05-14 | Sprint 3: `lib/crypto/aes.ts` mit `v1:`-Präfix und abwärtskompatiblem `decrypt()` aktualisiert. |
| `schicht-0/terminal-output` | 2026-05-14 | Sprint 3: `pino`-Logger in `lib/utils/logger.ts` eingeführt, PII-Redaction konfiguriert. |
| `/api/debug` unauthentifiziert | 2026-05-14 | Auth-Check hinzugefügt |
| `/api/setup` Plaintext-Passwort in Response | 2026-05-14 | `password`-Feld aus Response entfernt |

---

## Hinweise

- `Status: Accepted` bedeutet: Abweichung ist bekannt, begründet und zeitlich eingeplant.
- Neue Abweichungen entstehen wenn `forge-web sync` Konflikte in forge-managed Dateien meldet (Exit-Code 4).
- Workflow: `forge-web sync --report-only` → Dokumentieren → `Status: Accepted` setzen → `forge-web sync --force`.
