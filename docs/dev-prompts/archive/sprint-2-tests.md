# Sprint 2 — Tests: Vitest + Playwright E2E

**Projekt:** Vysible
**Sprint:** 2
**Abhängigkeit:** Sprint 1 ✅ (Compliance & Governance)
**Anforderungen:** NFA-16 (kein Blindflug ohne Tests)
**Geschätzte Dauer:** ~3–5 Tage

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

> ⚠️ Lies den gesamten Prompt **bevor** du den ersten Tool-Call machst.
> Starte erst nach 4/4 PASS mit der Implementierung.

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die 4 Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain
# Erwartet: leere Ausgabe

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit
# Erwartet: 0 Fehler

# Check C — Roadmap
Select-String "Sprint 1.*abgeschlossen|Sprint 1.*✅" docs/roadmap.md -i
# Erwartet: Treffer

# Check D — CHANGELOG
Select-String "\[Unreleased\]" CHANGELOG.md
# Erwartet: Treffer
```

Bei **Hard-FAIL (A oder B):** STOP. Warte auf Maintainer.
Bei **Soft-FAIL (C oder D):** Dokumentiere, frage nach Override.
Bei **4/4 PASS:** Direkt mit Sub-Track A beginnen.

---

## CRITICAL: Was bereits existiert — vor Implementierung prüfen

```powershell
# Vitest bereits installiert?
Select-String "vitest" package.json
# → Erwartet: KEIN Treffer (noch nicht installiert)

# Playwright (Test) bereits installiert?
Select-String "@playwright/test" package.json
# → Erwartet: KEIN Treffer

# Bestehende Test-Verzeichnisse?
Test-Path "__tests__"; Test-Path "tests"; Test-Path "src/__tests__"
# → Alle False erwartet

# lib/crypto/aes.ts — das einzige Crypto-Modul
Test-Path lib/crypto/aes.ts   # → True (Testgrandfathermodul)

# lib/generation/themes-schema.ts — Schema für Validierungstest
Test-Path lib/generation/themes-schema.ts   # → True
```

---

## CRITICAL: Self-review Checklist

- [ ] `pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom happy-dom` — kein npm, kein yarn
- [ ] `vitest.config.ts` in Root angelegt (nicht in `src/`)
- [ ] `package.json` scripts: `test`, `test:watch`, `test:coverage` ergänzt
- [ ] Unit-Test: `lib/crypto/aes.ts` — Roundtrip encrypt/decrypt ✅, falsches ENCRYPTION_SECRET → Error ✅
- [ ] Unit-Test: `lib/generation/themes-schema.ts` — valides ThemenItem PASS ✅, fehlendes Pflichtfeld FAIL ✅
- [ ] Unit-Test: HWG-Gate Logik — `hwgFlag === true` → 403-Pfad abgedeckt ✅
- [ ] Unit-Test: `lib/utils/retry.ts` — 3 Fehlversuche → Error ✅, 2. Versuch erfolgreich ✅
- [ ] Integration-Test: `/api/generate/start` mit Mock-AI — Job wird angelegt, SSE-Stream startet
- [ ] E2E Playwright Grundgerüst: Login-Flow funktioniert (`/login` → Dashboard)
- [ ] GitHub Actions CI: `.github/workflows/ci.yml` — lint + typecheck + vitest
- [ ] Kein echter API-Call in Tests — alle externen Calls gemockt
- [ ] `process.env.ENCRYPTION_SECRET` in Tests via `vi.stubEnv()` gesetzt (kein direktes setzen)
- [ ] TypeScript strict: 0 Fehler nach Implementierung
- [ ] CHANGELOG.md im selben Commit aktualisiert

---

## Scope Check

**IN:**

```
vitest.config.ts                                NEU — Vitest-Konfiguration
playwright.config.ts                            NEU — Playwright E2E-Konfiguration
__tests__/unit/crypto/aes.test.ts               NEU — AES Roundtrip-Tests
__tests__/unit/generation/themes-schema.test.ts NEU — Schema-Validierungstests
__tests__/unit/compliance/hwg-gate.test.ts      NEU — HWG-Gate-Logik-Tests
__tests__/unit/utils/retry.test.ts              NEU — withRetry-Tests
__tests__/integration/generate-start.test.ts    NEU — /api/generate/start Integration
__tests__/e2e/login.spec.ts                     NEU — E2E Login-Flow
.github/workflows/ci.yml                        NEU — CI Pipeline
package.json                                    MOD — scripts + devDependencies
CHANGELOG.md / docs/roadmap.md
```

**OUT:**

```
lib/                                            NICHT anfassen (außer gemockt in Tests)
app/                                            NICHT anfassen
prisma/                                         NICHT anfassen
Keine neuen Features — ausschließlich Tests
```

---

## Sub-Track A — Vitest Setup

### A-1: Pakete installieren

```powershell
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom happy-dom
pnpm add -D @playwright/test
npx playwright install chromium --with-deps
```

### A-2: `vitest.config.ts` (Root)

```typescript
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter:  ['text', 'json', 'html'],
      include:   ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude:   ['lib/db.ts', 'lib/types/**', '**/*.d.ts'],
      thresholds: { lines: 60, functions: 60, branches: 60 },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

