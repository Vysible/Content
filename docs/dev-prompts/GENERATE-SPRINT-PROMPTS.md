# Meta-Prompt: Sprint-Slice-Prompts generieren

> **Zweck:** Anleitung für einen KI-Agenten (oder Entwickler), wie aus dem Projektzustand  
> neue Sprint-Prompts im Vysible-Format erzeugt werden.  
> **Ablage:** `docs/dev-prompts/` — neben den generierten Prompts selbst.  
> **Version:** 1.0 (Mai 2026)

---

## Kontext: Was sind Slice-Prompts?

Vysible-Sprint-Prompts sind Markdown-Dateien, die einen Cursor-Agenten vollständig  
instruieren, einen abgegrenzten Feature-Slice zu implementieren. Jeder Prompt:

- gibt dem Agenten **alle notwendigen Informationen** ohne Rückfragen
- enthält eine **Exploration-Phase** (lesen vor schreiben)
- unterteilt Arbeit in **Sub-Slices** mit je eigenem Commit und Acceptance-Checklist
- schließt mit einem **Abschlussbericht-Template** (vom Agent auszufüllen)

---

## Schritt 1 — Pflicht-Eingabedateien lesen

Vor der Prompt-Generierung diese Dateien vollständig lesen:

```powershell
# Implementierungsplan + Slice-Katalog + Prompt-Format-Vorlage
Get-Content docs/dev-prompts/plan-v6.1.md

# Aktueller Implementierungsstand + Sprint-Reihenfolge
Get-Content docs/roadmap.md

# Architekturentscheidungen (ADRs) — verbindlich für alle Prompts
Get-Content docs/decisions.md

# Forge-Abweichungen — offene stille Catches, bekannte Lücken
Get-Content docs/forge-web-deviations.md

# Offene Punkte aus laufendem Sprint — Pre-Conditions für nächste Prompts
Get-Content docs/dev-prompts/OpenActions.md

# Letzter generierter Sprint-Prompt als Stil-Referenz
Get-Content docs/dev-prompts/sprint-p3g-templates-klon.md   # oder aktuellsten
```

---

## Schritt 2 — Reihenfolge bestimmen

### Sequenz ableiten

Die verbindliche Implementierungsreihenfolge steht in `docs/roadmap.md` und  
`docs/dev-prompts/plan-v6.1.md` → Sektion "Implementierungsreihenfolge":

```
Phase 3: Slice 27 → 20 → 21 → 22 → 23 → 24 → 25 → 26
Phase 4: Slice 14 → 15 → NFA-Härtung → Performance
```

### Nächste Slice-ID ermitteln

```powershell
# Letzten abgeschlossenen Sprint aus Roadmap ablesen
Select-String "✅ Abgeschlossen" docs/roadmap.md | Select-Object -Last 5

# Noch nicht abgeschlossene Phase-3-Slices
Select-String "⚠️ Stub|Fehlend|⬜" docs/roadmap.md | Select-Object -First 10
```

### Abhängigkeitskette prüfen

Jeder neue Prompt setzt den vorherigen als `✅` voraus. Check:
1. Hat der Vorgänger-Sprint eine Abschlussbericht-Sektion?
2. Verweist der Vorgänger-Abschluss auf den neuen Sprint als "Nächste Priorität"?
3. Gibt es externe Blockers (Meta-Verifizierung, API-Vorab-Validierung)?

---

## Schritt 3 — Slice-Details aus plan-v6.1.md extrahieren

Für jede zu generierende Slice-ID:

```powershell
# Slice-Details lesen (z.B. Slice 26)
Select-String "Slice 26" docs/dev-prompts/plan-v6.1.md -A 60
```

Aus dem plan.md-Slice-Eintrag extrahieren:

| Element | Verwendung im Prompt |
|---|---|
| `GOAL` | → Erster Satz + Ziel-Beschreibung im Header |
| `FILES TO CREATE/CHANGE` | → IN-Liste der Sub-Slices |
| `REQUIREMENTS` | → Sub-Slice-Implementierungs-Details |
| `ACCEPTANCE CHECKLIST` | → Acceptance-Checklist jedes Sub-Slices |
| `STOP CONDITIONS` | → Scope-Grenzen-Tabelle |

---

