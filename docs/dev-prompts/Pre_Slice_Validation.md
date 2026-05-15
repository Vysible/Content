# Pre-Slice Validation — Vysible

> **Zweck:** Zweistufiger Gate-Check vor jedem Sprint/Slice-Start.
> Stellt sicher, dass sowohl der Sprint-Prompt **fachlich tragfähig** ist
> (Phase 0 – PSR) als auch der **technische Ausgangszustand** sauber ist
> (Phase 1 – Pre-Slice).
>
> **Geltungsbereich:** Alle Sprints in `docs/roadmap.md`. Ersetzt die Forge-interne
> `Pre_Slice_Validation.md` (Forge-intern = nicht für Konsumenten-Projekte gedacht).
>
> **Status:** v1.4.0

---

## CRITICAL: Wann ausführen

**Vor jedem Sprint-Start** — bevor der erste Tool-Call zur Implementierung erfolgt.

Der Agent liest diese Datei vollständig und führt **Phase 0** und **Phase 1** der Reihe nach aus.

| Phase | Was | Aktion |
|---|---|---|
| **0** | Pre-Sprint Review (PSR) | Agent liest `Pre_Sprint_Review.md`, führt 8 Checks aus, gibt Bericht aus |
| **1** | Technische Gates | Agent führt 5 Checks (A–E) aus |
| **2** | Sprint starten | Erst nach beidseitiger Freigabe |

Bei FAIL in einer der beiden Phasen: STOP. Warte auf Maintainer.

---

## Idempotency Guarantee

Alle Checks sind ausschließlich **Lese-Operationen**. Keine Commits,
keine Datei-Schreiboperationen im Repo. Mehrfaches Ausführen ist gefahrlos.

---

# Phase 0 — Pre-Sprint Review (PSR)

> **Neu seit v1.2.0:** PSR wird vom Agent **automatisch** zu Beginn der
> Pre_Slice_Validation aufgerufen. Vorher musste der Maintainer ihn manuell
> triggern. Manueller Aufruf bleibt weiterhin möglich (siehe `Pre_Sprint_Review.md`).

### Ablauf

1. Agent liest **`docs/dev-prompts/Pre_Sprint_Review.md`** vollständig.
2. Agent identifiziert den aktuellen Sprint-Prompt aus dem Kontext.
3. Agent führt die **8 PSR-Checks** in der vorgegebenen Reihenfolge aus.
4. Agent gibt den vollständigen PSR-Bericht in seiner Antwort aus.
5. Auswertung nach folgender Tabelle:

### Entscheidungs-Tabelle Phase 0

| PSR-Result | Aktion |
|---|---|
| **GO** (8/8 PASS, 0 WARN, 0 FAIL) | Auto-proceed zu Phase 1 |
| **GO-MIT-ANPASSUNGEN** (≥1 WARN, 0 FAIL, ≤3 WARN gesamt) | STOP – warte auf Maintainer-Override: `GO trotz WARN: <Begründung>` |
| **GO-MIT-ANPASSUNGEN** (>3 WARN) | STOP – Maintainer muss Prompt überarbeiten |
| **NO-GO** (FAIL in Check 1, 2, 3, 4 oder 5) | Hard-STOP – Maintainer-Eingriff zwingend |
| **NO-GO-LIGHT** (FAIL nur in Check 6, 7 oder 8) | Hard-STOP – Prompt überarbeiten, dann erneuter Lauf |

### Override-Syntax (Variante B – pragmatisch)

Wenn Maintainer einen WARN-Fall akzeptieren will:

```
GO trotz WARN: <einzeilige Begründung>
```

Beispiel:
```
GO trotz WARN: Phase-1-Restarbeiten parallel akzeptiert,
ResultsTabs.tsx-Konflikt manuell mitigiert.
```

Bei FAIL ist **kein** Override möglich – nur Prompt-Anpassung oder Vorgänger-Sprint
abschließen.

### Phase 0 PASS → weiter zu Phase 1

Nur wenn Phase 0 endet mit `GO` (oder `GO` nach Maintainer-Override),
beginnt Phase 1.

---

# Phase 1 — Technische Gate-Checks (A–E)

## Die 5 Checks

### Check A — Working Tree sauber (mit Whitelist)

```powershell
git status --porcelain
```

**Whitelist (kein FAIL):** Dirty Files unter folgenden Pfaden gelten als
**unschädlich** und werden im Bericht erwähnt, lösen aber kein STOP aus:

| Pfad | Begründung |
|---|---|
| `docs/dev-prompts/` | Sprint-Prompts, Archiv-Verschiebungen, PSR-Berichte |
| `docs/forge-migration-audit.md` | Audit-Notizen während aktiver Migration |
| `docs/ERROR-Log.md` | Laufende Fehlernotizen |
| `AGENTS.md` | Projekt-Meta-Datei, wird laufend aktualisiert |
| `CHANGELOG.md` | Wird im selben Commit wie Code-Änderungen mitgenommen |
| `README.md` | Dokumentations-Datei |
| `docs/roadmap.md` | Sprint-Fortschritt, wird nach jedem Sprint aktualisiert |

**Auswertung:**

```powershell
$dirty = git status --porcelain
$nonWhitelisted = $dirty | Where-Object {
  $_ -notmatch "docs/dev-prompts/" -and
  $_ -notmatch "docs/forge-migration-audit\.md" -and
  $_ -notmatch "docs/ERROR-Log\.md" -and
  $_ -notmatch "AGENTS\.md" -and
  $_ -notmatch "CHANGELOG\.md" -and
  $_ -notmatch "README\.md" -and
  $_ -notmatch "docs/roadmap\.md"
}
```

| Kriterium | Ergebnis |
|---|---|
| `$dirty` leer | ✅ PASS clean |
| `$nonWhitelisted` leer (nur Whitelist-Pfade dirty) | ✅ PASS-mit-Hinweis |
| `$nonWhitelisted` nicht leer | ❌ **Hard-FAIL** |

**Bei Hard-FAIL:** `Working tree dirty. Non-whitelisted files: <Liste>. Commit or stash before sprint.`
Kein Auto-Fix. STOP. Maintainer muss bereinigen.

**Bei PASS-mit-Hinweis:** Whitelist-Pfade im Bericht auflisten, nicht blockieren.

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
Select-String "Sprint.*✅" docs/roadmap.md
```

| Kriterium | Ergebnis |
|---|---|
| Vorgänger-Sprint abgeschlossen | ✅ PASS |
| Vorgänger-Sprint noch offen | ❌ Soft-FAIL |

> **Hinweis:** Dies ist eine schnelle formale Validierung der ✅-Markierung.
> Die fachliche Tiefe der Abhängigkeits-Prüfung erfolgte zuvor in PSR Check 2.

**Bei Soft-FAIL:** Maintainer entscheidet ob bewusste Parallelarbeit vorliegt.
Override mit: `GO trotz FAIL Check C: <Begründung>`

---

### Check D — CHANGELOG aktuell

```powershell
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

### Check E — Tests grün (ab Sprint 2 aktiv)

```powershell
pnpm test --run
```

| Kriterium | Ergebnis |
|---|---|
| 0 failing tests | ✅ PASS |
| Tests fehlgeschlagen | ❌ **Hard-FAIL** |

**Bei Hard-FAIL:** `Test failures: <Anzahl>. Fix before sprint.` STOP.
Kein Auto-Fix. Maintainer behebt Fehler.

---

## Hard-FAIL vs. Soft-FAIL — Übersicht

| Check | Typ | Auto-Fix |
|---|---|---|
| Phase 0 — PSR Check 1–5 FAIL | **Hard** | nein — Maintainer |
| Phase 0 — PSR Check 6–8 FAIL | **Hard** | nein — Prompt überarbeiten |
| Phase 0 — WARN | **Soft** | Override via `GO trotz WARN: …` |
| A Working Tree (außerhalb Whitelist) | **Hard** | nein — Maintainer |
| A Working Tree (Whitelist) | — | passt durch |
| B TypeScript | **Hard** | nein — Maintainer |
| C Roadmap | Soft | nein — Maintainer übersteuert |
| D CHANGELOG | Soft | nein — Maintainer ergänzt |
| E Tests | **Hard** | nein — Maintainer |

---

## Output Format

### Vollständiger PASS-Lauf

```
PRE-SLICE VALIDATION — Vysible v1.2.0
======================================

Sprint: <Sprint-Name>

PHASE 0 — Pre-Sprint Review
─────────────────────────────
[1] Scope vs. Roadmap:       PASS
[2] Abhängigkeitskette:      PASS
[3] Architekturkonform.:     PASS
[4] Forge-Regeln:            PASS
[5] Anforderungs-IDs:        PASS
[6] Code-Realität:           PASS
[7] Acceptance-Qualität:     PASS
[8] Risiken:                 PASS

Phase 0 Result: 8/8 PASS · GO

PHASE 1 — Technische Gates
────────────────────────────
  [A] Working Tree:  PASS  clean
  [B] TypeScript:    PASS  0 errors
  [C] Roadmap:       PASS  Vorgaenger-Sprint abgeschlossen
  [D] CHANGELOG:     PASS  [Unreleased]-Block vorhanden
  [E] Tests:         PASS  0 failures

Phase 1 Result: 5/5 PASS

GESAMT: GO — Starting Sprint implementation.
```

