# Sprint FIX-07 — Test-Coverage erweitern (NFA-16)

**Projekt:** Vysible
**Sprint:** FIX-07
**Format:** Tier 1
**Abhängigkeit:** FIX-06 ✅
**Anforderungen:** NFA-16 (Test-Coverage), Audit 2026-05-16 Schwere 3
**Geschätzte Dauer:** ~3–4 Tage

> **Ziel:** Die Test-Suite deckt aktuell nur Kernbereiche ab (44 Tests in 7 Dateien).
> NFA-16 fordert Coverage für alle kritischen Geschäftslogik-Module. Dieser Sprint
> ergänzt Unit-Tests für 6 bisher ungetestete Formatter/Aggregator/Loader-Module sowie
> einen E2E-Test für den zentralen URL→Content→ZIP-Flow.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus
(Phase 0 — PSR + Phase 1 — technische Gates).
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.
Bei GO: Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Vorhandene Tests + Struktur
Get-ChildItem __tests__ -Recurse -Name | Sort-Object

# 2. Zu testende Module vollständig lesen
Get-Content lib/wordpress/formatter.ts
Get-Content lib/klicktipp/newsletter-formatter.ts
Get-Content lib/email/templates/notification.ts
Get-Content lib/costs/aggregator.ts
Get-Content lib/generation/prompt-loader.ts

# 3. Export-Modul: Dateinamen-Logik verstehen
Get-Content lib/export/zip.ts  # existiert, 7 Tests vorhanden
Get-Content lib/export/docx.ts
Get-Content lib/export/html.ts

# 4. Playwright-Config lesen
Get-Content playwright.config.ts

# 5. Bestehende Tests als Stil-Referenz
Get-Content __tests__/unit/export/zip.test.ts
Get-Content __tests__/integration/generate-start.test.ts
Get-Content __tests__/e2e/login.spec.ts

# 6. Vitest-Config
Get-Content vitest.config.ts

# 7. Forge-Abweichungen in betroffenen Modulen
Select-String "catch\s*\(\(\)\s*=>\s*\{\s*\}\)" lib/wordpress/formatter.ts,lib/klicktipp/newsletter-formatter.ts,lib/costs/aggregator.ts -ErrorAction SilentlyContinue
```

**Bekannte Lücken (Stand 2026-05-16, aus Audit + OpenActions):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/wordpress/formatter.ts` | Keine Unit-Tests — WP-Post-Formatierung ungetestet | MUSS |
| `lib/klicktipp/newsletter-formatter.ts` | Keine Unit-Tests — KT-Newsletter-Formatierung ungetestet | MUSS |
| `lib/email/templates/notification.ts` | Keine Unit-Tests — E-Mail-Template-Rendering ungetestet | MUSS |
| `lib/costs/aggregator.ts` | Keine Unit-Tests — Cost-Aggregation ungetestet | MUSS |
| `lib/generation/prompt-loader.ts` | Keine Unit-Tests — YAML-Laden + Platzhalter-Ersatz ungetestet | MUSS |
| `__tests__/e2e/` | Nur `login.spec.ts` — kein URL→Content→ZIP-Flow | SOLL |
| `__tests__/integration/` | Nur `/api/generate/start` — weitere kritische Routen fehlen | SOLL |

---

## CRITICAL: Self-review Checklist

- [ ] Alle neuen Tests grün (`pnpm vitest run` — 0 failures)
- [ ] Keine bestehenden Tests gebrochen (44 Tests weiterhin grün)
- [ ] TypeScript strict: 0 Fehler
- [ ] Kein stiller Catch in neuen Test-Dateien
- [ ] Kein Klartext-Credential in Test-Fixtures (nur `'a'.repeat(64)` etc.)
- [ ] Alle Mocks via `vi.mock()` / `vi.stubEnv()` — kein direktes `process.env.X = ...`
- [ ] E2E-Test: läuft isoliert, kein Shared State zwischen Tests
- [ ] Test-Dateinamen folgen Schema: `__tests__/unit/[modul]/[datei].test.ts`
- [ ] CHANGELOG.md in diesem Commit aktualisiert

---

## Sub-Slice A — Unit-Tests (5 Module)

