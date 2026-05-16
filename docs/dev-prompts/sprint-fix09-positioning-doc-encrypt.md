# Sprint FIX-09 — `positioningDocument` AES-256-GCM Verschlüsselung

**Projekt:** Vysible
**Sprint:** FIX-09
**Format:** Tier 1
**Abhängigkeit:** FIX-06 ✅ (AES-Infrastruktur: v1:-Format, ENCRYPTION_SECRET_V1)
**Anforderungen:** ADR-003, Audit 2026-05-16 Schwere 3, forge-web-deviations.md
**Geschätzte Dauer:** ~1–2 Tage

> **Ziel:** `Project.positioningDocument` liegt als Klartext in PostgreSQL.
> Das Feld enthält praxis-sensible Strategieinformationen (Positionierung, Zielgruppe,
> USPs) und ist daher ein Datenschutz-Risiko. Dieser Sprint ergänzt ein
> `positioningDocumentEncrypted`-Feld (AES-256-GCM, v1:-Format), aktualisiert alle
> Lese- und Schreibpunkte und liefert ein Migrations-Script für bestehende Einträge.
>
> **Pre-Condition:** `ENCRYPTION_SECRET_V1` (oder `ENCRYPTION_SECRET`) muss in `.env`
> gesetzt sein — AES-Infrastruktur aus FIX-06 wird direkt genutzt.
> Migrations-Script (`--apply`) erst nach Code-Deploy auf Prod ausführen.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus
(Phase 0 — PSR + Phase 1 — technische Gates).
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.
Bei GO: Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Prisma-Schema: positioningDocument und umliegende Felder
Select-String "positioningDocument|positioningDocumentEncrypted" prisma/schema.prisma

# 2. Alle Write-Punkte (Stellen die positioningDocument schreiben)
Get-ChildItem app -Recurse -Include "*.ts","*.tsx" |
  Select-String "positioningDocument" |
  Select-Object Path, LineNumber, Line

# 3. Alle Read-Punkte in lib/
Get-ChildItem lib -Recurse -Include "*.ts" |
  Select-String "positioningDocument" |
  Select-Object Path, LineNumber, Line

# 4. Betroffene Dateien vollständig lesen
Get-Content app/api/projects/route.ts
Get-Content "app/api/projects/[id]/settings/route.ts"
Get-Content app/api/hedy/import/route.ts
Get-Content lib/ai/context-builder.ts
Get-Content lib/generation/pipeline.ts
Get-Content lib/types/prisma.ts

# 5. Migrations-Script als Referenz
Get-Content scripts/migrate-aes-prefix.ts

# 6. AES-Infrastruktur: aktuelle aes.ts
Get-Content lib/crypto/aes.ts

# 7. Bestehende Migration als Referenz (Prisma-Format)
Get-ChildItem prisma/migrations -Name | Sort-Object | Select-Object -Last 3

