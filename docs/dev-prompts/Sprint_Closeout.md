# Sprint Closeout — Vysible

> **Zweck:** Verbindlicher Abschluss-Workflow nach jedem Sprint/Slice.
> Stellt sicher, dass nach einer erfolgreichen Implementierung die
> **Dokumentations- und Archivierungsschritte** zwingend ausgeführt werden —
> bevor ein Sprint als "abgeschlossen" gilt.
>
> **Geltungsbereich:** Alle Sprints in `docs/roadmap.md`.
> Ergänzt `Pre_Slice_Validation.md` (Sprint-Start) um einen verbindlichen
> Sprint-Ende-Schritt.
>
> **Status:** v1.0.0 (2026-05-15)

---

## CRITICAL: Wann ausführen

**Nach grünen Validierungs-Checks** (TypeScript, Tests, Lints) und
**bevor** der erste Implementierungs-Commit vorgeschlagen oder ausgeführt wird.

Reihenfolge im Sprint-Lebenszyklus:

```
Pre_Slice_Validation.md (Sprint-Start)
        ↓
Implementierung (Sub-Slices)
        ↓
Abschluss-Validation (tsc, tests, lints)
        ↓
─── Sprint_Closeout.md (DIESE DATEI) ───   ← darf NICHT übersprungen werden
        ↓
Commit (Implementierung + Closeout in einem konsistenten Commit)
        ↓
Push
```

---

## Hintergrund: Warum diese Datei existiert

In Sprint **P2-C (Slice 19, E-Mail)** wurde die Implementierung sauber
ausgeführt, der Abschluss-Schritt aus dem Sprint-Prompt
(`Move-Item docs/dev-prompts/sprint-p2c-email.md docs/dev-prompts/archive/`)
jedoch übersehen. Der Agent sprang nach grünen Tests direkt in den
Commit-Vorschlag — ohne vorher Roadmap, OpenActions und Prompt-Archivierung
zu konsolidieren.

Diese Datei macht den Closeout zu einem **expliziten, prüfbaren Schritt**
mit eigenem Output-Format, damit das Risiko nicht mehr in der Disziplin
des Einzel-Agents liegt.

---

## Die 4 Pflicht-Schritte

Alle vier Schritte sind **MUSS**. Ein Sprint gilt erst dann als abgeschlossen,
wenn alle vier Schritte sichtbar im Closeout-Bericht abgehakt sind.

### Schritt 1 — Roadmap aktualisieren

`docs/roadmap.md`: Den Slice/Sprint-Eintrag von "⚠️ Teilweise" / "⚠️ Stub" /
"Offen" auf "✅ Abgeschlossen" setzen. Format:

```
| Slice <N> | <Name> | ✅ Abgeschlossen (YYYY-MM-DD, Sprint <ID>) |
```

Wenn die Phasen-Übersicht ein Prozent-Tracking führt (z.B. "Phase 2 ~45 %"),
ist die Zahl ebenfalls nachzuführen.

### Schritt 2 — OpenActions bereinigen

`docs/dev-prompts/OpenActions.md`:

- **Nachlaufblock zum gerade abgeschlossenen Sprint löschen**, falls ein solcher
  Block beim Sprint-Start angelegt wurde (z.B. "Sprint P2-C — Nachlauf aus PSR").
- **Tatsächlich offen gebliebene Punkte** (Pre-Conditions, die nicht erfüllt
  werden konnten, oder bewusste Scope-Cuts) bleiben erhalten, aber werden in
  einen sprintübergreifenden Abschnitt einsortiert
  (`Sprint 0`, `Sprint 3`, `Backlog / Tech-Debt`).

### Schritt 3 — Sprint-Prompt archivieren

```powershell
Move-Item docs/dev-prompts/sprint-<id>.md docs/dev-prompts/archive/
```

Falls die Archivierung über einen Editor erfolgt (Delete + Add), gilt sie
nur als ausgeführt, wenn `git status` einen `R`-Eintrag (Rename) für die
Datei zeigt.

**Prüfung:**

```powershell
Test-Path docs/dev-prompts/sprint-<id>.md          # → False
Test-Path docs/dev-prompts/archive/sprint-<id>.md  # → True
```

### Schritt 4 — CHANGELOG-Closeout-Eintrag

