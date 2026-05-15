# Offene Punkte

## Sprint P2-E — Canva (externe Einmal-Aktionen, benötigen kein Deployment)

1. **Canva Developer Portal: OAuth-App anlegen + Redirect-URIs registrieren**

   Einmalige manuelle Aktion unter https://www.canva.com/developers/ :
   - Neue App anlegen (OAuth 2.0, Scope: `asset:read design:content:read`).
   - Redirect-URIs eintragen:
     - Dev:  `http://localhost:3000/api/canva/oauth/callback`
     - Prod: `https://vysible.cloud/api/canva/oauth/callback`
   - `CANVA_CLIENT_ID` und `CANVA_CLIENT_SECRET` aus dem Portal in `.env`
     (lokal) und in Coolify (Prod → Environment Variables) eintragen.
   - Vorlage: `.env.example` — Abschnitt "Canva OAuth 2.0".

2. ~~**`prisma migrate deploy` für `CanvaToken`-Migration gegen Live-DB**~~
   **✅ Erledigt (2026-05-15)** — Migration `20260515090000_canva_oauth_token`
   ist applied (DB-Container `s7q3ix0pj9ztc2n8koblu0dz`, finished_at 07:55 UTC).
   Alle 7 Migrationen auf der Live-DB sind konsistent.

---

## Sprint 2

1. **GitHub Actions Secret anlegen** (einmalig, im GitHub-Repo):
   - `Settings → Secrets → Actions → New repository secret`
   - Name: `TEST_ENCRYPTION_SECRET`
   - Wert: beliebiger 64-Zeichen Hex-String (z.B. `openssl rand -hex 32`)
   - Ohne dieses Secret schlägt der `unit-tests`-Job in `.github/workflows/ci.yml` fehl.

---

## Sprint 3 (benötigt laufende DB / VPS-Zugriff)

1. **Prisma-Migration ausführen** (Sprint 3 — PII-Felder):
   ```powershell
   npx prisma migrate deploy
   ```
   Migration-Datei: `prisma/migrations/20260514202000_pii_encryption_fields/migration.sql`

2. **PII-Datenmigration ausführen** (einmalig, nach migrate deploy):
   ```powershell
   pnpm ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-pii.ts
   ```
   Idempotent — kann mehrfach ausgeführt werden, bereits migrierte Einträge werden übersprungen.

---

## Sprint 0

Drei offene Punkte (benötigen laufende DB)
1. ~~prisma migrate deploy muss gegen die Live-DB ausgeführt werden~~
   **✅ Erledigt (2026-05-15)** — Alle 7 Migrationen applied (inkl. PII-Felder + CanvaToken).
   Verifiziert via `_prisma_migrations`-Tabelle auf DB-Container `s7q3ix0pj9ztc2n8koblu0dz`.

2. SMTP-Datenmigration: Bestehende HEDY-ApiKey-SMTP-Einträge müssen einmalig in SmtpConfig übertragen werden (kann über Prisma Studio gemacht werden)

---

## Backlog / Tech-Debt (nicht sprintgebunden)

1. **Sprint 0a — Restbestand stiller Catches schließen** (Forge-Regel `resilience §3a`)

   Fünf `.catch(() => {})` aus Slices 23/25/26/27, eingeführt vor Forge-Migration. Alle dokumentiert in `docs/forge-web-deviations.md` (Status: `Accepted`, Timeline: Sprint 0a).

   - `components/layout/TokenWarningBanner.tsx:21` (Slice 26)
   - `components/wizard/TemplateSelector.tsx:23` (Slice 25)
   - `lib/klicktipp/client.ts:34` (Slice 23)
   - `lib/tokens/expiry-checker.ts:21` (Slice 26)
   - `lib/costs/reporter.ts:56` (Slice 27)

   Pattern: catch durch `(err: unknown) => { logger.warn(...) }` (Server) bzw. `console.warn('[Vysible] …', err)` (Client) ersetzen. Aufwand: ~1–2 Stunden.

2. **Browser-tauglicher Logger** (Forge-Regel `resilience §3a` — Client-Component-Abweichung)

   `lib/utils/logger.ts` nutzt `pino` mit `pino-pretty`-Transport — nur Server-side lauffähig. Client-Components nutzen daher `console.warn/error('[Vysible] …')`. Eintrag in `docs/forge-web-deviations.md` (Status: `Accepted`).

   Optionen:
   - `pino/browser` (offizielle Browser-Variante, kompatible API)
   - `consola` (alternativer isomorpher Logger)
   - Dünner eigener Wrapper `lib/utils/logger-client.ts`, der intern `console.*` mit `[Vysible]`-Prefix kapselt

   Nach Einführung: Sprint-Prompt-Self-Review-Regeln präzisieren ("`logger.*` in Server, `loggerClient.*` in Client").