# 8. Stille Catches in betroffenen Dateien
Select-String "catch\s*\(\(\)\s*=>\s*\{\s*\}\)" lib/generation/pipeline.ts,lib/ai/context-builder.ts -ErrorAction SilentlyContinue
```

**Bekannte Lücken (Stand 2026-05-16, aus Audit + OpenActions):**

| Datei | Lücke | Priorität |
|---|---|---|
| `prisma/schema.prisma` | `positioningDocument String?` — kein Verschlüsselungs-Feld | MUSS |
| `app/api/projects/route.ts:67` | Schreibt Klartext `positioningDocument` | MUSS |
| `app/api/projects/[id]/settings/route.ts:55` | Schreibt Klartext `positioningDocument` | MUSS |
| `app/api/hedy/import/route.ts:64` | Schreibt Klartext `positioningDocument` | MUSS |
| `lib/ai/context-builder.ts:37-38` | Liest Klartext für AI-Context | MUSS |
| `lib/generation/pipeline.ts:97,192,216` | Liest Klartext an 3 Stellen | MUSS |
| `lib/generation/themes.ts:22` | Liest Klartext | MUSS |
| `scripts/migrate-fix09-positioning.ts` | Migration-Script fehlt | MUSS |
| `__tests__/unit/generation/` | Kein Test für Encrypt/Decrypt-Roundtrip | SOLL |

---

## CRITICAL: Self-review Checklist

- [ ] `positioningDocumentEncrypted` wird bei jedem Write gesetzt (encrypt vor DB)
- [ ] `positioningDocument` wird bei jedem Write auf `null` gesetzt (kein Doppelklartext)
- [ ] Lese-Punkte: `positioningDocumentEncrypted ? decrypt(...) : positioningDocument` (Fallback)
- [ ] Fallback auf `positioningDocument` bleibt bis nach Datenmigration — nicht entfernen
- [ ] `positioningDocument` wird NICHT in AI-Prompts, Logs oder API-Responses gesendet
- [ ] Kein stiller Catch: alle AES-Calls in try/catch mit `logger.error` oder re-throw (Forge §3a)
- [ ] Migrations-Script: Dry-Run als Standard — `--apply` für echte Änderungen
- [ ] Script: idempotent — Rows mit gesetztem `positioningDocumentEncrypted` werden übersprungen
- [ ] TypeScript strict: 0 Fehler
- [ ] CHANGELOG.md in diesem Commit aktualisiert
- [ ] `docs/forge-web-deviations.md` Abweichungs-Eintrag für `positioningDocument` schließen

---

## Sub-Slice A — Prisma-Migration + Schreib-Punkte (Write-Layer)

**Aufwand:** ~3 Stunden
**Scope:** Prisma-Schema um `positioningDocumentEncrypted String?` ergänzen,
alle 3 API-Routen die `positioningDocument` schreiben auf Encrypt-on-Write umstellen.

### IN

```
prisma/schema.prisma                            MOD — neues Feld
prisma/migrations/<timestamp>_fix09_pos_doc/    NEU — Migration SQL
app/api/projects/route.ts                       MOD — encrypt on create
app/api/projects/[id]/settings/route.ts         MOD — encrypt on update
app/api/hedy/import/route.ts                    MOD — encrypt on import
```

### OUT

```
lib/                   NICHT anfassen (Sub-Slice B)
scripts/               NICHT anfassen (Sub-Slice C)
__tests__/             NICHT anfassen (Sub-Slice D)
```

### A1 — Prisma Schema

```prisma
model Project {
  // ... bestehende Felder ...
  positioningDocument          String?   // Klartext-Fallback (wird nach Migration geleert)
  positioningDocumentEncrypted String?   // AES-256-GCM, Format: v1:iv:tag:cipher
}
```

```sql
-- Migration SQL (manuell in neue Migration-Datei):
ALTER TABLE "Project" ADD COLUMN "positioningDocumentEncrypted" TEXT;
```

### A2 — Write-Pattern (für alle 3 Routen)

```typescript
import { encrypt } from '@/lib/crypto/aes'

// Bei jedem Schreib-Vorgang:
// 1. Neues Feld verschlüsselt setzen
// 2. Altes Klartextfeld leeren (kein Doppelklartext nach Migration)
const updateData = {
  positioningDocumentEncrypted: data.positioningDocument
    ? encrypt(data.positioningDocument)
    : null,
  positioningDocument: null,  // Klartextfeld leeren
}
```

> **WICHTIG:** `positioningDocument = null` nur setzen wenn auch
> `positioningDocumentEncrypted` gesetzt wird. Sonst könnte bei leerem
> Dokument das alte Klartextfeld fälschlicherweise für unmigrated Rows gelöscht werden.

### Acceptance Checklist

- [ ] `prisma/schema.prisma`: `positioningDocumentEncrypted String?` vorhanden
- [ ] Prisma-Migration-Datei erstellt (`prisma migrate dev --name fix09_positioning_doc`)
- [ ] `app/api/projects/route.ts`: encrypt on create ✅, `positioningDocument: null` ✅
- [ ] `app/api/projects/[id]/settings/route.ts`: encrypt on update ✅
- [ ] `app/api/hedy/import/route.ts`: encrypt on import ✅
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(crypto): positioningDocument AES-256-GCM Verschluesselung — Write-Layer (FIX-09 Sub-A)
```

---

## Sub-Slice B — Lese-Punkte (Read-Layer)

**Aufwand:** ~2 Stunden
**Scope:** Alle 5 lib-Stellen die `positioningDocument` lesen auf
Decrypt-on-Read umstellen. Fallback auf Klartext-Feld für noch nicht migrierte Rows.

### IN

```
lib/ai/context-builder.ts     MOD — decrypt on read
lib/generation/pipeline.ts    MOD — decrypt on read (3 Stellen)
lib/generation/themes.ts      MOD — decrypt on read
lib/types/prisma.ts           MOD — ggf. Type anpassen
app/(dashboard)/projects/[id]/page.tsx  MOD — decrypt für Anzeige (Länge)
```

### OUT

```
app/api/           NICHT anfassen (Sub-Slice A)
scripts/           NICHT anfassen (Sub-Slice C)
__tests__/         NICHT anfassen (Sub-Slice D)
```

### B1 — Read-Helper (in `lib/utils.ts` oder inline)