> **Warum 60 % statt 85 %?** Sprint 2 startet aus 0 %. 60 % ist ein realistisches
> Einführungsziel. Nach Sprint 4 (Quality & Scale) auf 80 %+ anheben.

### A-3: `__tests__/setup.ts`

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Prisma Client in allen Tests mocken — niemals echte DB in Unit-Tests
vi.mock('@/lib/db', () => ({
  prisma: {
    auditLog:       { create: vi.fn() },
    project:        { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    generationJob:  { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    apiKey:         { create: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
  },
}))
```

### A-4: `package.json` scripts ergänzen

```json
{
  "scripts": {
    "test":          "vitest run",
    "test:watch":    "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### A-5: `playwright.config.ts` (Root)

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir:  '__tests__/e2e',
  timeout:  30_000,
  retries:  1,
  use: {
    baseURL:     process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    screenshot:  'only-on-failure',
    trace:       'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url:     'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

---

## Sub-Track B — Unit-Tests

### B-1: `__tests__/unit/crypto/aes.test.ts`

Testet `lib/crypto/aes.ts` ohne echten Schlüssel im Code.

**Test-Cases:**
1. `encrypt(plaintext)` → liefert String im Format `iv:tag:cipher` (3 Teile mit `:`)
2. `decrypt(encrypt(plaintext))` → gibt `plaintext` zurück (Roundtrip)
3. `encrypt()` mit fehlendem `ENCRYPTION_SECRET` → wirft Error
4. `decrypt()` mit korruptem Ciphertext → wirft Error
5. Zwei Calls mit gleichem Plaintext → unterschiedliche IV (Zufälligkeit)

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

// ENCRYPTION_SECRET: 64 Hex-Zeichen = 32 Bytes
const TEST_SECRET = 'a'.repeat(64)

describe('AES-256-GCM encrypt/decrypt', () => {
  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_SECRET', TEST_SECRET)
  })

  it('erzeugt Format iv:tag:cipher', () => {
    const { encrypt } = await import('@/lib/crypto/aes')
    const result = encrypt('Hallo Welt')
    expect(result.split(':')).toHaveLength(3)
  })

  it('Roundtrip: decrypt(encrypt(x)) === x', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto/aes')
    const plain = 'test@praxis.de'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  it('wirft bei fehlendem ENCRYPTION_SECRET', async () => {
    vi.stubEnv('ENCRYPTION_SECRET', '')
    const { encrypt } = await import('@/lib/crypto/aes')
    expect(() => encrypt('test')).toThrow('ENCRYPTION_SECRET')
  })

  it('wirft bei korruptem Ciphertext', async () => {
    const { decrypt } = await import('@/lib/crypto/aes')
    expect(() => decrypt('nicht:valide')).toThrow()
  })

  it('erzeugt unterschiedliche IVs bei gleichen Plaintexts', async () => {
    const { encrypt } = await import('@/lib/crypto/aes')
    const c1 = encrypt('gleich')
    const c2 = encrypt('gleich')
    expect(c1).not.toBe(c2)
  })
})
```

> **Wichtig:** `import()` dynamisch in jedem Test, damit `vi.stubEnv()` wirkt.
> Statischer Import übernimmt den Env-Wert einmalig beim Modul-Load.

---

### B-2: `__tests__/unit/generation/themes-schema.test.ts`

Testet die Zod-Schema-Validierung in `lib/generation/themes-schema.ts`.

**Test-Cases:**
1. Valides `ThemenItem` → `safeParse` gibt `success: true`
2. Fehlendes Pflichtfeld `thema` → `success: false`
3. Ungültiger `hwgFlag`-Wert → `success: false`
4. Ungültige `funnelStufe` → `success: false`
5. `kanaele: []` (leeres Array) → `success: false` (min. 1 Kanal)

Basis-Fixture für valides Item:
```typescript
const validItem = {
  monat:              'Januar 2027',
  thema:              'Implantate für Angstpatienten',
  seoTitel:           'Schmerzfreie Implantate — Zahnzentrum Warendorf',
  kategorie:          'Implantologie',
  zielgruppe:         'Angstpatienten 40–65',
  funnelStufe:        'Consideration',
  keywordPrimaer:     'Implantate Warendorf',
  keywordSekundaer:   ['Implantate Angst', 'schmerzfreie Behandlung'],
  paaFragen:          ['Wie lange hält ein Implantat?'],
  kanaele:            ['blog', 'newsletter'],
  contentWinkel:      'Erfahrungsbericht Angstpatienten',
  cta:                'Beratungsgespräch vereinbaren',
  prioritaet:         'Hoch',
  positionierungGenutzt: true,
  canvaOrdnerGenutzt:    false,
  keywordsGenutzt:       true,
  hwgFlag:            'gruen',
}
```

---

### B-3: `__tests__/unit/compliance/hwg-gate.test.ts`

Testet die HWG-Gate-Logik **isoliert** — nicht die Route, sondern die Prüfbedingung.

Da die Gate-Logik in `app/api/projects/[id]/export/route.ts` inline ist, extrahiere die
Kern-Logik in eine reine Hilfsfunktion und teste diese:

```typescript
// Zu testen (Beispiel-Extraktion aus Route — falls noch nicht extrahiert):
export function checkHwgGate(hwgFlag: boolean): { blocked: boolean; reason?: string } {
  if (hwgFlag) {
    return { blocked: true, reason: 'hwg_flag_set' }
  }
  return { blocked: false }
}
```

**Test-Cases:**
1. `checkHwgGate(true)` → `{ blocked: true, reason: 'hwg_flag_set' }`
2. `checkHwgGate(false)` → `{ blocked: false }`

> **Hinweis:** Falls die Logik noch nicht in eine separate Funktion extrahiert ist,
> extrahiere sie beim Schreiben des Tests. Test-Driven ist hier bewusste Refaktorierung.

---

### B-4: `__tests__/unit/utils/retry.test.ts`

Testet `lib/utils/retry.ts`.

**Test-Cases:**
1. Erfolgreiche Funktion beim ersten Versuch → gibt Wert zurück, kein Retry
2. Funktion schlägt 2× fehl, 3. Versuch erfolgreich → gibt Wert zurück
3. Funktion schlägt 3× fehl → wirft letzten Error
4. HTTP 404 Response → kein Retry, sofortiger Throw (permanenter 4xx)
5. HTTP 429 Response → wird retried (Ausnahme von permanentem 4xx)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { withRetry } from '@/lib/utils/retry'

// sleep in retry.ts mocken, damit Tests nicht warten
vi.mock('@/lib/utils/retry', async (importOriginal) => {
  // Ersetze sleep intern — wird via Mock transparent
  const mod = await importOriginal<typeof import('@/lib/utils/retry')>()
  return mod
})

// Alternativ: fake timers
```

> **Stop-Condition:** `withRetry` verwendet `setTimeout` intern. Nutze `vi.useFakeTimers()`
> und `vi.advanceTimersByTime()` um die Wartezeiten zu überspringen.

---

## Sub-Track C — Integration-Test: `/api/generate/start`

**Datei:** `__tests__/integration/generate-start.test.ts`

Dieser Test prüft den gesamten Pfad: Request → Auth-Check → Job-Anlage → Response.
Alle externen Calls (Prisma, AI-Client) werden gemockt.

**Setup:**
- Auth-Session via `vi.mock('@/lib/auth/session', ...)` → gibt Test-Session zurück
- Prisma `project.findUnique` → gibt valides Projekt zurück
- Prisma `generationJob.create` → gibt Mock-Job zurück
- AI-Client wird **nicht** aufgerufen (Job wird nur angelegt, Generierung ist async)

**Test-Cases:**
1. Valider Request mit `projectId` → HTTP 200, Body enthält `jobId`
2. Kein Auth-Token → HTTP 401
3. Nicht-existierendes Projekt → HTTP 404
4. Bereits laufender Job → HTTP 409 (falls implementiert) oder HTTP 200 mit neuem Job

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/generate/start/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'test@test.de', role: 'ADMIN' },
  }),
}))

