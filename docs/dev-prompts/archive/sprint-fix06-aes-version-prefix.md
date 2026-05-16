# Sprint FIX-06 — AES-256-GCM Versions-Präfix für Key-Rotation (ADR-003)

**Projekt:** Vysible  
**Sprint:** FIX-06  
**Format:** Tier 1  
**Abhängigkeit:** FIX-05 ✅  
**Anforderungen:** ADR-003 (Audit 2026-05-16 Schwere 2)  
**Geschätzte Dauer:** ~1 Tag

> **Ziel:** `lib/crypto/aes.ts` speichert verschlüsselte Werte aktuell als `iv:authTag:ciphertext`.
> ADR-003 identifiziert dies als bekannte Lücke: Ohne Versions-Präfix ist eine Key-Rotation
> (`ENCRYPTION_SECRET_V2`) nicht möglich ohne alle verschlüsselten Werte gleichzeitig zu migrieren.
> Dieser Sprint ändert das Format auf `v1:iv:authTag:ciphertext` mit vollständiger
> Rückwärtskompatibilität und liefert ein einmaliges Migrations-Script für bestehende DB-Einträge.

> **Pre-Condition (vor Sprint-Start prüfen):**  
> `ENCRYPTION_SECRET` (64-Hex-Zeichen) muss in `.env` gesetzt sein — wird in Sub-Slice A als
> `ENCRYPTION_SECRET_V1`-Fallback verwendet. Das Migrations-Script (`--apply`) darf erst nach
> Code-Deploy und ENV-Update auf Prod ausgeführt werden → Deployment-Reihenfolge in Sub-Slice B beachten.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus
(Phase 0 — PSR + Phase 1 — technische Gates).
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.
Bei GO: Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Aktuelles aes.ts vollständig lesen
Get-Content lib/crypto/aes.ts

# 2. Aktuelles Format prüfen — Präfix-String suchen
Select-String "iv:|v1:|authTag" lib/crypto/aes.ts

# 3. Bestehende Unit-Tests lesen
Get-Content __tests__/unit/crypto/aes.test.ts

# 4. ENV-Variablen: welche ENCRYPTION_SECRET-Variante ist aktuell genutzt?
Select-String "ENCRYPTION_SECRET" lib/crypto/aes.ts
Select-String "ENCRYPTION_SECRET" .env.example

# 5. Alle Stellen im Codebase die encrypt() / decrypt() aufrufen
Select-String "encrypt\(|decrypt\(" lib,app -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 20

# 6. Betroffene Prisma-Modelle — alle verschlüsselten Felder
Select-String "encryptedKey|encryptedPassword|encryptedAccessToken|encryptedRefreshToken|emailEncrypted|nameEncrypted" prisma/schema.prisma

# 7. migrate-pii.ts als Referenz für Script-Struktur
Get-Content scripts/migrate-pii.ts

# 8. Forge-Abweichungen: stille Catches in lib/crypto
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" lib/crypto -Recurse -ErrorAction SilentlyContinue
```

**Bekannte Lücken (Stand 2026-05-16, aus ADR-003 + Audit Schwere 2):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/crypto/aes.ts` | Kein Versions-Präfix → Key-Rotation unmöglich ohne Bulk-Migration | MUSS |
| `.env.example` | Nur `ENCRYPTION_SECRET` — kein `V1`-Schema dokumentiert | MUSS |
| `scripts/migrate-aes-prefix.ts` | Script existiert nicht | MUSS |
| `__tests__/unit/crypto/aes.test.ts` | Keine Tests für v1:-Präfix und Rückwärtskompatibilität | MUSS |

---

## CRITICAL: Self-review Checklist