```typescript
import { decrypt } from '@/lib/crypto/aes'

// Einheitliches Lese-Pattern für alle Read-Punkte:
function readPositioningDoc(project: {
  positioningDocumentEncrypted?: string | null
  positioningDocument?: string | null
}): string | undefined {
  if (project.positioningDocumentEncrypted) {
    return decrypt(project.positioningDocumentEncrypted)
  }
  return project.positioningDocument ?? undefined  // Fallback für unmigrated Rows
}
```

> **Hinweis:** Diesen Helper in alle 5 Read-Stellen einsetzen — kein Doppel-Code
> (Forge no-duplication-Regel).

### B2 — Prisma-Select aktualisieren

Alle `prisma.project.findUnique/findFirst` mit `positioningDocument: true` müssen
`positioningDocumentEncrypted: true` ergänzen (beide Felder parallel bis Migration):

```typescript
select: {
  // ...
  positioningDocument: true,           // Fallback
  positioningDocumentEncrypted: true,  // NEU
}
```

### B3 — Dashboard-Anzeige (Zeichenanzahl)

```typescript
// app/(dashboard)/projects/[id]/page.tsx
// Aktuell: project.positioningDocument.length / 4 → Token-Schätzung
// Neu: readPositioningDoc(project)?.length / 4
```

### Acceptance Checklist

- [ ] `lib/ai/context-builder.ts`: liest `positioningDocumentEncrypted` mit Fallback
- [ ] `lib/generation/pipeline.ts`: alle 3 Stellen aktualisiert
- [ ] `lib/generation/themes.ts`: aktualisiert
- [ ] `app/(dashboard)/projects/[id]/page.tsx`: Längenanzeige korrekt
- [ ] `readPositioningDoc()` Helper an einer Stelle definiert (kein Duplikat)
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(crypto): positioningDocument AES-256-GCM Verschluesselung — Read-Layer (FIX-09 Sub-B)
```

---

## Sub-Slice C — Migrations-Script

**Aufwand:** ~1.5 Stunden
**Scope:** `scripts/migrate-fix09-positioning.ts` — verschlüsselt alle bestehenden
`Project.positioningDocument`-Werte in `positioningDocumentEncrypted`.

### IN

```
scripts/migrate-fix09-positioning.ts   NEU — Dry-Run standard, --apply für echte Migration
```

### OUT

```
prisma/            NICHT anfassen
lib/               NICHT anfassen
app/               NICHT anfassen
```

### C1 — Script-Logik

```typescript
// Analog zu scripts/migrate-aes-prefix.ts:
// 1. Alle Projects laden wo positioningDocument != null UND positioningDocumentEncrypted == null
// 2. Dry-Run: Anzahl + ID ausgeben (KEIN Inhalt — PII)
// 3. --apply: encrypt(positioningDocument) → positioningDocumentEncrypted, positioningDocument = null
// 4. Idempotent: Skip wenn positioningDocumentEncrypted bereits gesetzt
// 5. Bei Fehler: Script abbrechern (process.exit(1))
// 6. KEIN positioningDocument-Inhalt in Logs — nur ID + Zeichenlänge
```

### C2 — Deployment-Reihenfolge (Prod)

```
1. Sub-Slice A + B deployen (Prisma-Migration + Encrypt/Decrypt-Code)
2. pnpm prisma migrate deploy auf Prod-DB ausführen
3. App-Start testen (Login + Projekt öffnen)
4. npx tsx scripts/migrate-fix09-positioning.ts  (Dry-Run — prüfen wie viele Rows)
5. npx tsx scripts/migrate-fix09-positioning.ts --apply
6. Stichproben: Projekt öffnen → positioningDocument lesbar, Generation startet
7. Cleanup (separater Sprint): positioningDocument-Feld aus Schema entfernen
```

### Acceptance Checklist

- [ ] Dry-Run: gibt Anzahl betroffener Projekte aus, schreibt nichts in DB
- [ ] `--apply`: migriert alle Rows, loggt nur ID + Länge (kein Klartext)
- [ ] Idempotent: zweiter Aufruf → alle Rows `[SKIP]`
- [ ] Bei Fehler: `process.exit(1)`, keine Teil-Migration
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(crypto): Migrations-Script positioningDocument AES-Verschluesselung (FIX-09 Sub-C)
```

---

## Sub-Slice D — Unit-Tests

**Aufwand:** ~1 Stunde
**Scope:** Roundtrip-Test + Fallback-Test für `readPositioningDoc()`.

### IN

```
__tests__/unit/generation/positioning-doc.test.ts  NEU
```

### OUT

```
lib/    NICHT anfassen
app/    NICHT anfassen
```

### D1 — Test-Cases

