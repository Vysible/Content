# Offene Punkte

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

Zwei offene Punkte (benötigen laufende DB)
1. prisma migrate deploy muss gegen die Live-DB ausgeführt werden SQL-Datei ist commitbereit

2. SMTP-Datenmigration: Bestehende HEDY-ApiKey-SMTP-Einträge müssen einmalig in SmtpConfig übertragen werden (kann über Prisma Studio gemacht werden)

---

## Backlog / Tech-Debt (nicht sprintgebunden)

1. **Themen-Quality-Gate refaktorisieren** (`lib/generation/themes-schema.ts` Z. 33–53)

   Aktueller Zustand: `validateThemenQuality()` enthält zwei hardcoded Schwellwerte (`0.8` praxisspezifisch, `0.5` SEO-Titel-Quote) und kippt den gesamten Pipeline-Run bei Unterschreitung. Quelle der Werte: `docs/dev-prompts/plan-v6.1.md` Z. 525.

   Beobachtetes Problem (Mai 2026, Praxis Zahnzentrum Warendorf): Lauf brach mit *"Nur 36% SEO-Titel als Frage/mit Keyword (Minimum 50%)"* ab. User kann nur "Wiederholen", nicht parametrieren oder teilakzeptieren.

   Zu adressieren:
   - **Magic Numbers extrahieren** → `lib/generation/config.ts` mit Defaults + Doc-Kommentar (Spec-Referenz), optional ENV-Override (`THEMES_MIN_SEO_QUOTE`, `THEMES_MIN_PRAXIS_QUOTE`).
   - **`istFrage` deterministisch berechnen** statt vom LLM bewerten lassen. Z. B. `titel.trim().endsWith('?') || titel.toLowerCase().includes(keywordPrimaer.toLowerCase())`. Spart Token, eliminiert Self-Assessment-Bias.
   - **Zwei Kriterien trennen:** "Frage" und "enthält Keyword" sind zwei verschiedene SEO-Eigenschaften. Aktuell kann ein Plan mit 100 % Keyword-Titeln und 0 % Fragen passieren — vermutlich nicht intendiert. Prüfen, ob getrennte Schwellwerte gewünscht sind.
   - **Soft-Warn-Pfad in der UI:** Bei Schwellwert-Verfehlung Auswahl anbieten (Wiederholen vs. Akzeptieren mit Warning-Badge), statt Hard-Fail. Erfordert UI-Änderung in der Pipeline-Status-Komponente und ggf. neuen Job-Status (`QUALITY_WARNING`).
   - **Begleitend:** Prompt in `prompts/themes.yaml` so anpassen, dass das Modell die deterministischen Felder (`istFrage`, `praxisspezifisch`) nicht mehr selbst befüllen muss — Reduktion der Schema-Komplexität.

   Aufwand grob: 1 Slice (~halber Tag inkl. Tests + UI). Kein Sicherheits- oder Compliance-Bezug, daher kein Sprint-1-Kandidat.