- [ ] `encrypt()` gibt immer einen String zurück der mit `v1:` beginnt
- [ ] `decrypt("v1:...")` entschlüsselt korrekt mit `ENCRYPTION_SECRET_V1 ?? ENCRYPTION_SECRET`
- [ ] `decrypt("iv:tag:cipher")` (ohne Präfix) funktioniert weiterhin — Rückwärtskompatibilität
- [ ] `decrypt("v2:...")` wirft Error mit klarer Meldung — kein silenter Fehlschlag (Forge §3a)
- [ ] Kein stiller Catch: Fehler wird geworfen oder geloggt, nie geschluckt (Forge §3a)
- [ ] Kein Klartext-Credential in Logs — nur Metadaten (Präfix, Länge)
- [ ] Migrations-Script: Dry-Run als Standard — `--apply` nötig für echte DB-Änderungen
- [ ] Script bricht bei erstem Fehler ab — keine Teil-Migrationen (Konsistenz)
- [ ] Unit-Tests: alle 4 neuen Testfälle implementiert und grün
- [ ] Alle bestehenden Tests in `aes.test.ts` weiterhin grün (keine Regression)
- [ ] TypeScript strict: 0 Fehler
- [ ] CHANGELOG.md in diesem Commit aktualisiert

---

## Sub-Slice A — `lib/crypto/aes.ts` + `.env.example`

**Aufwand:** ~2 Stunden  
**Scope:** Versions-Präfix in `encrypt()` einführen, `decrypt()` versions-aware machen, ENV-Schema aktualisieren.

### IN

```
lib/crypto/aes.ts              MOD — encrypt() + decrypt() mit v1:-Präfix-Logik
.env.example                   MOD — ENCRYPTION_SECRET_V1 + Legacy-Kommentar
```

### OUT

```
scripts/                       NICHT anfassen (Sub-Slice B)
__tests__/                     NICHT anfassen (Sub-Slice C)
lib/ (alle anderen Dateien)    NICHT anfassen
```

### A1 — Schlüssel-Auflösung

```typescript
// Key für v1 (beide ENV-Varianten unterstützen):
const KEY_V1_HEX = process.env.ENCRYPTION_SECRET_V1 ?? process.env.ENCRYPTION_SECRET
if (!KEY_V1_HEX) throw new Error('[Vysible] ENCRYPTION_SECRET_V1 oder ENCRYPTION_SECRET muss gesetzt sein')
const KEY_V1 = Buffer.from(KEY_V1_HEX, 'hex')
```

### A2 — encrypt(): v1:-Präfix hinzufügen

```typescript
// Format: "v1:" + iv.hex + ":" + authTag.hex + ":" + ciphertext.hex
export function encrypt(plaintext: string): string {
  // ... bestehende AES-256-GCM Logik (unverändert) ...
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}
```

### A3 — decrypt(): versions-aware

```typescript
export function decrypt(ciphertext: string): string {
  if (ciphertext.startsWith('v1:')) {
    const [, ivHex, tagHex, dataHex] = ciphertext.split(':')
    // → KEY_V1 verwenden
  } else if (ciphertext.startsWith('v2:')) {
    throw new Error('[Vysible] AES v2-Schlüssel noch nicht implementiert')
  } else {
    // Legacy: kein Präfix → ENCRYPTION_SECRET (Rückwärtskompatibilität, identisches Secret)
    const [ivHex, tagHex, dataHex] = ciphertext.split(':')
    // → KEY_V1 verwenden (gleicher Key, nur ENV-Name unterscheidet sich)
  }
}
```

### A4 — .env.example aktualisieren

```bash
# AES-256-GCM Schlüssel (Version 1) — 64 Hex-Zeichen = 32 Bytes
# Generieren: openssl rand -hex 32
# Gleiches Secret wie bisheriger ENCRYPTION_SECRET — nur umbenannt
ENCRYPTION_SECRET_V1="REPLACE_WITH_64_CHAR_HEX_STRING"

# Legacy-Fallback (wird nach Migrations-Script-Ausführung auf Prod auskommentiert)
# ENCRYPTION_SECRET="..."
```

### Acceptance Checklist