```typescript
// 1. encrypt + readPositioningDoc(positioningDocumentEncrypted) → Klartext zurück
// 2. readPositioningDoc({ positioningDocument: 'legacy', positioningDocumentEncrypted: null })
//    → 'legacy' (Fallback funktioniert)
// 3. readPositioningDoc({ positioningDocument: null, positioningDocumentEncrypted: null })
//    → undefined (kein crash)
// 4. Korrumpierter encryptedValue → wirft Error (kein silent fail)
```

### Acceptance Checklist

- [ ] Alle 4 Tests grün
- [ ] Alle bestehenden Tests weiterhin grün (44+ Tests)
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
test(crypto): positioningDocument Encrypt/Decrypt Roundtrip + Fallback Tests (FIX-09 Sub-D)
```

---

## Abschluss-Validation (nach allen Sub-Slices)

```powershell
# 1. TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit
# → Keine Ausgabe

# 2. Alle Tests grün
pnpm vitest run
# → Alle Tests PASS

# 3. positioningDocumentEncrypted in Schema vorhanden
Select-String "positioningDocumentEncrypted" prisma/schema.prisma
# → Mindestens 1 Treffer

# 4. Kein Read ohne Decrypt-Fallback
Select-String "positioningDocument[^E]" lib/generation/pipeline.ts,lib/ai/context-builder.ts -ErrorAction SilentlyContinue
# → Zero Treffer (nur positioningDocumentEncrypted darf erscheinen)

# 5. Write-Pattern: encrypt vorhanden in allen 3 Routes
Select-String "encrypt" app/api/projects/route.ts,"app/api/projects/[id]/settings/route.ts",app/api/hedy/import/route.ts
# → Mindestens 3 Treffer

# 6. Migrations-Script existiert
Test-Path scripts/migrate-fix09-positioning.ts
# → True

# 7. Kein stiller Catch
Select-String "catch\s*\(\(\)\s*=>\s*\{\s*\}\)" lib/generation/pipeline.ts,lib/ai/context-builder.ts -ErrorAction SilentlyContinue
# → Zero Treffer
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| `positioningDocument`-Feld aus Schema entfernen (DROP COLUMN) | Erst nach erfolgreicher Datenmigration + Stichproben auf Prod — eigener Cleanup-Sprint |
| Andere `Project`-Felder verschlüsseln (`name`, `praxisUrl`) | Kein Datenschutz-Risiko für non-PII Felder |
| Key-Rotation auf V2 | Erst wenn V1-Infrastruktur stabil läuft |
| Client-seitige Verschlüsselung | Single-Tenant agentur-intern — Server-seitig ausreichend |
| Audit-Log für Decrypt-Zugriffe | Phase 4 / NFA-Härtung |

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR ein Commit vorgeschlagen
> oder ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md`: FIX-09 auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint FIX-09)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: FIX-09-Eintrag schließen |
| 3 | forge-web-deviations.md | `positioningDocument`-Abweichung als Closed markieren |
| 4 | Sprint-Prompt archivieren | `Move-Item docs/dev-prompts/sprint-fix09-positioning-doc-encrypt.md docs/dev-prompts/archive/` |
| 5 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]` |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT FIX-09 ABSCHLUSSBERICHT
===============================

Sprint: FIX-09 — positioningDocument AES-256-GCM Verschlüsselung

SUB-SLICES:
  A Prisma + Write-Layer:              [ ] DONE — Commit: <hash>
  B Read-Layer:                        [ ] DONE — Commit: <hash>
  C Migrations-Script:                 [ ] DONE — Commit: <hash>
  D Unit-Tests:                        [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:                 [ ]
  Alle Tests grün:                     [ ] x/x PASS
  positioningDocumentEncrypted in DB:  [ ]
  Fallback auf Klartext-Feld OK:       [ ]
  Migrations-Script Dry-Run OK:        [ ]
  Kein stiller Catch:                  [ ]
  CHANGELOG aktuell:                   [ ]
  forge-web-deviations.md geschlossen: [ ]

DEPLOYMENT-STATUS (nach Prod-Rollout):
  prisma migrate deploy:               [ ] (ausstehend)
  Dry-Run auf Prod-DB:                 [ ] (ausstehend)
  migrate-fix09 --apply:               [ ] (ausstehend)
  Stichproben Generation OK:           [ ] (ausstehend)
  Cleanup-Sprint (DROP COLUMN):        [ ] (separater Sprint)

═══════════════════════════════════════════════
[OK] FIX-09 ABGESCHLOSSEN (Code-Stand)
▶ Nächste Priorität: Cleanup-Sprint (positioningDocument DROP COLUMN nach Datenmigration)
   oder Phase 4 (SEO-Analyse, Bildbriefing)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-fix09-positioning-doc-encrypt.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