// Prisma-Mock aus __tests__/setup.ts wird automatisch angewendet
```

---

## Sub-Track D — E2E Playwright: Login-Flow

**Datei:** `__tests__/e2e/login.spec.ts`

E2E-Tests laufen gegen die **laufende Dev-App** (`pnpm dev`). Sie brauchen eine
Test-Instanz der DB mit einem Test-Nutzer.

**Voraussetzung:**
- `.env.test` mit `DATABASE_URL` auf Test-DB (z.B. separate PostgreSQL-DB oder
  postgres Schema `test`)
- Test-User via Prisma-Seed (`prisma/seed.ts` mit `--env .env.test` Flag)

**Test-Cases:**
1. Login-Seite lädt unter `/login`
2. Falsches Passwort → Fehlermeldung sichtbar
3. Korrektes Passwort → Redirect auf Dashboard (`/`)
4. Ohne Login → `/` redirect auf `/login`

```typescript
import { test, expect } from '@playwright/test'

test('Login mit falschen Credentials zeigt Fehler', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'wrong@test.de')
  await page.fill('input[type="password"]', 'wrongpass')
  await page.click('button[type="submit"]')
  await expect(page.locator('[data-testid="login-error"]')).toBeVisible()
})

test('Erfolgreicher Login redirectet auf Dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', process.env.E2E_TEST_EMAIL!)
  await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD!)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/')
})
```

> **Stop-Condition:** Die Login-Seite hat noch kein `data-testid="login-error"`.
> Ergänze dieses Attribut im Login-Formular (`app/(auth)/login/page.tsx`).
> Das ist der einzige erlaubte Produktionscode-Edit in Sprint 2.

---

## Sub-Track E — GitHub Actions CI

**Datei:** `.github/workflows/ci.yml` (NEU)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: node node_modules/typescript/bin/tsc --noEmit

  unit-tests:
    runs-on: ubuntu-latest
    env:
      ENCRYPTION_SECRET: ${{ secrets.TEST_ENCRYPTION_SECRET }}
      DATABASE_URL: postgresql://test:test@localhost:5432/vysible_test
      NEXTAUTH_SECRET: test-secret-for-ci
      NEXTAUTH_URL: http://localhost:3000
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: vysible_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec prisma migrate deploy
      - run: pnpm test
      - run: pnpm test:coverage
```