## Schritt 4 — Forge-Abweichungen einarbeiten

```powershell
# Offene Lücken aus deviations.md für den betreffenden Slice
Select-String "Slice [NR]|[Dateiname]" docs/forge-web-deviations.md
```

Wenn eine Datei im neuen Slice betroffen ist, die einen stillen Catch hat:  
→ In der Self-review-Checklist explizit erwähnen  
→ In der Exploration-Phase nach dem Catch suchen  
→ Im Abschluss-Bericht: `deviations.md`-Eintrag als geschlossen markieren

---

## Schritt 5 — Prompt nach diesem Format generieren

```markdown
# Sprint [ID] — [Slice-Name] (Slice [Nr])

**Projekt:** Vysible
**Sprint:** [ID]
**Format:** Tier [1|2|3]
**Abhängigkeit:** Sprint [Vorgänger] ✅[, weitere falls nötig]
**Anforderungen:** plan.md Slice [Nr][, FA-Refs falls bekannt]
**Geschätzte Dauer:** ~[X] [Stunden|Tag|Tage]

> [Pre-Condition-Block wenn externe Voraussetzungen nötig sind]

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

[5 Standard-Checks: A=git, B=tsc, C=Roadmap, D=CHANGELOG, E=Tests]

---

## CRITICAL: Exploration zuerst

[powershell-Befehle: bestehende Stubs, Schema-Stand, relevante Imports,
 offene Catches — alles was der Agent vor dem ersten Edit wissen muss]

**Bekannte Lücken (Stand [Datum], aus Roadmap + plan.md):**
[Tabelle: Datei | Lücke | Priorität]

---

## CRITICAL: Self-review Checklist

[8–12 Checkboxen: Sicherheit, Resilience, Code-Qualität, TypeScript, Tests, CHANGELOG]

---

## Sub-Slice A — [Name]

**Aufwand:** ~[N] Stunden
**Scope:** [Ein Satz was dieser Sub-Slice liefert]

### IN / OUT [Dateien]
### [Code-Patterns, Typedefinitionen, API-Signaturen]
### Acceptance Checklist
### Commit-Message

---

## Sub-Slice B — [Name]
[analog zu A]

---

## Abschluss-Validation (nach allen Sub-Slices)

[powershell-Befehle zum abschliessenden Prüfen]

---

## Scope-Grenzen (was NICHT in diesem Sprint)

[Tabelle: Feature | Warum nicht jetzt]

---

## Abschlussbericht (vom Agent auszufüllen)

\`\`\`
SPRINT [ID] ABSCHLUSSBERICHT
...
[OK] [ID] ABGESCHLOSSEN
▶ Nächste Priorität: Sprint [ID+1] ([Name] — Slice [Nr])
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/[dateiname].md docs/dev-prompts/archive/
\`\`\`
```

---

## Format-Regeln (verbindlich für alle generierten Prompts)

### Tier-Klassifikation

| Tier | Verwendung | Exploration-Umfang |
|---|---|---|
| **1** | Lücken präzise bekannt (Roadmap-Eintrag detailliert) | Mittel — Ist-Stand bestätigen |
| **2** | Stub vorhanden, Umfang unklar | Umfangreich — Stub vollständig lesen |
| **3** | Exploration dominiert, Anforderungen noch vage | Sehr umfangreich — mehrere Dateien |

### Pre-Slice-Validation-Checks (immer identisch)

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap: Vorgänger [ID] abgeschlossen?
Select-String "[Vorgänger-ID].*✅|Sprint [Vorgänger-ID].*✅" docs/roadmap.md -i

# Check D — CHANGELOG
Select-String "\[Unreleased\]" CHANGELOG.md

# Check E — Tests
pnpm test --run
```

### Exploration-Pflichtblöcke

Für jeden Prompt **mindestens** diese Exploration-Abfragen:

```powershell
# 1. Bestehende Stubs/Dateien lesen
Get-ChildItem lib/[modul] -Recurse -Name -ErrorAction SilentlyContinue
Get-Content lib/[modul]/client.ts -ErrorAction SilentlyContinue

# 2. Prisma-Schema: relevante Modelle
Select-String "model [Modell]" prisma/schema.prisma -A 15

# 3. Bestehende API-Routen
Get-ChildItem app/api/[modul] -Recurse -Name -ErrorAction SilentlyContinue

