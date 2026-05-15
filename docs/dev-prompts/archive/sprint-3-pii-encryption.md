# Sprint 3 — PII-Encryption & Structured Logging

**Projekt:** Vysible
**Sprint:** 3
**Abhängigkeit:** Sprint 2 ✅ (Tests laufen)
**Anforderungen:** `web-encryption-at-rest.mdc`, `terminal-output.mdc`, ADR-003, NFA-07
**Forge-Abweichung:** `docs/forge-web-deviations.md` (User.email/name Plaintext → wird hier behoben)
**Geschätzte Dauer:** ~3 Tage

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
Select-String "Sprint 2.*abgeschlossen|Sprint 2.*✅" docs/roadmap.md -i
# Erwartet: Treffer

# Check D — CHANGELOG
Select-String "\[Unreleased\]" CHANGELOG.md
# Erwartet: Treffer
```

Bei **Hard-FAIL (A oder B):** SOFORT STOP. Kein weiterer Befehl. Kein weiterer Check. Keine Parallelisierung.  
Ausgabe: `HARD-FAIL: Check [X] — [Grund]` + erforderliche Aktion für den User. Dann **await User-Freigabe**.
Bei **Soft-FAIL (C oder D):** Dokumentiere, frage nach Override.
Bei **4/4 PASS:** Direkt mit Sub-Track A beginnen.

---

## CRITICAL: Ist-Stand — vor Implementierung prüfen

```powershell
# pino bereits installiert?
Select-String '"pino"' package.json
# → Erwartet: KEIN Treffer

# lib/utils/logger.ts bereits vorhanden?
Test-Path lib/utils/logger.ts
# → Erwartet: False (wird neu angelegt)

# lib/crypto/aes.ts — Versions-Präfix bereits vorhanden?
Select-String "v1:" lib/crypto/aes.ts
# → Erwartet: KEIN Treffer (wird ergänzt)

# User-Modell: emailEncrypted bereits vorhanden?
Select-String "emailEncrypted" prisma/schema.prisma
# → Erwartet: KEIN Treffer

# PraxisUser: emailEncrypted bereits vorhanden?
Select-String "emailEncrypted" prisma/schema.prisma
# → Erwartet: KEIN Treffer