> E2E-Tests in CI: Zunächst **ausgelassen**. E2E gegen echte DB + Dev-Server in CI ist
> aufwendig. E2E läuft lokal. Nach Sprint 4 in CI aufnehmen.

> **GitHub Secret:** `TEST_ENCRYPTION_SECRET` muss im GitHub-Repo unter
> Settings → Secrets → Actions angelegt werden (64 Hex-Zeichen).

---

## CHANGELOG-Eintrag (im selben Commit)

Unter `## [Unreleased]` einfügen:

```markdown
### Added
- Sprint 2: Test-Infrastruktur (NFA-16)
  - Vitest Setup: `vitest.config.ts`, Prisma-Mock, `__tests__/setup.ts`
  - Unit-Tests: `lib/crypto/aes.ts` (AES-256 Roundtrip, 5 Cases)
  - Unit-Tests: `lib/generation/themes-schema.ts` (Schema-Validierung, 5 Cases)
  - Unit-Tests: `lib/utils/retry.ts` (Exponential-Backoff, 5 Cases)
  - Unit-Tests: HWG-Gate Logik (2 Cases)
  - Integration-Test: `/api/generate/start` (Mock-AI, 4 Cases)
  - E2E Playwright: Login-Flow (`__tests__/e2e/login.spec.ts`)
  - GitHub Actions CI: `.github/workflows/ci.yml` (lint + typecheck + vitest)
```