`CHANGELOG.md` unter `## [Unreleased]` ergänzen — zusätzlich zu den
Feature-/Fix-Einträgen aus der Implementierung:

```markdown
### Added (oder Changed)
- `docs/dev-prompts/archive/sprint-<id>.md`: Sprint-Prompt <ID> nach
  Abschluss archiviert; aktive Datei aus `docs/dev-prompts/` entfernt.
- `docs/roadmap.md`: Slice <N> im Phase-X-Backlog auf
  "✅ Abgeschlossen (YYYY-MM-DD, Sprint <ID>)" gesetzt.
- `docs/dev-prompts/OpenActions.md`: <Nachlaufblock entfernt / Punkt X
  ergänzt> (je nach tatsächlichem Diff).
```

Forge-Regel `git-commits-and-changelog.mdc` gilt unverändert: CHANGELOG
wird **im selben Commit** wie der Closeout aktualisiert — nicht in einem
Folge-Commit.

---

## Output Format

Der Agent gibt am Ende der Abschluss-Phase, **bevor** der Commit-Vorschlag
formuliert wird, folgenden Block aus:

```
SPRINT CLOSEOUT — Vysible v1.0.0
==================================

Sprint: <Sprint-ID — Sprint-Name>

[1] Roadmap aktualisiert:      PASS  Slice <N>: "✅ Abgeschlossen (YYYY-MM-DD, Sprint <ID>)"
[2] OpenActions bereinigt:     PASS  Nachlaufblock entfernt / Restpunkte in Backlog verschoben
[3] Prompt archiviert:         PASS  docs/dev-prompts/archive/sprint-<id>.md (Rename in git status)
[4] CHANGELOG Closeout-Eintrag: PASS  Added/Changed-Bullets ergänzt

Closeout Result: 4/4 PASS · GO
▶ Commit-Vorschlag folgt jetzt.
```

Bei FAIL in einem Schritt:

```
[3] Prompt archiviert:         FAIL  Datei liegt noch unter docs/dev-prompts/

⛔ HARD-STOP — Closeout unvollständig.
   Commit darf nicht erstellt werden. Fehlende Schritte zuerst ausführen.
```

---

## Optional: Closeout als eigener Commit

In den Sprint-Lebenszyklen P2-A und P2-B wurde der Closeout (Roadmap +
CHANGELOG + Prompt-Archiv) als **separater Closeout-Commit** geliefert,
z.B. `chore(sprint): P2-B Closeout -- Roadmap + CHANGELOG + Prompt archiviert`.

Beide Varianten sind zulässig:

| Variante | Wann | Vorteil |
|---|---|---|
| **A: 1 Commit (Implementierung + Closeout zusammen)** | Sprints mit überschaubarem Diff | Atomarer Sprint-Eintrag in der Historie |
| **B: 2 Commits (Implementierung, dann Closeout)** | Große Sprints mit umfangreichem Code-Diff | Closeout-Diff ist isoliert reviewbar |

Wichtig in beiden Fällen: Der Closeout-Bericht oben muss **vor** dem ersten
Commit-Vorschlag ausgegeben werden, damit der Maintainer ihn prüfen kann.

---

## Anti-Patterns

| Anti-Pattern | Warum es schiefgeht |
|---|---|
| Closeout "wird nachgereicht" in einem späteren PR | Sprint-Status driftet zwischen Roadmap und Realität — exakt der Fehler aus P2-C. |
| Roadmap-Update ohne Datum / Sprint-ID | Spätere Rückverfolgung wird unmöglich. |
| Prompt nur gelöscht, nicht nach `archive/` verschoben | Verlust der Sprint-Historie. |
| OpenActions-Nachlaufblock bleibt nach Sprint-Ende stehen | Backlog "wächst" um bereits erledigte Punkte. |
| Closeout-Schritte einzeln zwischen mehreren Commits verteilt | Bricht Atomarität, erschwert Revert. |

---

## Changelog dieser Datei

| Version | Änderung |
|---|---|
| v1.0.0 | Initial — als Reaktion auf den fehlenden Archivierungs-Schritt in Sprint P2-C (2026-05-15) eingeführt. Vier Pflicht-Schritte, Output-Format, Commit-Varianten. |
