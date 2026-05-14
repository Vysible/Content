# Pre-Sprint Review (PSR) — Vysible

> **Zweck:** Fachliche Prüfung eines Sprint-Prompts **bevor** er an den Agent
> übergeben wird. Stellt sicher, dass Scope, Architekturkonformität,
> Compliance und Akzeptanzkriterien tragfähig sind.
>
> **Abgrenzung zu `Pre_Slice_Validation.md`:**
> - Pre_Slice_Validation = Agent-automatischer Gate-Check (Working Tree, TypeScript, Tests etc.)
> - Pre-Sprint Review = Read-only Analyse durch Maintainer + Cursor, **vor** Übergabe an den Agent.
>
> **Status:** v2.0.0

---

## Trigger-Phrase

Der Maintainer löst PSR explizit aus durch eine der folgenden Formulierungen
an Cursor:

```
PSR für <prompt-datei>
Mach PSR für <prompt-datei>
Pre-Sprint Review für <prompt-datei>
```

Beispiele:
- `PSR für docs/dev-prompts/sprint-p2a-editor-chat.md`
- `Mach PSR für sprint-3-pii-encryption.md`

Cursor liest dann diese Datei (`Pre_Sprint_Review.md`) komplett und arbeitet
die 8 Checks der Reihe nach ab.

---

## Idempotency Guarantee

Reine **Lese-Operationen**. Kein Schreibzugriff auf Code oder Docs.
Bericht wird in Cursor-Antwort ausgegeben (nicht persistiert) — Maintainer
entscheidet was übernommen wird.

---

## Pflicht-Quellen (vor Check-Start lesen)

| Quelle | Pfad | Verpflichtend wenn |
|---|---|---|
| Sprint-Prompt | `docs/dev-prompts/sprint-*.md` | immer |
| Roadmap | `docs/roadmap.md` | immer |
| Architektur | `docs/architecture.md` | immer |
| Entscheidungen | `docs/decisions.md` | immer |
| Konzept v6.0 | Konzeptdokument | wenn Prompt FA-*/NFA-*-IDs referenziert |
| Forge-Abweichungen | `docs/forge-web-deviations.md` | immer |
| Forge-Regeln | `.cursor/rules/schicht-*/*.mdc` | immer |
| Code-Stand | Repository | bei Check 6 (Code-Realität) |

---

## Check-Reihenfolge (verbindlich)

Die 8 Checks haben Abhängigkeiten. Diese Reihenfolge ist verbindlich:

```
1. Scope vs. Roadmap        → bevor irgendwas anderes geprüft wird
2. Abhängigkeitskette        → blockiert alles, wenn Vorgänger fehlt
3. Architekturkonformität (ADRs + architecture.md)
4. Forge-Regeln + offene Abweichungen
5. Anforderungs-IDs (FA-*, NFA-* aus Konzept v6.0)
6. Code-Realität              → muss vor 7 stehen, sonst falsche Acceptance-Bewertung
7. Acceptance-Qualität
8. Risiken (extern, Daten, Performance, Breaking Changes)
```

Aufwand wurde aus Check 7 ausgegliedert und ist nur noch Bestandteil
der Schluss-Empfehlung (Option-Bewertung).

---

## Die 8 PSR-Checks

### Check 1 — Scope vs. Roadmap

Stimmt der Sprint-Scope mit der Roadmap überein?

| Frage | Quelle |
|---|---|
| Ist der Sprint in `docs/roadmap.md` aufgeführt? | roadmap.md |
| Stimmt der dort genannte Aufwand mit dem Prompt-Aufwand überein (±50 %)? | roadmap.md |
| Sind Slices im Prompt enthalten, die laut Roadmap einer anderen Phase angehören? | roadmap.md |

### Check 2 — Abhängigkeitskette

Sind alle Vorgänger-Sprints fachlich abgeschlossen?

| Frage | Quelle |
|---|---|
| Vorgänger-Sprint in roadmap.md als ✅ markiert? | roadmap.md |
| Externe Pre-Conditions im Prompt dokumentiert UND erledigt? | Prompt + OpenActions.md |
| Daten-Migrationen aus Vorgänger-Sprints durchgeführt? | OpenActions.md |
| Werden andere offene Sprints durch diesen Sprint blockiert? | roadmap.md |

### Check 3 — Architekturkonformität (ADRs + architecture.md)

Verletzt der Sprint architektonische Entscheidungen?