---

## Validation Block

```powershell
# 1. Pakete installiert
Select-String "vitest" package.json                    # → Treffer
Select-String "@playwright/test" package.json          # → Treffer

# 2. Test-Scripts vorhanden
Select-String '"test"' package.json                    # → Treffer

# 3. Alle Test-Dateien vorhanden
@(
  "__tests__/unit/crypto/aes.test.ts",
  "__tests__/unit/generation/themes-schema.test.ts",
  "__tests__/unit/compliance/hwg-gate.test.ts",
  "__tests__/unit/utils/retry.test.ts",
  "__tests__/integration/generate-start.test.ts",
  "__tests__/e2e/login.spec.ts",
  ".github/workflows/ci.yml",
  "vitest.config.ts",
  "playwright.config.ts"
) | ForEach-Object {
  if (Test-Path $_) { Write-Host "[OK]  $_" } else { Write-Host "[FAIL] FEHLT: $_" }
}

# 4. Alle Tests grün
pnpm test
# → Alle Tests PASS, 0 Fehler

# 5. TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit
# → 0 Fehler

# 6. Coverage-Schwelle (60 %)
pnpm test:coverage
# → Kein "Below threshold" in Ausgabe

# 7. Kein echter API-Call in Tests
Select-String "ANTHROPIC_API_KEY\|anthropic\.messages\.create" __tests__ -Recurse
# → Zero Treffer (alle externen Calls gemockt)
```

**Stop-Conditions (bekannte Fallstricke):**
- `vi.stubEnv()` wirkt nur wenn das Modul **dynamisch** importiert wird (`await import(...)`)
  in jedem Test — statischer Import am Datei-Anfang übernimmt den Env-Wert beim ersten Load
- `prisma` Mock in `__tests__/setup.ts` muss **vor** jedem Test-File geladen werden →
  `setupFiles` in `vitest.config.ts` sicherstellt das
- `happy-dom` kennt keine Browser-Netzwerk-Calls — HTTP-Calls in Komponenten via `vi.fn()` mocken
- Playwright E2E braucht laufenden Dev-Server — `pnpm dev` vorher starten oder
  `webServer` in `playwright.config.ts` ist aktiv

---

## Auto-Commit Block

```powershell
git add vitest.config.ts playwright.config.ts
git add __tests__/
git add .github/workflows/ci.yml
git add package.json
git add CHANGELOG.md docs/roadmap.md

git commit -m "test(sprint-2): Vitest + Playwright Setup — AES, Schema, Retry, HWG-Gate, Integration, E2E Login (NFA-16)"
```

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT 2 — TESTS ABSCHLUSSBERICHT
===================================

Sprint: 2 — Vitest + Playwright E2E
Anforderungen: NFA-16

CHECKS:
  Pre-Slice Validation:        [ ] 4/4 PASS
  Vitest installiert:          [ ]
  Playwright installiert:      [ ]
  Unit-Tests alle grün:        [ ] x/x Tests PASS
  Integration-Test grün:       [ ]
  E2E Login-Flow grün:         [ ]
  Coverage ≥ 60 %:             [ ]
  TypeScript 0 Fehler:         [ ]
  CI-Workflow angelegt:        [ ]
  CHANGELOG aktuell:           [ ]

DATEIEN:
  Angelegt:    vitest.config.ts, playwright.config.ts
               __tests__/unit/crypto/aes.test.ts
               __tests__/unit/generation/themes-schema.test.ts
               __tests__/unit/compliance/hwg-gate.test.ts
               __tests__/unit/utils/retry.test.ts
               __tests__/integration/generate-start.test.ts
               __tests__/e2e/login.spec.ts
               __tests__/setup.ts
               .github/workflows/ci.yml
  Modifiziert: package.json (scripts + devDeps)
               app/(auth)/login/page.tsx (data-testid="login-error")

DRIFT: <keiner / Abweichungen dokumentieren>

═══════════════════════════════════════════════
[OK] SPRINT 2 ABGESCHLOSSEN
▶ Nächste Priorität: Sprint 3 — PII-Encryption & Structured Logging
═══════════════════════════════════════════════
```