# 4. Forge-Abweichungen (stille Catches)
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" lib/[modul] -Recurse

# 5. Abhängigkeiten (wie wird dieses Modul von anderen genutzt?)
Select-String "[modulname]" lib,app -Recurse -i | Select-Object Path, LineNumber, Line | Select-Object -First 10
```

### Sub-Slice-Aufteilung

| Sub-Slice | Faustregel |
|---|---|
| **A** | Server-seitige Logik: Client, Formatter, Service, API-Route, Prisma-Schema |
| **B** | Client-seitige UI: Komponente, Status-Tracking, Button, Dashboard-Integration |
| **C** | Nur bei komplexen Slices: Cron-Jobs, Reports, Test-Erweiterungen |

### Resilience-Pflichtmuster (in jedem Prompt einfordern)

```typescript
// withRetry auf alle externen HTTP-Calls (Forge-Regel resilience §3c)
return withRetry(async () => { /* fetch(...) */ }, 'modul.operation');

// Kein stiller Catch (Forge-Regel resilience §3a)
// Server-Code:
.catch((err: unknown) => { logger.warn({ err }, '[Vysible] ...') })
// Client-Code:
.catch((err: unknown) => { console.warn('[Vysible] ...', err) })

// AES-256 für alle Credentials (ADR-003)
const value = decrypt(apiKey.encryptedKey);
// → niemals encryptedKey in Response
```

### Sicherheits-Pflichtmuster

```typescript
// 1. Kein Klartext-Credential in Response
// Statt: { encryptedPassword: "..." }
// Immer: { hasCredentials: true }

// 2. Auth-Check in jeder API-Route
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// 3. Mandantentrennung (ADR-002)
// Zugriff auf Ressource immer mit createdById: session.user.id filtern
```

### Commit-Message-Format

```
feat([modul]): [was] + [was] ([Slice Nr] Sub-[A/B])
fix([modul]): [was] ([Slice Nr])
```

---

## Schritt 6 — Dateiname + Ablage

```
docs/dev-prompts/sprint-[phase-id]-[slug].md

Beispiele:
  sprint-p2d-dataseo.md
  sprint-p3a-kosten-tracking.md
  sprint-p3e-klicktipp.md