| Frage | Quelle |
|---|---|
| Welche ADRs in `docs/decisions.md` sind betroffen? | decisions.md |
| Gibt es konkrete Verletzungen? | decisions.md |
| Modulgrenzen aus `docs/architecture.md` respektiert? | architecture.md |
| Falls Verletzung: Ist eine neue/geänderte ADR nötig **vor** dem Sprint? | decisions.md |

### Check 4 — Forge-Regeln + offene Abweichungen

Wird Forge-Compliance gewahrt?

| Frage | Quelle |
|---|---|
| Welche `.cursor/rules/schicht-*/*.mdc` sind einschlägig? | rules/ |
| Verschärft der Sprint eine offene Abweichung in `forge-web-deviations.md`? | deviations.md |
| Schließt der Sprint eine offene Abweichung — und ist die deviations.md entsprechend zu pflegen? | deviations.md |
| Sind alle relevanten Forge-Regeln im Prompt zitiert? | Prompt + rules/ |

### Check 5 — Anforderungs-IDs (FA-*, NFA-*)

Sind alle referenzierten Konzept-Anforderungen vollständig abgedeckt?

| Frage | Quelle |
|---|---|
| Welche FA-*/NFA-*-IDs referenziert der Prompt? | Prompt |
| Welche FA-*/NFA-*-IDs sind laut Konzept v6.0 für diese Slices Pflicht? | KI_Content_Plattform_Anforderungen_v6.0 |
| Sind alle Pflicht-Anforderungen im Prompt-Scope? | Prompt vs. Konzept |
| Werden NFA-Pflichten (Security, Logging, Resilience) explizit adressiert? | Prompt |

### Check 6 — Code-Realität (Drift-Check)

Stimmt der im Prompt beschriebene Ist-Stand mit dem Code überein?

| Frage | Tool |
|---|---|
| Existieren alle im Prompt erwähnten Dateipfade? | `Glob` |
| Existieren alle erwähnten Funktionen / Variablen? | `Grep` |
| Sind die im Prompt genannten Lücken (z.B. Zeilennummern, `catch {}`) noch im Code? | `Read` |
| Hat sich der Code seit Prompt-Erstellung verändert (Git-Log seit Prompt-Datum)? | `git log` |

### Check 7 — Acceptance-Qualität

Sind die Acceptance Checklist-Punkte fachlich vollständig und testbar?

