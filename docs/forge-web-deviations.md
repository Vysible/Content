# Forge-Web Deviations

Dokumentierte Abweichungen von Forge-Web-Regeln.
Alle Einträge mit `Status: Pending` blockieren einen PR-Merge.

Forge-Web-Version bei Migration: **2.2.0**  
Migrations-Datum: **2026-05-14**

---

## Offene Abweichungen

| Rule-ID | Datum | forge-web-Version | Status | Begründung | Timeline |
|---|---|---|---|---|---|
| `schicht-2/web-encryption-at-rest` | 2026-05-14 | 2.2.0 | Accepted | `User.email`, `User.name`, `PraxisUser.email`, `PraxisUser.name` liegen als Plaintext in PostgreSQL. API-Keys sind korrekt mit AES-256-GCM verschlüsselt. PII-Verschlüsselung erfordert Prisma-Migration + Datenmigration und ist als Sprint-3-Aufgabe geplant. | Sprint 3 |
| `schicht-0/resilience` (§3a) | 2026-05-14 | 2.2.0 | Accepted | `sendNotification(...).catch(() => {})` in `lib/generation/pipeline.ts:172` ist ein stiller Catch. `checkScraperHealth` in `lib/scraper/client.ts` hat bare `catch { return false }`. Beides wird in Sprint 0 behoben. | Sprint 0 |
| `schicht-0/resilience` (§3c) | 2026-05-14 | 2.2.0 | Accepted | Kein Retry-Wrapper auf externen IO-Calls (`scrapeUrl`, AI-Calls, `sendMail`). Exponentieller Backoff fehlt (NFA-06 des Konzeptdokuments). Wird in Sprint 1 implementiert. | Sprint 1 |
| `schicht-0/terminal-output` | 2026-05-14 | 2.2.0 | Accepted | `console.log`/`console.error` statt strukturiertem JSON-Logger (NFA-11). Kein `pino` oder `winston`. Wird in Sprint 1 eingeführt. | Sprint 1 |
| `schicht-2/web-encryption-at-rest` (Versions-Präfix) | 2026-05-14 | 2.2.0 | Accepted | `lib/crypto/aes.ts` hat kein Versions-Präfix (`v1:`) im verschlüsselten String. Key-Rotation ist damit nicht transparent möglich. Muss vor dem ersten Key-Rotations-Bedarf ergänzt werden. | Sprint 3 |

---

## Geschlossene Abweichungen

| Rule-ID | Datum geschlossen | Massnahme |
|---|---|---|
| `/api/debug` unauthentifiziert | 2026-05-14 | Auth-Check hinzugefügt |
| `/api/setup` Plaintext-Passwort in Response | 2026-05-14 | `password`-Feld aus Response entfernt |

---

## Hinweise

- `Status: Accepted` bedeutet: Abweichung ist bekannt, begründet und zeitlich eingeplant.
- Neue Abweichungen entstehen wenn `forge-web sync` Konflikte in forge-managed Dateien meldet (Exit-Code 4).
- Workflow: `forge-web sync --report-only` → Dokumentieren → `Status: Accepted` setzen → `forge-web sync --force`.
