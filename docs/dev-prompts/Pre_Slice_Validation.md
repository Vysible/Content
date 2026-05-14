# Pre-Slice Validation — Vysible

> **Zweck:** Pflicht-Drift-Check vor jedem Sprint/Slice. Stellt sicher, dass der
> Ausgangszustand sauber ist, bevor neue Implementierungsarbeit beginnt.
>
> **Geltungsbereich:** Alle Sprints in `docs/roadmap.md`. Ersetzt die Forge-interne
> `Pre_Slice_Validation.md` (Forge-intern = nicht für Konsumenten-Projekte gedacht).
>
> **Status:** v1.0.0

---

## CRITICAL: Wann ausführen

**Vor jedem Sprint-Start** — bevor der erste Tool-Call zur Implementierung erfolgt.

Der Agent liest diese Datei vollständig und führt die 4 Checks aus.
Bei Hard-FAIL: STOP. Warte auf Maintainer.
Bei 4/4 PASS: direkt mit Implementierung beginnen.

---

## Idempotency Guarantee

Alle Checks sind ausschließlich **Lese-Operationen**. Keine Commits, keine
Datei-Schreiboperationen im Repo. Mehrfaches Ausführen ist gefahrlos.

---

## Die 4 Checks

### Check A — Working Tree clean

```powershell
git status --porcelain
```

| Kriterium | Ergebnis |
|---|---|
| Output leer | ✅ PASS |
| Uncommitted changes | ❌ **Hard-FAIL** |

**Bei Hard-FAIL:** `Working tree dirty. Files: <Liste>. Commit or stash before sprint.`
Kein Auto-Fix. STOP. Maintainer muss bereinigen.

---

### Check B — TypeScript fehlerfrei

```powershell
node node_modules/typescript/bin/tsc --noEmit
```

| Kriterium | Ergebnis |
|---|---|
| 0 TypeScript-Fehler | ✅ PASS |
| TypeScript-Fehler vorhanden | ❌ **Hard-FAIL** |

**Bei Hard-FAIL:** `TypeScript errors: <Anzahl>. Fix before sprint.` STOP.
Kein Auto-Fix. Maintainer behebt Fehler.

> Hinweis: Falls `node_modules` fehlt → `pnpm install` ausführen (einmalig).

---

### Check C — Vorheriger Sprint in Roadmap abgeschlossen

```powershell
# Prüfe ob der Vorgänger-Sprint als abgeschlossen markiert ist
Select-String "Sprint.*✅" docs/roadmap.md
```

Manuell prüfen: Ist der unmittelbar vorherige Sprint in `docs/roadmap.md`
mit ✅ oder "abgeschlossen" markiert?

| Kriterium | Ergebnis |
|---|---|
| Vorgänger-Sprint abgeschlossen | ✅ PASS |
| Vorgänger-Sprint noch offen | ❌ Soft-FAIL |

**Bei Soft-FAIL:** Maintainer entscheidet ob bewusste Parallelarbeit vorliegt.
Override mit: `GO trotz FAIL Check C: <Begründung>`

---

### Check D — CHANGELOG aktuell

```powershell
# Prüfe ob CHANGELOG.md einen Unreleased-Block hat
Select-String "## \[Unreleased\]" CHANGELOG.md
```

| Kriterium | Ergebnis |
|---|---|
| `## [Unreleased]`-Block vorhanden | ✅ PASS |
| Block fehlt oder leer | ❌ Soft-FAIL |

**Bei Soft-FAIL:** CHANGELOG vor Sprint-Start manuell ergänzen.
Forge-Regel `git-commits-and-changelog.mdc` schreibt vor: CHANGELOG wird
im **selben Commit** wie die Änderung aktualisiert — nie nachträglich.

---

## Hard-FAIL vs. Soft-FAIL — Übersicht

| Check | Typ | Auto-Fix |
|---|---|---|
| A Working Tree | **Hard** | nein — Maintainer |
| B TypeScript | **Hard** | nein — Maintainer |
| C Roadmap | Soft | nein — Maintainer übersteuert |
| D CHANGELOG | Soft | nein — Maintainer ergänzt |

---

## Output Format

### 4/4 PASS → Auto-Proceed

```
PRE-SLICE VALIDATION — Vysible v1.0.0
======================================

Sprint: <Sprint-Name>

Checks:
  [A] Working Tree:  PASS  clean
  [B] TypeScript:    PASS  0 errors
  [C] Roadmap:       PASS  Vorgaenger-Sprint abgeschlossen
  [D] CHANGELOG:     PASS  [Unreleased]-Block vorhanden

Result: 4/4 PASS

GO — Starting Sprint implementation.
```

### Hard-FAIL → STOP

```
PRE-SLICE VALIDATION — Vysible v1.0.0
======================================

Sprint: <Sprint-Name>

HARD-FAIL — STOP:
  [B] TypeScript errors: 3. Fix before sprint.

NO-GO. Sprint work blocked.
```

---

## Erweiterungsplan

| Check | Aktivierung |
|---|---|
| E Test-Count (Vitest) | Nach Sprint 2 (Tests eingeführt) |
| F ESLint | Nach ESLint-Konfiguration im Projekt |

---

## Changelog dieser Datei

| Version | Änderung |
|---|---|
| v1.0.0 | Initial — 4 Checks (A–D) für Vysible. Ersetzt Forge-interne Pre_Slice_Validation. |