# Bestehende console.log-Aufrufe (Umfang abschätzen)
$count = (Select-String "console\.(log|error|warn)" lib -Recurse).Count
Write-Host "console-Calls in lib/: $count"
# → Informativ, kein Hard-FAIL
```

---

## CRITICAL: Self-review Checklist

- [ ] `pnpm add pino pino-pretty` installiert
- [ ] `lib/utils/logger.ts` angelegt — einzige Stelle für Pino-Instanz
- [ ] `'use server'` / Serverseite nur: Logger wird nicht im Browser-Bundle gebündelt
- [ ] Alle `console.log|warn|error` in `lib/**` ersetzt durch Logger-Calls
- [ ] `lib/crypto/aes.ts` MOD: Versions-Präfix `v1:` im Ciphertext-Format
- [ ] `decrypt()` abwärtskompatibel: erkennt altes Format (ohne `v1:`) und dekodiert es
- [ ] Prisma-Migration: `User.emailEncrypted`, `User.nameEncrypted` (neue Felder, nullable)
- [ ] Prisma-Migration: `PraxisUser.emailEncrypted`, `PraxisUser.nameEncrypted` (neue Felder, nullable)
- [ ] `prisma/seed.ts` oder separates Migrations-Skript: bestehende Plaintext-Werte → verschlüsselt kopieren
- [ ] `lib/auth/session.ts` und Auth-Routen: lesen `emailEncrypted` (entschlüsselt) statt `email` wo nötig
- [ ] `User.email` und `User.name` bleiben vorerst erhalten (breaking-change-frei, paralleler Betrieb)
- [ ] `forge-web-deviations.md`: Abweichung `User.email Plaintext` auf Status `Resolved` setzen
- [ ] Kein PII in Logger-Output — E-Mail/Name nie geloggt, nur IDs
- [ ] Tests: `lib/utils/logger.ts` exportiert Mock-kompatibles Interface (kein `vi.mock()` auf `pino`)
- [ ] Alle bestehenden Tests grün nach Änderung
- [ ] TypeScript strict: 0 Fehler
- [ ] CHANGELOG.md im selben Commit aktualisiert

---

## Scope Check

**IN:**

```
lib/utils/logger.ts                             NEU — Pino-Logger (einzige Instanz)
lib/crypto/aes.ts                               MOD — v1-Präfix + Abwärtskompatibilität
prisma/schema.prisma                            MOD — emailEncrypted/nameEncrypted Felder
prisma/migrations/<timestamp>_pii_encryption/  NEU — Migration
scripts/migrate-pii.ts                          NEU — Datenmigrations-Skript (Plaintext → Encrypted)
lib/**/*.ts                                     MOD — console.* → logger.*
app/api/**/*.ts                                 MOD — console.* → logger.* (selektiv)
docs/forge-web-deviations.md                    MOD — Abweichung User.email → Resolved
CHANGELOG.md / docs/roadmap.md
```

**OUT:**

```
User.email / User.name                          NICHT löschen (paralleler Betrieb)
app/(dashboard)/                                NICHT anfassen (UI bleibt unverändert)
lib/audit/logger.ts                             NICHT anfassen
lib/utils/retry.ts                              NICHT anfassen
Auth-Flow                                       KEIN Breaking Change — Login funktioniert weiter
```

---

## Sub-Track A — Structured Logger (`lib/utils/logger.ts`)

### A-1: Paket installieren

```powershell
pnpm add pino pino-pretty
pnpm add -D @types/pino
```

### A-2: `lib/utils/logger.ts` (NEU)

```typescript
import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  name:  'vysible',
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev && {
    transport: {
      target:  'pino-pretty',
      options: {
        colorize:         true,
        translateTime:    'SYS:dd.mm.yyyy HH:MM:ss',
        ignore:           'pid,hostname',
        messageKey:       'msg',
      },
    },
  }),
  redact: {
    paths:   ['email', 'password', 'name', 'encryptedKey', '*.email', '*.password'],
    censor:  '[REDACTED]',
  },
})
```

**Konventionen:**
- Import: `import { logger } from '@/lib/utils/logger'`
- Projekt-Prefix entfällt — `pino` gibt `name: 'vysible'` automatisch mit
- `logger.info(...)`, `logger.warn(...)`, `logger.error(...)`, `logger.debug(...)`
- Strukturiertes Logging: `logger.info({ projectId, step }, 'Generation gestartet')`
- Kein freier String mit PII: `logger.info({ userId }, 'User eingeloggt')` ✅
  `logger.info('User test@praxis.de eingeloggt')` ❌

### A-3: console.* → logger.* Migration in `lib/`

**Strategie:** Search & Replace, kein automatisches Sed. Jede Stelle prüfen:

```powershell
# Alle console-Calls in lib/ finden
Select-String "console\.(log|warn|error)" lib -Recurse | Select-Object Path, LineNumber, Line
```

**Mapping-Regeln:**
| Vorher | Nachher |
|---|---|
| `console.log('[Vysible] ...')` | `logger.info(...)` |
| `console.warn('[Vysible] [WARN] ...')` | `logger.warn(...)` |
| `console.error('[Vysible] [FAIL] ...')` | `logger.error(...)` |

**Wichtig:** `[Vysible]`-Prefix aus den Strings entfernen — pino fügt `name` automatisch ein.

In `app/api/` nur die `lib/`-Calls ersetzen, die über importierte Funktionen kommen.
Direkte `console.*` in Route-Handlern werden in Sprint 4 bereinigt (Out-of-Scope jetzt).

---

## Sub-Track B — AES-Versions-Präfix (`lib/crypto/aes.ts`)

### B-1: Neues Format

Aktuelles Format: `iv:tag:ciphertext` (kein Präfix)
Neues Format:     `v1:iv:tag:ciphertext`

```typescript
const VERSION = 'v1'

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv  = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}
```

### B-2: Abwärtskompatibles decrypt()

```typescript
export function decrypt(ciphertext: string): string {
  const key = getKey()
  let ivHex: string, tagHex: string, dataHex: string

  if (ciphertext.startsWith('v1:')) {
    // Neues Format: v1:iv:tag:cipher
    const parts = ciphertext.slice(3).split(':')
    if (parts.length !== 3) throw new Error('Ungültiges v1-Ciphertext-Format')
    ;[ivHex, tagHex, dataHex] = parts
  } else {
    // Altes Format: iv:tag:cipher (Legacy — wird nach Datenmigration entfernt)
    const parts = ciphertext.split(':')
    if (parts.length !== 3) throw new Error('Ungültiges Legacy-Ciphertext-Format')
    ;[ivHex, tagHex, dataHex] = parts
  }

  const iv      = Buffer.from(ivHex,  'hex')
  const tag     = Buffer.from(tagHex, 'hex')
  const data    = Buffer.from(dataHex,'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
```

> **Legacy-Entfernung:** Nachdem alle ApiKey-Einträge in der DB auf `v1:`-Format migriert
> sind (kann via Prisma Studio geprüft werden), Legacy-Pfad in einem späteren Sprint entfernen.
> Nicht jetzt — kein Breaking Change.

---

## Sub-Track C — Prisma Migration: PII-Felder

### C-1: `prisma/schema.prisma` — User-Modell

Ergänze in `model User`:

```prisma
emailEncrypted String?   // AES-256-GCM, Format: v1:iv:tag:cipher
nameEncrypted  String?   // AES-256-GCM, Format: v1:iv:tag:cipher
```

`email` und `name` bleiben erhalten. Datenmigration erfolgt im Scripts-Track.

### C-2: `prisma/schema.prisma` — PraxisUser-Modell

Ergänze in `model PraxisUser`:

```prisma
emailEncrypted String?   // AES-256-GCM
nameEncrypted  String?   // AES-256-GCM
```

`email` und `name` bleiben erhalten.

### C-3: Migration anlegen

```powershell
npx prisma migrate dev --name pii_encryption_fields
```

---

## Sub-Track D — Datenmigrations-Skript

**Datei:** `scripts/migrate-pii.ts` (NEU)

Dieses Skript liest alle `User`- und `PraxisUser`-Datensätze, verschlüsselt die
Plaintext-Felder und schreibt sie in die neuen `*Encrypted`-Felder.

```typescript
/**
 * PII Migration Script: Plaintext email/name → AES-256-GCM encrypted.
 *
 * Ausführen (einmalig, nach prisma migrate deploy):
 *   pnpm ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-pii.ts
 *
 * Voraussetzung: ENCRYPTION_SECRET in .env gesetzt.
 */
import { PrismaClient } from '@prisma/client'
import { encrypt } from '../lib/crypto/aes'

const prisma = new PrismaClient()

async function main() {
  // --- Users ---
  const users = await prisma.user.findMany({
    where: { emailEncrypted: null },
    select: { id: true, email: true, name: true },
  })
  console.log(`[INFO] Migriere ${users.length} User-Einträge...`)

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailEncrypted: encrypt(user.email),
        nameEncrypted:  user.name ? encrypt(user.name) : null,
      },
    })
  }
  console.log(`[OK]   ${users.length} User-Einträge verschlüsselt.`)

  // --- PraxisUsers ---
  const praxisUsers = await prisma.praxisUser.findMany({
    where: { emailEncrypted: null },
    select: { id: true, email: true, name: true },
  })
  console.log(`[INFO] Migriere ${praxisUsers.length} PraxisUser-Einträge...`)

  for (const pu of praxisUsers) {
    await prisma.praxisUser.update({
      where: { id: pu.id },
      data: {
        emailEncrypted: encrypt(pu.email),
        nameEncrypted:  encrypt(pu.name),
      },
    })
  }
  console.log(`[OK]   ${praxisUsers.length} PraxisUser-Einträge verschlüsselt.`)
}