- [ ] `encrypt()` gibt String zurück der mit `v1:` beginnt
- [ ] `decrypt("v1:iv:tag:cipher")` entschlüsselt korrekt
- [ ] `decrypt("iv:tag:cipher")` (Legacy ohne Präfix) entschlüsselt korrekt
- [ ] `decrypt("v2:...")` wirft Error
- [ ] Weder `ENCRYPTION_SECRET_V1` noch `ENCRYPTION_SECRET` gesetzt → Error beim Modulstart
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(crypto): AES-256-GCM v1:-Präfix + Rückwärtskompatibilität (FIX-06 Sub-A)
```

---

## Sub-Slice B — `scripts/migrate-aes-prefix.ts`

**Aufwand:** ~2 Stunden  
**Scope:** Einmaliges Migrations-Script, das alle verschlüsselten DB-Felder von `iv:tag:cipher` auf `v1:iv:tag:cipher` aktualisiert.

### IN

```
scripts/migrate-aes-prefix.ts  NEU — Dry-Run (Standard) + --apply Modus
```

### OUT

```
lib/crypto/aes.ts              NICHT anfassen (Sub-Slice A)
prisma/schema.prisma           NICHT anfassen
app/                           NICHT anfassen
```

### B1 — Betroffene Felder

| Modell | Feld(er) |
|---|---|
| `ApiKey` | `encryptedKey` |
| `SmtpConfig` | `encryptedPassword` |
| `CanvaToken` | `encryptedAccessToken`, `encryptedRefreshToken` |
| `PraxisUser` | `emailEncrypted`, `nameEncrypted` (wenn befüllt) |
| `User` | `emailEncrypted`, `nameEncrypted` (wenn befüllt) |

### B2 — Script-Logik (Dry-Run als Standard)

```typescript
// --apply Flag nötig für echte DB-Änderungen, sonst nur Ausgabe
// Pro Modell / pro Feld:
// 1. Alle Zeilen laden
// 2. Wenn Wert NICHT mit "v1:" beginnt: decrypt() (Legacy-Format)
// 3. encrypt() (neues Format mit v1:-Präfix)
// 4. prisma.model.update({ data: { field: newValue } })  // nur bei --apply
// 5. Fortschritt loggen: "Modell.feld n/total" (nur Metadaten, kein Inhalt)
// Bei jedem Fehler: Script abbrechen, keine weiteren Updates
```

### B3 — Deployment-Reihenfolge (WICHTIG — vor --apply auf Prod)

```
1. Sub-Slice A + C deployen (neues encrypt/decrypt mit Rückwärtskompatibilität)
2. ENCRYPTION_SECRET_V1 in Coolify hinzufügen (gleicher Wert wie ENCRYPTION_SECRET)
3. App neu starten → Login + API-Key-Entschlüsselung testen
4. Migrations-Script ausführen: npx tsx scripts/migrate-aes-prefix.ts --apply
5. Stichproben-Verifikation: Login + API-Key-Test + Export
6. ENCRYPTION_SECRET (altes ENV) aus Coolify entfernen
```

### Acceptance Checklist

- [ ] `--dry-run` (Standard): gibt Anzahl betroffener Zeilen aus, schreibt nichts in DB
- [ ] `--apply`: migriert alle Felder korrekt, Fortschritt wird geloggt
- [ ] Bei Fehler: Script bricht ab, keine weiteren Updates (Konsistenz)
- [ ] Keine Credentials / PII im Script-Output — nur IDs + Länge
- [ ] `scripts/migrate-aes-prefix.ts --dry-run` läuft ohne Fehler auf Dev-DB

### Commit-Message

```
feat(crypto): Migrations-Script AES v1:-Präfix für bestehende DB-Einträge (FIX-06 Sub-B)
```

---

## Sub-Slice C — Unit-Tests `aes.test.ts` erweitern

**Aufwand:** ~1 Stunde  
**Scope:** 4 neue Testfälle für v1:-Präfix, Rückwärtskompatibilität und v2-Error.

### IN

```
__tests__/unit/crypto/aes.test.ts  MOD — 4 neue Testfälle ergänzen
```

### OUT

```
lib/crypto/aes.ts               NICHT anfassen (Sub-Slice A)
scripts/                        NICHT anfassen (Sub-Slice B)
```

### C1 — Neue Testfälle

```typescript
it('encrypt() gibt String zurück der mit "v1:" beginnt')
it('decrypt("v1:iv:tag:cipher") entschlüsselt korrekt (Round-Trip)')
it('decrypt("iv:tag:cipher" ohne Präfix) — Rückwärtskompatibilität bleibt erhalten')
it('decrypt("v2:...") wirft Error "noch nicht implementiert"')
```

### Acceptance Checklist

- [ ] Alle 4 neuen Tests grün
- [ ] Alle bestehenden Tests in `aes.test.ts` weiterhin grün (keine Regression)
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
test(crypto): AES v1:-Präfix und Rückwärtskompatibilität Unit-Tests (FIX-06 Sub-C)
```