**Aufwand:** ~2 Tage
**Scope:** Je eine Test-Datei für WP-Formatter, KT-Newsletter-Formatter,
Email-Templates, Cost-Aggregator und Prompt-Loader.

### IN

```
__tests__/unit/wordpress/formatter.test.ts     NEU
__tests__/unit/klicktipp/newsletter.test.ts    NEU
__tests__/unit/email/notification.test.ts      NEU
__tests__/unit/costs/aggregator.test.ts        NEU
__tests__/unit/generation/prompt-loader.test.ts NEU
```

### OUT

```
lib/ (alle Dateien)    NICHT anfassen — nur lesen
app/                   NICHT anfassen
```

### A1 — Formatter-Tests (Muster)

```typescript
// lib/wordpress/formatter.ts — was testen:
// 1. Korrekte Felder in WP-Post-Objekt (title, content, status, tags)
// 2. HTML-Escaping / Sonderzeichen in Titel
// 3. Leere Tags-Liste → leeres Array, kein crash
// 4. Content-Länge bleibt erhalten (kein versehentliches Truncating)

// lib/klicktipp/newsletter-formatter.ts — was testen:
// 1. Korrekte KT-Felder (subject, body, unsubscribeLink-Platzhalter)
// 2. {{unsubscribe_link}} erscheint im Output
// 3. Leerer Content → definiertes Verhalten (nicht null/undefined)

// lib/email/templates/notification.ts — was testen:
// 1. Render-Funktion gibt string zurück (kein crash)
// 2. Pflichtfelder (Empfänger-Name, Link) sind im Output enthalten
// 3. HTML-Struktur valide (kein unclosed tag falls string-based)
```

### A2 — Aggregator-Tests

```typescript
// lib/costs/aggregator.ts — was testen:
// 1. Aggregation nach Typ (anthropic vs. openai vs. dataseo)
// 2. Summe ist numerisch korrekt (floating point Vorsicht → toBeCloseTo)
// 3. Leere CostEntry-Liste → 0-Werte, kein crash
// 4. Filterung nach Zeitraum (wenn vorhanden)
// Hinweis: Prisma-Calls mocken via vi.mock('@/lib/db', () => ({ ... }))
```

### A3 — Prompt-Loader-Tests

```typescript
// lib/generation/prompt-loader.ts — was testen:
// 1. Lädt gültige YAML-Datei ohne Fehler
// 2. Platzhalter-Ersatz: {{praxisName}} → tatsächlicher Wert
// 3. Unbekannter Prompt-Name → Error (kein silent fail)
// 4. YAML ohne "system"- oder "user"-Key → definierter Error
// Hinweis: YAML-Datei im Test-Fixture mocken (vi.mock('fs') oder echte Datei aus prompts/)
```

### Acceptance Checklist