### Working Tree mit Whitelist

```
PHASE 1 — Technische Gates
────────────────────────────
  [A] Working Tree:  PASS-mit-Hinweis
      Whitelist-Pfade dirty (akzeptiert):
        - docs/dev-prompts/sprint-p2a-editor-chat.md
        - docs/dev-prompts/Archiv/old-sprint.md
  [B] TypeScript:    PASS  0 errors
  …
```

### Phase 0 STOP (WARN ohne FAIL)

```
PRE-SLICE VALIDATION — Vysible v1.2.0
======================================

Sprint: <Sprint-Name>

PHASE 0 — Pre-Sprint Review
─────────────────────────────
[2] Abhängigkeitskette:      WARN  Phase-1-Restarbeiten noch nicht abgeschlossen
[8] Risiken:                 WARN  SaveIndicator-Timing-Race nicht abgesichert

Phase 0 Result: 6/8 PASS · 2 WARN · GO-MIT-ANPASSUNGEN

⏸ STOP — Maintainer-Override benötigt:
  Antwort-Format: "GO trotz WARN: <Begründung>"
  Oder: Prompt anpassen, dann erneut starten.
```

### Phase 0 STOP (FAIL — kein Override möglich)

```
PHASE 0 — Pre-Sprint Review
─────────────────────────────
[2] Abhängigkeitskette:      FAIL  Sprint 27 noch nicht abgeschlossen
[4] Forge-Regeln:            FAIL  Application-Password im Code statt AES-256

Phase 0 Result: 6/8 PASS · 0 WARN · 2 FAIL · NO-GO

⛔ HARD-STOP — Sprint blockiert.
  Kein Override moeglich. Maintainer-Eingriff zwingend.
```

### Phase 1 Hard-FAIL → STOP

```
PHASE 1 — Technische Gates
────────────────────────────
  [B] TypeScript:    FAIL  3 errors

⛔ HARD-FAIL — Sprint work blocked.
  Fix TypeScript errors before sprint.
```

---

## Erweiterungsplan

| Check | Aktivierung |
|---|---|
| ~~E Test-Count (Vitest)~~ | ✅ **Aktiv seit Sprint 2 (2026-05-14)** |
| F ESLint | Nach ESLint-Konfiguration im Projekt |

---

## Verwandte Dokumente

| Datei | Wann |
|---|---|
| `Pre_Sprint_Review.md` | Wird von **Phase 0** dieser Datei automatisch aufgerufen — fachliche Sprint-Prompt-Prüfung. |
| **`Sprint_Closeout.md`** | **Nach** der Sprint-Implementierung, **vor** dem Commit-Vorschlag — verbindlicher 4-Schritt-Abschluss (Roadmap, OpenActions, Prompt-Archivierung, CHANGELOG). |

Der Agent ist verpflichtet, am Ende eines Sprints `Sprint_Closeout.md` aufzurufen,
**bevor** er einen Commit-Vorschlag formuliert. Hintergrund: In Sprint P2-C
(2026-05-15) wurde die Prompt-Archivierung übersehen; `Sprint_Closeout.md`
schließt diese Lücke prozessual.

---

## Changelog dieser Datei

| Version | Änderung |
|---|---|
| v1.0.0 | Initial — 4 Checks (A–D) für Vysible. Ersetzt Forge-interne Pre_Slice_Validation. |
| v1.1.0 | Check E (Vitest) aktiviert — Sprint 2 abgeschlossen (2026-05-14). |
| v1.2.0 | Phase 0 (PSR) als Auto-Aufruf integriert. Whitelist für `docs/dev-prompts/`, `docs/forge-migration-audit.md`, `docs/ERROR-Log.md` in Check A. Override-Syntax `GO trotz WARN: ...` für Phase-0-WARN-Fälle. |
| v1.3.0 | Verweis auf `Sprint_Closeout.md` ergänzt — Closeout-Schritte sind ab sofort verbindlich vor jedem Commit-Vorschlag auszuführen (Reaktion auf den fehlenden Archivierungs-Schritt in Sprint P2-C). |
| v1.4.0 | Check-A-Whitelist um `AGENTS.md`, `CHANGELOG.md`, `README.md`, `docs/roadmap.md` erweitert — persistente Docs-Dateien sollen Sprint-Starts nicht blockieren. |