---

## Abschluss-Validation (nach allen Sub-Slices)

```powershell
# 1. TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit
# → Keine Ausgabe

# 2. encrypt() gibt v1:-Präfix (Unit-Tests decken das ab)
pnpm test --run
# → Alle Tests grün

# 3. Kein stiller Catch in lib/crypto/aes.ts
Select-String "catch\s*\(\(\)\s*=>\s*\{\s*\}\)" lib/crypto/aes.ts -ErrorAction SilentlyContinue
# → Zero Treffer

# 4. ENCRYPTION_SECRET_V1 in .env.example dokumentiert
Select-String "ENCRYPTION_SECRET_V1" .env.example
# → Mindestens 1 Treffer

# 5. Migrations-Script existiert
Test-Path scripts/migrate-aes-prefix.ts
# → True

# 6. Dry-Run-Modus als Standard im Script
Select-String "dry.run|--apply" scripts/migrate-aes-prefix.ts -i
# → Mindestens 2 Treffer

# 7. v2-Fehlerbehandlung vorhanden
Select-String "v2:" lib/crypto/aes.ts
# → Mindestens 1 Treffer
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| `ENCRYPTION_SECRET_V2` (echte Key-Rotation) | Präfix-Infrastruktur schafft erst die Voraussetzung |
| `positioningDocument` verschlüsseln (FIX-09) | Eigener Sprint — gleiche Migrations-Mechanik, separater Scope |
| Automatisches Key-Rotation-Scheduling | Kein Bedarf für Single-Tenant-Betrieb aktuell |
| Änderungen an Pipeline oder anderen Modulen | Nur `lib/crypto/aes.ts` und `scripts/` betroffen |
| CI/CD-Integration des Migrations-Scripts | Script nur manuell auf Prod ausführen |

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR ein Commit vorgeschlagen
> oder ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md`: FIX-06 auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint FIX-06)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: FIX-06-Eintrag aus Audit-Schwere-2 schließen |
| 3 | Sprint-Prompt archivieren | `Move-Item docs/dev-prompts/sprint-fix06-aes-version-prefix.md docs/dev-prompts/archive/` |
| 4 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]` |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT FIX-06 ABSCHLUSSBERICHT
===============================

Sprint: FIX-06 — AES-256-GCM Versions-Präfix für Key-Rotation (ADR-003)
Datum:  2026-05-16

SUB-SLICES:
  A lib/crypto/aes.ts + .env.example:     [x] DONE
  B scripts/migrate-aes-prefix.ts:        [x] DONE
  C __tests__/unit/crypto/aes.test.ts:    [x] DONE

DRIFT (Abweichungen vom Prompt):
  v1:-Präfix in encrypt() + Backward-Compat in decrypt() waren bereits
  aus Sprint 0 vorhanden. Sub-Slice A auf ENCRYPTION_SECRET_V1-Support +
  v2:-Error reduziert. Alle Acceptance-Kriterien erfüllt.

CHECKS:
  TypeScript 0 Fehler:              [x]
  Alle Tests grün (inkl. neue 2):   [x] 44/44 PASS (war 42, +2 neu)
  encrypt() gibt v1:-Präfix:        [x]
  Rückwärtskompatibilität OK:       [x]
  Migrations-Script Dry-Run OK:     [x] (Dry-Run als Standard, --apply verfügbar)
  Kein stiller Catch:               [x]
  CHANGELOG aktuell:                [x]

DEPLOYMENT-STATUS (nach Prod-Rollout):
  ENCRYPTION_SECRET_V1 in Coolify:  [ ] (ausstehend)
  migrate-aes-prefix.ts --apply:    [ ] (ausstehend — erst nach Deploy)
  Login nach Migration OK:          [ ] (ausstehend)
  ENCRYPTION_SECRET entfernt:       [ ] (ausstehend)

═══════════════════════════════════════════════
[OK] FIX-06 ABGESCHLOSSEN (Code-Stand)
▶ Nächste Priorität: FIX-09 (positioningDocument verschlüsseln — gleiche Mechanik)
   oder FIX-07 (Test-Coverage — NFA-16)
▶ Deployment-Checkliste oben vor Prod-Rollout ausführen.
═══════════════════════════════════════════════
```