- [ ] `formatter.test.ts` — mind. 4 Tests für WP-Formatter, alle grün
- [ ] `newsletter.test.ts` — mind. 3 Tests für KT-Formatter, alle grün
- [ ] `notification.test.ts` — mind. 3 Tests für Email-Templates, alle grün
- [ ] `aggregator.test.ts` — mind. 4 Tests inkl. Leerfall, alle grün
- [ ] `prompt-loader.test.ts` — mind. 4 Tests inkl. Error-Fall, alle grün
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
test(unit): WP-Formatter, KT-Newsletter, Email-Templates, Cost-Aggregator, Prompt-Loader (FIX-07 Sub-A)
```

---

## Sub-Slice B — E2E + Integration Tests

**Aufwand:** ~1–2 Tage
**Scope:** E2E URL→Content-Flow (Playwright, vereinfacht) + 2 neue Integration-Tests
für kritische API-Routen.

### IN

```
__tests__/e2e/content-generation.spec.ts   NEU
__tests__/integration/projects-api.test.ts NEU
```

### OUT

```
lib/                   NICHT anfassen
__tests__/unit/        NICHT anfassen (Sub-Slice A)
```

### B1 — E2E Content-Flow (vereinfacht)

```typescript
// __tests__/e2e/content-generation.spec.ts
// Scope: Login → Projekt-Wizard ausfüllen → Generation starten → Status prüfen
// NICHT: ZIP-Download (zu flaky für CI ohne echte AI-Keys)
//
// Test-Cases:
// 1. Nicht eingeloggt → /login Redirect
// 2. Eingeloggt → /dashboard erreichbar (200)
// 3. Projektliste lädt ohne JS-Error (console.error Hook)
//
// Hinweis: Gleicher Stil wie login.spec.ts — baseURL aus playwright.config.ts
// KI-Calls NICHT triggern — nur UI-Navigation testen
```

### B2 — Integration API-Routen

```typescript
// __tests__/integration/projects-api.test.ts
// Scope: /api/projects POST + /api/projects/[id] GET
// Muster aus generate-start.test.ts übernehmen (DB-Mock, Auth-Mock)
//
// Test-Cases:
// 1. POST /api/projects ohne Auth → 401
// 2. POST /api/projects mit Auth + validen Daten → 200 + Projekt-ID
// 3. GET /api/projects/[id] ohne Auth → 401
// 4. GET /api/projects/[id] mit Auth → 200 + Projekt-Felder
```

### Acceptance Checklist

- [ ] `content-generation.spec.ts` — mind. 3 E2E-Tests, alle grün (pnpm playwright test)
- [ ] `projects-api.test.ts` — mind. 4 Integration-Tests, alle grün
- [ ] Keine flaky Tests (3× nacheinander grün)
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
test(e2e+integration): Content-Flow E2E + Projects-API Integration (FIX-07 Sub-B)
```

---

## Abschluss-Validation (nach allen Sub-Slices)

```powershell
# 1. Alle Unit-Tests grün
pnpm vitest run
# → Alle Tests PASS (mind. 44 + 18 neue = 62+)

# 2. TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit
# → Keine Ausgabe

# 3. E2E-Tests (nur wenn App lokal läuft)
pnpm playwright test
# → Alle Tests PASS

# 4. Test-Dateinamen korrekt
Get-ChildItem __tests__ -Recurse -Name | Sort-Object
# → Neue Dateien in unit/wordpress/, unit/klicktipp/, unit/email/,
#   unit/costs/, unit/generation/, e2e/, integration/

# 5. Kein stiller Catch in neuen Test-Dateien
Select-String "\.catch\(\(\)" __tests__ -Recurse -ErrorAction SilentlyContinue
# → Zero Treffer
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Tests für alle 49 API-Routen | Aufwand unverhältnismäßig — kritische Pfade abgedeckt |
| Code-Coverage-Messung (Istanbul/nyc) | Eigener Sprint (Tooling-Aufwand) |
| Visual-Regression-Tests | Kein Bedarf für agentur-internes Tool |
| Performance-Tests | FIX-10 / Phase 4 |
| Tests für Playwright-Microservice | Separater Service, separater Test-Runner |
| Chat-Versioning Unit-Tests | Zu tief in DB-State — Integration-Test ausreichend |

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR ein Commit vorgeschlagen
> oder ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md`: FIX-07 auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint FIX-07)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: FIX-07-Eintrag unter Audit-Schwere-3 schließen |
| 3 | Sprint-Prompt archivieren | `Move-Item docs/dev-prompts/sprint-fix07-test-coverage.md docs/dev-prompts/archive/` |
| 4 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]` |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT FIX-07 ABSCHLUSSBERICHT
===============================

Sprint: FIX-07 — Test-Coverage erweitern (NFA-16)

SUB-SLICES:
  A Unit-Tests (5 Module):            [ ] DONE — Commit: <hash>
  B E2E + Integration:                [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:                [ ]
  Alle Tests grün (inkl. neue):       [ ] x/x PASS
  E2E grün (lokal):                   [ ]
  Kein stiller Catch:                 [ ]
  CHANGELOG aktuell:                  [ ]

TEST-DELTA:
  Vorher: 44 Tests in 7 Dateien
  Nachher: x Tests in y Dateien

═══════════════════════════════════════════════
[OK] FIX-07 ABGESCHLOSSEN
▶ Nächste Priorität: FIX-09 (positioningDocument AES-Verschlüsselung)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-fix07-test-coverage.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