| Frage | Quelle |
|---|---|
| Jeder Punkt automatisiert oder manuell prüfbar (kein „funktioniert irgendwie")? | Prompt |
| Wurden NFAs aus Check 5 in Acceptance gespiegelt? | Prompt vs. Konzept |
| Werden Forge-Compliance-Punkte (Logger, Resilience, no console.*) abgeprüft? | Prompt vs. Forge-Regeln |
| Gibt es Acceptance ohne erkennbare Implementierungs-Anweisung im Scope? | Prompt |

### Check 8 — Risiken

Welche Risiken werden im Prompt nicht adressiert?

| Risiko-Kategorie | Konkrete Frage |
|---|---|
| **Externe Services** | API-Stabilität, Rate Limits, Auth-Tokens? |
| **Daten-Migrationen** | Downtime nötig? Rollback-Plan? |
| **Breaking Changes** | Andere Sprints / aktive Branches betroffen? |
| **Performance** | DB-Last, AI-Token-Kosten, Bundle-Größe? |
| **Security** | Neue Surface (Routes, Env-Vars, PII)? |

---

## Bewertungs-Schema

### Pro Check

| Status | Bedeutung |
|---|---|
| **PASS** | Check vollständig erfüllt, keine Bemerkungen |
| **WARN** | Check mit Einschränkungen erfüllt, Hinweise vorhanden (nicht-blockierend) |
| **FAIL** | Check nicht erfüllt — blockiert Sprint-Start bis behoben |

### Gesamt-Schwelle (verbindlich)

| Konstellation | Result |
|---|---|
| 8/8 PASS | **GO** |
| ≥1 WARN, 0 FAIL | **GO-MIT-ANPASSUNGEN** — Mini-Anpassungen am Prompt, dann GO |
| ≥1 FAIL in Check 1, 2, 3, 4 oder 5 | **NO-GO** — Sprint blockiert |
| ≥1 FAIL in Check 6, 7 oder 8 | **NO-GO-LIGHT** — Prompt überarbeiten, dann erneutes PSR |
| Mehr als 3 WARN | **GO-MIT-ANPASSUNGEN** — Prompt vor Übergabe überarbeiten |

### Eskalation bei FAIL

| FAIL in Check | Eskalations-Pfad |
|---|---|
| 1 Scope | Roadmap-Anpassung oder Sprint streichen |
| 2 Abhängigkeit | Vorgänger-Sprint zuerst, dann erneutes PSR |
| 3 Architektur | ADR-Diskussion (neuer ADR-Entwurf erstellen) |
| 4 Forge-Regeln | Deviation-Eintrag in `forge-web-deviations.md` oder Prompt-Korrektur |
| 5 Anforderungs-IDs | Konzept v6.0 oder Prompt-Scope anpassen |
| 6 Code-Realität | Prompt aktualisieren (Drift bereinigen) |
| 7 Acceptance | Acceptance-Liste konkretisieren |
| 8 Risiken | Risiko-Mitigationen im Prompt ergänzen |

---

## Empfehlungs-Format (verbindlich)

Nach allen 8 Checks: **mindestens 2 Optionen** entwickeln, jede mit
Vor- und Nachteilen, dann eine begründete Empfehlung.

```
EMPFEHLUNGEN
────────────

Option A — <prägnanter Name>
  Beschreibung:  <2–3 Sätze>
  Aufwand:       <Tage>
  Vorteile:      - <…>
                 - <…>
  Nachteile:     - <…>
                 - <…>

Option B — <prägnanter Name>
  Beschreibung:  <2–3 Sätze>
  Aufwand:       <Tage>
  Vorteile:      - <…>
                 - <…>
  Nachteile:     - <…>
                 - <…>

[Option C, D bei Bedarf]

EMPFEHLUNG: Option <X>
  Begründung:    <warum diese Option, was der entscheidende Faktor ist>
  Risiko-Mitigation: <was zusätzlich beachten>
```

Wenn nur eine sinnvolle Option existiert: dies explizit feststellen mit
Begründung („Alternativen wurden geprüft: … verworfen weil …").

---

## Output-Format

```
PRE-SPRINT REVIEW — Vysible v2.0.0
===================================

Sprint:   <Sprint-Name>
Prompt:   <docs/dev-prompts/sprint-*.md>
Reviewer: Cursor (Anthropic Claude)
Datum:    <YYYY-MM-DD>

QUELLEN (gelesen):
  - docs/roadmap.md
  - docs/decisions.md
  - docs/architecture.md
  - docs/forge-web-deviations.md
  - <weitere>

CHECKS
──────
[1] Scope vs. Roadmap:       PASS|WARN|FAIL
    Geprüft:  <was>
    Befund:   <was gefunden>
    Beleg:    <Pfad:Zeile oder Zitat>

[2] Abhängigkeitskette:      PASS|WARN|FAIL
    …

[3] Architekturkonform.:     PASS|WARN|FAIL
    …

[4] Forge-Regeln:            PASS|WARN|FAIL
    …

[5] Anforderungs-IDs:        PASS|WARN|FAIL
    …

[6] Code-Realität:           PASS|WARN|FAIL
    …

[7] Acceptance-Qualität:     PASS|WARN|FAIL
    …

[8] Risiken:                 PASS|WARN|FAIL
    …

GESAMT: x/8 PASS · y WARN · z FAIL

────────────────────────────────────────────
EMPFEHLUNGEN
────────────────────────────────────────────

Option A — <…>
  Beschreibung:  <…>
  Aufwand:       <…>
  Vorteile:      <…>
  Nachteile:     <…>

Option B — <…>
  […]

EMPFEHLUNG: Option <X>
  Begründung:        <…>
  Risiko-Mitigation: <…>

────────────────────────────────────────────
RESULT
────────────────────────────────────────────

[GO]                    Sprint kann gestartet werden.
[GO-MIT-ANPASSUNGEN]    Nach <Liste der Mini-Anpassungen>.
[NO-GO]                 Blockiert wegen <Hard-Issues in Check 1–5>.
[NO-GO-LIGHT]           Prompt überarbeiten wegen <Check 6–8>.

NÄCHSTE SCHRITTE
  1. <konkret>
  2. <konkret>

Brücke zur Sprint-Implementierung:
  Bei GO → Agent ausführen, der startet automatisch mit Pre_Slice_Validation.
```

---

## Beispiele

### Beispiel 1 — GO-MIT-ANPASSUNGEN

```
PRE-SPRINT REVIEW — Vysible v2.0.0
===================================

Sprint:   P2-A (Editor + Chat & Versionen)
Prompt:   docs/dev-prompts/sprint-p2a-editor-chat.md

[1] Scope vs. Roadmap:       PASS  Phase-2-Backlog, Slice 6+8 zusammengefasst
[2] Abhängigkeitskette:      WARN  Phase-1-Restarbeiten in Prompt als Voraussetzung, noch nicht abgeschlossen
[3] Architekturkonform.:     PASS  Tiptap-Setup im Einklang mit architecture.md §UI
[4] Forge-Regeln:            PASS  resilience §3a + terminal-output korrekt zitiert
[5] Anforderungs-IDs:        PASS  FA-F-21..F-24 vollständig abgedeckt
[6] Code-Realität:           PASS  Code-Stand stimmt mit Prompt überein (4 Lücken bestätigt)
[7] Acceptance-Qualität:     PASS  14 Punkte testbar
[8] Risiken:                 WARN  SaveIndicator-Timing-Race nicht in Acceptance abgesichert

GESAMT: 6/8 PASS · 2 WARN · 0 FAIL

EMPFEHLUNGEN

Option A — Sprint sofort starten
  Aufwand:    2–3 Tage
  Vorteile:   schneller Start
  Nachteile:  Phase-1-Restarbeiten parallel = Merge-Risiko

Option B — Phase-1-Restarbeiten zuerst
  Aufwand:    +5–6 Tage
  Vorteile:   saubere Sequenz, ResultsTabs-Drift vermieden
  Nachteile:  längere Wartezeit

EMPFEHLUNG: Option B
  Begründung: ResultsTabs.tsx wird von beiden Sprints angefasst.
              Parallelarbeit erzeugt Merge-Konflikte.
  Risiko-Mitigation: SaveIndicator-Timing-Test in Acceptance ergänzen.

RESULT: GO-MIT-ANPASSUNGEN
  1. Phase-1-Restarbeiten zuerst durchführen.
  2. Prompt um SaveIndicator-Timing-Test in Acceptance ergänzen.
  3. Dann erneutes PSR oder direkt Sprint starten.
```

### Beispiel 2 — NO-GO

```
PRE-SPRINT REVIEW — Vysible v2.0.0
===================================

Sprint:   P3-A (WordPress-Connector)
Prompt:   docs/dev-prompts/sprint-p3a-wordpress.md

[1] Scope vs. Roadmap:       PASS
[2] Abhängigkeitskette:      FAIL  Sprint 27 (Kosten-Tracking) als Vorgänger laut Roadmap, nicht abgeschlossen
[3] Architekturkonform.:     PASS
[4] Forge-Regeln:            FAIL  Application-Password im Code statt AES-256 — `secrets-policy.mdc` verletzt
[5] Anforderungs-IDs:        WARN  FA-WP-03 nicht im Prompt referenziert
[6] Code-Realität:           PASS
[7] Acceptance-Qualität:     WARN  Gutenberg-Block-Test fehlt
[8] Risiken:                 PASS

GESAMT: 5/8 PASS · 2 WARN · 2 FAIL

RESULT: NO-GO
  FAIL in Check 2 → Sprint 27 (Kosten-Tracking) zuerst.
  FAIL in Check 4 → Prompt überarbeiten: Application-Password über lib/crypto/aes.ts.
```

---

## Wiederverwendbarkeit

PSR kann beliebig oft auf denselben Prompt angewendet werden (vor und
nach Anpassungen). Der Bericht enthält das Datum — Maintainer entscheidet,
ob ein neuer PSR-Lauf nötig ist nach:
- Code-Änderungen am betroffenen Bereich (Check 6 könnte drift'en)
- Roadmap-Updates (Check 1, 2)
- Neuen ADRs in `decisions.md` (Check 3)

---

## Brücke zur Sprint-Implementierung

Bei **GO** oder **GO-MIT-ANPASSUNGEN** (nach Erledigung der Anpassungen)
folgt direkt die Sprint-Implementierung. Der Agent startet automatisch
mit der `Pre_Slice_Validation.md` (5 Hard/Soft-Checks).

PSR und Pre_Slice_Validation **ergänzen sich**:
- PSR = fachliche Prüfung (vor Agent-Start, durch Maintainer + Cursor)
- Pre_Slice_Validation = technische Prüfung (am Agent-Start, durch Agent)

---

## Changelog dieser Datei

| Version | Änderung |
|---|---|
| v1.0.0 | Initial — 7 PSR-Checks + Output-Format + Beispiel |
| v2.0.0 | Trigger-Phrase, 8 Checks (Forge-Compliance + Anforderungs-IDs separat), verbindliche Reihenfolge, scharfe GO/NO-GO-Schwellen, Eskalations-Tabelle, Mindest-Optionen-Regel, NO-GO-Beispiel, Brücke zu Pre_Slice_Validation |