3. **`SocialTokenStatusSection` auf OAuth-Modelle umstellen** (Slice 18)

   `app/(dashboard)/settings/api-keys/SocialTokenStatusSection.tsx` queryt
   aktuell `/api/api-keys` mit `provider: 'CANVA'` und zeigt deren `expiresAt`.
   Seit Sprint P2-E (Slice 17) leben Canva-OAuth-Tokens jedoch in der
   `CanvaToken`-Tabelle (eigene `expiresAt`, eigene Verbindungs-UI unter
   `/settings/canva`). Alte `ApiKey`-Rows mit Provider CANVA können in der
   DB orphaned bleiben — die Komponente zeigt dann veraltete Daten.

   Empfohlener Cleanup in Sprint P2-F (Slice 18 — Social Media):
   - Komponente erweitern, sodass sie aus `CanvaToken` (+ später Meta/LinkedIn-
     Token-Tabellen) liest, statt aus `ApiKey`-Rows.
   - Vorhandene `ApiKey`-Rows mit `provider: 'CANVA'` als deprecated markieren
     (UI-Hinweis "ersetzt durch OAuth — `/settings/canva` nutzen").
   - Migrationspfad für Bestandsdaten: keiner — alte Rows können stehenbleiben,
     werden nur nicht mehr aktiv genutzt.

   Akzeptiert im PSR von Sprint P2-E (Option A) — kein Sicherheits-/Compliance-
   Bezug, nur UI-Hygiene. Aufwand: ~1 Stunde im Rahmen von Slice 18.

4. **WP/KT-Status-Felder in `StoredTextResult` ergänzen** (Kalender-Badge, Slice 7)

   `ContentCalendar.tsx` ist darauf vorbereitet: WP/KT-Badge wird angezeigt wenn `wpDraftStatus` / `ktStatus` im `StoredTextResult`-Typ vorhanden sind. Aktuell fehlen diese Felder — WP-Status gehört zu Slice 22 (WordPress-Connector), KT-Status zu Slice 23 (KlickTipp-Connector). Nach Implementierung dieser Slices: Felder in `lib/generation/results-store.ts` ergänzen und Kalender-Karte zeigt automatisch den zweiten Badge.

5. **Themen-Quality-Gate refaktorisieren** (`lib/generation/themes-schema.ts` Z. 33–53)

   Aktueller Zustand: `validateThemenQuality()` enthält zwei hardcoded Schwellwerte (`0.8` praxisspezifisch, `0.5` SEO-Titel-Quote) und kippt den gesamten Pipeline-Run bei Unterschreitung. Quelle der Werte: `docs/dev-prompts/plan-v6.1.md` Z. 525.

   Beobachtetes Problem (Mai 2026, Praxis Zahnzentrum Warendorf): Lauf brach mit *"Nur 36% SEO-Titel als Frage/mit Keyword (Minimum 50%)"* ab. User kann nur "Wiederholen", nicht parametrieren oder teilakzeptieren.

   Zu adressieren:
   - **Magic Numbers extrahieren** → `lib/generation/config.ts` mit Defaults + Doc-Kommentar (Spec-Referenz), optional ENV-Override (`THEMES_MIN_SEO_QUOTE`, `THEMES_MIN_PRAXIS_QUOTE`).
   - **`istFrage` deterministisch berechnen** statt vom LLM bewerten lassen. Z. B. `titel.trim().endsWith('?') || titel.toLowerCase().includes(keywordPrimaer.toLowerCase())`. Spart Token, eliminiert Self-Assessment-Bias.
   - **Zwei Kriterien trennen:** "Frage" und "enthält Keyword" sind zwei verschiedene SEO-Eigenschaften. Aktuell kann ein Plan mit 100 % Keyword-Titeln und 0 % Fragen passieren — vermutlich nicht intendiert. Prüfen, ob getrennte Schwellwerte gewünscht sind.
   - **Soft-Warn-Pfad in der UI:** Bei Schwellwert-Verfehlung Auswahl anbieten (Wiederholen vs. Akzeptieren mit Warning-Badge), statt Hard-Fail. Erfordert UI-Änderung in der Pipeline-Status-Komponente und ggf. neuen Job-Status (`QUALITY_WARNING`).
   - **Begleitend:** Prompt in `prompts/themes.yaml` so anpassen, dass das Modell die deterministischen Felder (`istFrage`, `praxisspezifisch`) nicht mehr selbst befüllen muss — Reduktion der Schema-Komplexität.

   Aufwand grob: 1 Slice (~halber Tag inkl. Tests + UI). Kein Sicherheits- oder Compliance-Bezug, daher kein Sprint-1-Kandidat.