```

**Naming-Schema:**
- `p2` = Phase 2, `p3` = Phase 3
- Fortlaufende Buchstaben (a, b, c, ...) pro Phase
- Slug: kurzer Modul-Name, kebab-case, keine Slice-Nummer (liest sich besser)

---

## Schritt 7 — Qualitätsprüfung vor Abgabe

Der generierende Agent prüft jeden Prompt gegen diese Checkliste:

| Check | Frage |
|---|---|
| Abhängigkeit | Ist der Vorgänger-Sprint korrekt referenziert? |
| Plan-Abdeckung | Sind alle `plan.md`-Requirements im Prompt adressiert? |
| Stop-Conditions | Stehen alle plan.md-Stop-Conditions in der Scope-Grenzen-Tabelle? |
| Forge-Resilience | Sind `withRetry` und kein-stiller-Catch in der Self-review-Checklist? |
| AES-256 | Wenn Credentials verarbeitet werden: ist AES-256-Pflicht explizit? |
| Exploration | Hat jeder unbekannte Dateipfad einen Exploration-Befehl? |
| Sub-Slice-Granularität | Ist jeder Sub-Slice in < 6h erledigt? (Wenn nicht: weiter aufteilen) |
| Commit-Message | Hat jeder Sub-Slice eine eigene Commit-Message? |
| Abschlussbericht | Hat der Prompt ein Abschlussbericht-Template mit nächster Priorität? |
| Archivierungshinweis | Steht `Move-Item ... archive/` im Abschluss? |

---

## Bekannte Sonderfälle

### Externer Blocker (Meta-Verifizierung, API-Vorab-Validierung)

→ Als `Pre-Condition`-Block direkt unter dem Header:

```markdown
> **Pre-Condition (extern, vor Sprint-Start manuell erledigen):**
> [Beschreibung was extern vorbereitet sein muss]
> [Warum der Sprint ohne das nicht testbar ist]
```

### Forge-Deviations-Schließung

Wenn ein Slice eine Datei aus `docs/forge-web-deviations.md` berührt:
1. In der Exploration: `Select-String "\.catch\(\(\)" [datei]` aufnehmen
2. In der Self-review-Checklist: explizit erwähnen
3. Im Abschluss: `▶ deviations.md: [datei]:[zeile] als geschlossen markieren`

### Prompts in YAML (KI-Prompts)

Wenn ein Slice einen KI-Prompt benötigt (`prompts/*.yaml`):
1. Die vollständige YAML-Struktur im Prompt vorgeben (system + user)
2. In der Self-review-Checklist: "Kein Prompt-Text im TypeScript-Code"
3. Validation: `Select-String "[erste Zeile des Prompts]" lib,app -Recurse` → Zero Treffer

### Phase-Abschluss

Wenn der Prompt den letzten Slice einer Phase abschließt:
→ Im Abschluss-Bericht ergänzen:

```
═══════════════════════════════════════════════
[OK] Phase [N] ABGESCHLOSSEN
▶ Nächste Priorität: Phase [N+1] starten
═══════════════════════════════════════════════
```

---

## Beispiel-Aufruf (für KI-Agenten)

```
Sei ein Senior SW-Architekt mit 20 Jahren Erfahrung.

Lies folgende Dateien vollständig:
- docs/dev-prompts/plan-v6.1.md
- docs/roadmap.md
- docs/decisions.md
- docs/forge-web-deviations.md
- docs/dev-prompts/OpenActions.md
- docs/dev-prompts/sprint-p3g-templates-klon.md  (aktuellster Prompt als Referenz)

Erzeuge dann die nächsten [N] Sprint-Prompts basierend auf:
1. Der Implementierungsreihenfolge in roadmap.md
2. Den Slice-Details in plan-v6.1.md
3. Dem Format dieser Anleitung (docs/dev-prompts/GENERATE-SPRINT-PROMPTS.md)

Lege jeden Prompt als separate .md-Datei in docs/dev-prompts/ ab.
Dateiname-Schema: sprint-[phase-id]-[slug].md
```

---

## Referenz: Bestehende Sprint-Prompts

| Datei | Slice | Phase | Status |
|---|---|---|---|
| `sprint-p2c-email.md` | Slice 19 — E-Mail | 2 | ✅ Archiviert nach Abschluss |
| `sprint-p2d-dataseo.md` | Slice 11a — DataForSEO | 2 | Bereit |
| `sprint-p2e-canva.md` | Slice 17 — Canva | 2 | Bereit |
| `sprint-p3a-kosten-tracking.md` | Slice 27 — Kosten | 3 | Bereit |
| `sprint-p3b-hedy.md` | Slice 20 — Hedy | 3 | Bereit |
| `sprint-p3c-praxis-portal.md` | Slice 21 — Portal | 3 | Bereit |
| `sprint-p3d-wordpress.md` | Slice 22 — WordPress | 3 | Bereit |
| `sprint-p3e-klicktipp.md` | Slice 23 — KlickTipp | 3 | Bereit |
| `sprint-p3f-kpi-dashboard.md` | Slice 24 — KPI | 3 | Bereit |
| `sprint-p3g-templates-klon.md` | Slice 25 — Templates | 3 | Bereit |
| `sprint-p3h-token-warning.md` | Slice 26 — Token-Warning | 3 | Bereit |
| `sprint-p2f-social-media.md` | Slice 18 — Social Media | 2 | Bereit |
| `sprint-p4a-seo.md` | Slice 14 — SEO-Analyse | 4 | Bereit |
| `sprint-p4b-bildbriefing.md` | Slice 15 — Bildbriefing | 4 | Bereit |
| `sprint-p4c-nfa-haertung.md` | NFA-Härtung | 4 | Bereit |
| `sprint-p4d-performance.md` | Performance & Stabilität | 4 | Bereit |
| `sprint-fix-a-codecleanup.md` | Code Cleanup — JSON.parse, Footer, Docs | Fix | Bereit |
| `sprint-fix-b-quality-gate.md` | Themen-Quality-Gate Refactor | Fix | Bereit (nach Fix-A) |

**Alle Prompts generiert.** Fix-A und Fix-B können vor P4-A abgearbeitet werden.

---

*– Ende der Anleitung –*