main()
  .catch((e) => {
    console.error('[FAIL] Migration fehlgeschlagen:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

> **Idempotenz:** Das Skript prüft `where: { emailEncrypted: null }` — bereits migrierte
> Einträge werden übersprungen. Mehrfaches Ausführen ist sicher.

> **Produktions-Ausführung:** Über Coolify-Terminal oder SSH auf VPS ausführen.
> Dokumentiert in `docs/dev-prompts/OpenActions.md`.

---

## Sub-Track E — forge-web-deviations.md aktualisieren

**Datei:** `docs/forge-web-deviations.md` (MOD)

Die bisherige Abweichung `User.email Plaintext` ist nach diesem Sprint behoben.
Status auf `Resolved` setzen, Datum ergänzen.

---

## CHANGELOG-Eintrag (im selben Commit)

Unter `## [Unreleased]` einfügen:

```markdown
### Added
- Sprint 3: PII-Encryption & Structured Logging
  - `lib/utils/logger.ts` — Pino-Logger (strukturiertes JSON-Logging, PII-Redaction)
  - `lib/crypto/aes.ts` MOD: Versions-Präfix `v1:` im Ciphertext-Format (Key-Rotation-vorbereitet)
  - `lib/crypto/aes.ts` MOD: `decrypt()` abwärtskompatibel (erkennt Legacy-Format ohne `v1:`)
  - Prisma-Migration: `User.emailEncrypted`, `User.nameEncrypted` (AES-256-GCM)
  - Prisma-Migration: `PraxisUser.emailEncrypted`, `PraxisUser.nameEncrypted` (AES-256-GCM)
  - `scripts/migrate-pii.ts` — idempotentes Datenmigrations-Skript
  - Alle `console.*`-Calls in `lib/` ersetzt durch `logger.*`

### Fixed
- `docs/forge-web-deviations.md`: Abweichung `User.email Plaintext` → Status Resolved
```

---

## Validation Block

```powershell
# 1. Logger-Datei vorhanden
Test-Path lib/utils/logger.ts                          # → True

# 2. Pino installiert
Select-String '"pino"' package.json                    # → Treffer

# 3. v1-Präfix in aes.ts
Select-String "v1:" lib/crypto/aes.ts                  # → Treffer (encrypt + decrypt)

# 4. Abwärtskompatibilität: Legacy-Pfad vorhanden
Select-String "startsWith.*v1" lib/crypto/aes.ts       # → Treffer

# 5. Neue Felder in Schema
Select-String "emailEncrypted" prisma/schema.prisma    # → 2 Treffer (User + PraxisUser)
Select-String "nameEncrypted" prisma/schema.prisma     # → 2 Treffer

# 6. Migration vorhanden
Get-ChildItem prisma/migrations -Filter "*pii*"        # → Treffer

# 7. Kein console.* mehr in lib/ (außer scripts/)
$hits = Select-String "console\.(log|warn|error)" lib -Recurse |
  Where-Object { $_.Path -notmatch "scripts/" }
if ($hits) { Write-Host "[FAIL] console.* noch vorhanden:"; $hits }
else       { Write-Host "[OK]  Keine console.*-Calls in lib/" }

# 8. Kein PII im Logger (Stichproben-Check)
Select-String "logger\.(info|warn|error).*email\|logger\.(info|warn|error).*@" lib -Recurse
# → Zero Treffer erwartet

# 9. AES Roundtrip mit v1-Format
# (manuell oder via Test):
# node -e "process.env.ENCRYPTION_SECRET='a'.repeat(64); const {encrypt,decrypt} = require('./lib/crypto/aes'); const c = encrypt('test'); console.log(c.startsWith('v1:')); console.log(decrypt(c) === 'test')"

# 10. TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit          # → 0 Fehler

# 11. Alle Tests grün (Regression-Check)
pnpm test                                              # → Alle PASS

# 12. forge-web-deviations.md aktualisiert
Select-String "Resolved" docs/forge-web-deviations.md # → Treffer (User.email Abweichung)
```

**Stop-Conditions (bekannte Fallstricke):**
- `pino` ist ein Server-only-Modul. Wird es versehentlich in einen Client-Component importiert,
  schlägt der Build fehl. `logger.ts` nur in `lib/` und `app/api/` importieren, nie in
  `components/` oder `app/(dashboard)/`
- `prisma migrate dev` schlägt fehl wenn DB nicht erreichbar → `docker compose up` sicherstellen
- Legacy-`decrypt()` Pfad: API-Keys in der DB haben das alte Format ohne `v1:` →
  `decrypt()` muss beide Formate handhaben bis alle Keys re-verschlüsselt sind
- `vi.mock('pino', ...)` in Tests vermeiden — `logger.ts` stattdessen via
  `vi.mock('@/lib/utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))` mocken

---

## Auto-Commit Block

```powershell
git add lib/utils/logger.ts
git add lib/crypto/aes.ts
git add prisma/schema.prisma
git add prisma/migrations/
git add scripts/migrate-pii.ts
git add lib/                    # alle console.* → logger.* Änderungen
git add docs/forge-web-deviations.md
git add CHANGELOG.md docs/roadmap.md

git commit -m "feat(security): Sprint 3 — Pino-Logger, AES v1-Präfix, PII-Encryption User/PraxisUser"
```

---

## Post-Sprint: Produktions-Datenmigration

Nach Deploy auf VPS (außerhalb dieses Sprints):

```powershell
# Auf VPS-Terminal via Coolify:
pnpm ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-pii.ts
```

Dieser Schritt ist in `docs/dev-prompts/OpenActions.md` zu dokumentieren.

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT 3 — PII-ENCRYPTION & LOGGING ABSCHLUSSBERICHT
======================================================

Sprint: 3 — Pino-Logger, AES v1-Präfix, PII-Encryption
Anforderungen: web-encryption-at-rest.mdc, terminal-output.mdc, ADR-003

CHECKS:
  Pre-Slice Validation:            [ ] 4/4 PASS
  lib/utils/logger.ts angelegt:    [ ]
  Pino installiert:                [ ]
  console.* in lib/ bereinigt:     [ ] x verbleibende Treffer
  AES v1-Präfix implementiert:     [ ]
  AES abwärtskompatibel:           [ ]
  Prisma-Migration (PII-Felder):   [ ]
  Migrationsskript angelegt:       [ ]
  Alle Tests grün:                 [ ] x/x PASS
  TypeScript 0 Fehler:             [ ]
  forge-web-deviations aktuell:    [ ]
  CHANGELOG aktuell:               [ ]

DATEIEN:
  Angelegt:    lib/utils/logger.ts, scripts/migrate-pii.ts
               prisma/migrations/<timestamp>_pii_encryption_fields/
  Modifiziert: lib/crypto/aes.ts (v1-Präfix)
               prisma/schema.prisma (emailEncrypted, nameEncrypted)
               lib/**/*.ts (console.* → logger.*)
               docs/forge-web-deviations.md (Abweichung Resolved)

DRIFT: <keiner / Abweichungen dokumentieren>

═══════════════════════════════════════════════
[OK] SPRINT 3 ABGESCHLOSSEN
▶ Nächste Priorität: Sprint Phase-1-Restarbeiten (5 Slices)
═══════════════════════════════════════════════
```
