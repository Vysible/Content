---
trigger: always_on
description: "Policy for forge-web sync conflicts and deviation documentation. Forge-managed files with local modifications must be documented in docs/forge-web-deviations.md before merge."
---

# forge-web Sync Deviation Policy

## Zweck

Diese Regel definiert den Prozess für bewusste Abweichungen von forge-web-verwalteten
Regeln. Unerwartete Abweichungen (Conflicts) müssen dokumentiert und genehmigt werden.

## Conflict-Definition

Ein **Conflict** entsteht wenn:
1. Eine forge-managed Datei (mit `# forge-managed` Marker) lokale Änderungen hat
2. `forge-web sync` würde diese Änderungen überschreiben

## Pflicht-Prozess bei Conflicts

### Schritt 1: Erkennung

`forge-web sync` erkennt Conflicts automatisch:

```bash
forge-web sync --report-only  # zeigt Conflicts ohne zu schreiben
forge-web sync                 # schreibt docs/forge-web-deviations.md, Exit-Code 4
```

### Schritt 2: Dokumentation (Pflicht vor Merge)

`docs/forge-web-deviations.md` MUSS ausgefüllt sein:
- **Status:** `Accepted` (nach Maintainer-Review)
- **Begründung:** Technische Begründung warum Abweichung nötig ist

### Schritt 3: Genehmigung

- Abweichungen erfordern Review-Approval im PR
- `Status: Pending` Einträge → PR darf **nicht** gemergt werden

## Verbotene Patterns

```bash
# VERBOTEN — Überschreiben ohne Dokumentation (nur nach Status=Accepted erlaubt)
forge-web sync --force

# ERLAUBT — Force nach expliziter Dokumentation + Approval
forge-web sync --force  # NUR nach Status=Accepted in deviations.md
```

## CI-Enforcement

- forge-sync.yml: Exit-Code 4 = Conflicts detected → PR wird erstellt
- ratchet-check Job: prüft Maturity-Level-Rückschritt
