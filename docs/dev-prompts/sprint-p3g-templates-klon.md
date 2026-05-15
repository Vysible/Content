# Sprint P3-G — Fachgebiet-Templates & Klon-Funktion (Slice 25)

**Projekt:** Vysible  
**Sprint:** P3-G  
**Format:** Tier 2 (Stub möglicherweise vorhanden, Exploration zuerst)  
**Abhängigkeit:** Sprint P3-F ✅  
**Anforderungen:** plan.md Slice 25  
**Geschätzte Dauer:** ~1 Tag

> **Ziel:** Neue Praxis desselben Fachgebiets in unter 10 Minuten onboarden.  
> Keine KI-Calls in diesem Sprint — reine Datenstrategie (YAML-Templates + DB-Klon).

> **Forge-Hinweis:** `components/wizard/TemplateSelector.tsx` hat laut  
> `docs/forge-web-deviations.md` einen stillen Catch (L23, Status: Accepted, Sprint 0a).  
> Dieser Sprint schließt diese Lücke im Zuge der echten Implementierung.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap: Vorgänger P3-F abgeschlossen?
Select-String "P3-F.*✅|Sprint P3-F.*✅" docs/roadmap.md -i

# Check D — CHANGELOG
Select-String "\[Unreleased\]" CHANGELOG.md

# Check E — Tests
pnpm test --run
```

Bei **Hard-FAIL (A, B oder E):** SOFORT STOP. Kein weiterer Befehl. Kein weiterer Check. Keine Parallelisierung.  
Ausgabe: `HARD-FAIL: Check [X] — [Grund]` + erforderliche Aktion für den User. Dann **await User-Freigabe**.  
Bei **5/5 PASS:** Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# TemplateSelector-Stub (stiller Catch L23 aus deviations.md)
Get-Content components/wizard/TemplateSelector.tsx -ErrorAction SilentlyContinue

# templates/-Verzeichnis: schon angelegt?
Get-ChildItem templates -Recurse -Name -ErrorAction SilentlyContinue

# lib/templates/: bestehende Loader?
Get-ChildItem lib/templates -Recurse -Name -ErrorAction SilentlyContinue
Get-Content lib/templates/loader.ts -ErrorAction SilentlyContinue

# Klon-Route vorhanden?
Get-Content app/api/projects/clone/route.ts -ErrorAction SilentlyContinue

# Project-Modell: welche Felder sind bereits für Template/Klon relevant?
Select-String "specialty\|template\|fachgebiet\|clone\|clonedFrom" prisma/schema.prisma -i

# Wie ist der Wizard Step 3 aufgebaut? (TemplateSelector-Platzhalter)
Select-String "TemplateSelector\|templateId\|specialty" app/(dashboard) -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# Welche Projekt-Felder gibt es insgesamt? (für Klon: was kopieren, was nicht)
Select-String "model Project" prisma/schema.prisma -A 40

# Wie wird YAML in bestehenden lib/-Dateien geladen?
Select-String "readFileSync.*yaml\|yaml\.load\|loadYaml" lib -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# Hedy-Import-Button — schon im Wizard vorhanden?
Select-String "HedyImport\|hedy.*import" app/(dashboard)/projects/new -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 5
```

**Bekannte Lücken (Stand Mai 2026, aus Roadmap + plan.md + deviations.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `templates/zahnarzt.yaml` | Fehlend | MUSS |
| `templates/kfo.yaml` | Fehlend | MUSS |
| `templates/gynaekologie.yaml` | Fehlend | MUSS |
| `templates/dermatologie.yaml` | Fehlend | MUSS |
| `lib/templates/loader.ts` | Fehlend | MUSS |
| `components/wizard/TemplateSelector.tsx` | Stub mit stillem Catch L23 | MUSS |
| `app/api/projects/clone/route.ts` | Fehlend | MUSS |
| Project-Modell | `specialty`-Feld fehlt ggf. | PRÜFEN |

---

## CRITICAL: Self-review Checklist

- [ ] Template-YAML-Dateien editierbar ohne Deployment (im Repo, nicht in DB)
- [ ] `lib/templates/loader.ts` ist die **einzige** Stelle für YAML-Template-Lesen
- [ ] Klon kopiert **nicht**: Positionierungsdokument, Canva-Ordner, generierte Inhalte
- [ ] Klon kopiert: Fachgebiet, Kanäle, Keywords, KT-Listen-ID, WP-URL, API-Key-Zuordnung
- [ ] Nach Klon: Hedy-Import-Button im Wizard hervorgehoben mit Hinweistext
- [ ] Stiller Catch `components/wizard/TemplateSelector.tsx` L23 → `console.warn` (Client-Code)
- [ ] Keine KI-Calls in diesem Sprint
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — YAML-Templates + Loader + Template-Selector

**Aufwand:** ~4–5 Stunden  
**Scope:** 4 YAML-Dateien anlegen, Loader implementieren, TemplateSelector-Komponente vervollständigen.

### IN

```
templates/zahnarzt.yaml                         NEU
templates/kfo.yaml                              NEU
templates/gynaekologie.yaml                     NEU
templates/dermatologie.yaml                     NEU
lib/templates/loader.ts                         NEU — YAML-Reader + Typ-Definitionen
components/wizard/TemplateSelector.tsx          MOD — stiller Catch schließen + echte Impl.
app/api/templates/route.ts                      NEU — GET: Liste aller Templates für Dropdown
prisma/schema.prisma                            MOD — specialty-Feld auf Project (falls fehlt)
```

### OUT

```
lib/ai/                                         NICHT anfassen (keine KI-Calls)
lib/costs/                                      NICHT anfassen
app/api/projects/clone/                         NICHT anfassen (Sub-Slice B)
```

### A1 — Prisma: specialty auf Project (falls fehlt)

```prisma
// Auf dem Project-Modell ergänzen:
specialty          String?   // 'zahnarzt' | 'kfo' | 'gynaekologie' | 'dermatologie'
```

Migration: `pnpm prisma migrate dev --name add_specialty_to_project`

### A2 — Template-Typ-Definition (in loader.ts)

```typescript
// lib/templates/loader.ts
export interface FachgebietTemplate {
  specialty: string;
  defaultCategories: string[];
  seasonalTopics: Record<string, string>;  // { "januar": "...", "februar": "...", ... }
  defaultKeywords: string[];
  hwgHighRiskCategories: string[];
  defaultCta: string;
  defaultFunnelDistribution: {
    awareness: string;
    consideration: string;
    decision: string;
    retention: string;
  };
}
```

### A3 — templates/zahnarzt.yaml (vollständig)

```yaml
specialty: zahnarzt
displayName: Zahnarzt
defaultCategories:
  - Implantologie
  - Aligner & Invisalign
  - Prophylaxe
  - Zahnästhetik
  - Zahnerhalt
  - Kinderzahnmedizin
seasonalTopics:
  januar: Neujahrsvorsätze + Prophylaxe-Check
  februar: Valentinstag + Zähne bleichen
  maerz: Frühjahrsputz für die Zähne
  april: Frühjahrscheck Zahngesundheit
  mai: Muttertag + Zahnästhetik
  juni: Urlaubscheck vor Fernreise
  juli: Sommerferien + Kinderzahngesundheit
  august: Back-to-school Vorbereitung
  september: Herbst-Prophylaxe-Check
  oktober: Weltzahnarzttag (20. Oktober)
  november: Weihnachtslächeln vorbereiten
  dezember: Jahresabschluss + Vorsorge-Erinnerung
defaultKeywords:
  - "Zahnarzt [Ort]"
  - "Aligner Kosten"
  - "Zahnimplantat Erfahrungen"
  - "Zähne bleichen Zahnarzt"
  - "Prophylaxe Zahnreinigung"
hwgHighRiskCategories:
  - Implantologie
  - Zahnästhetik
defaultCta: "Termin vereinbaren"
defaultFunnelDistribution:
  awareness: "30%"
  consideration: "40%"
  decision: "20%"
  retention: "10%"
```

### A4 — templates/kfo.yaml

```yaml
specialty: kfo
displayName: Kieferorthopädie
defaultCategories:
  - Brackets & Spangen
  - Aligner
  - Frühbehandlung Kinder
  - Erwachsenen-KFO
  - Retainer & Retention
seasonalTopics:
  januar: Neujahrsvorsatz gesundes Lächeln
  februar: Valentinstag + Traumlächeln
  april: Vor den Sommerferien — Kontrolle
  juni: Schuljahresende + neue Behandlung starten
  august: Schulstart + KFO-Check
  september: Herbst-Kontrolltermin
  november: Weihnachten mit neuem Lächeln
  dezember: Behandlung jetzt starten — ins neue Jahr starten
defaultKeywords:
  - "Kieferorthopäde [Ort]"
  - "Aligner Erwachsene Kosten"
  - "Brackets Kinder Kosten"
  - "Zahnkorrektur ohne Spange"
  - "Invisalign [Ort]"
hwgHighRiskCategories:
  - Erwachsenen-KFO
defaultCta: "Beratungstermin vereinbaren"
defaultFunnelDistribution:
  awareness: "35%"
  consideration: "40%"
  decision: "15%"
  retention: "10%"
```

### A5 — templates/gynaekologie.yaml

```yaml
specialty: gynaekologie
displayName: Gynäkologie & Geburtshilfe
defaultCategories:
  - Schwangerschaft & Geburt
  - Vorsorge & Früherkennung
  - Hormonelle Gesundheit
  - Familienplanung
  - Wechseljahre
  - Minimal-invasive Chirurgie
seasonalTopics:
  januar: Gesundheitsvorsätze Frauengesundheit
  februar: Herzgesundheit Frauen
  maerz: Weltfrauentag (8. März) + Frauengesundheit
  april: Frühjahrs-Vorsorgecheck
  mai: Muttertag + Familienplanung
  juni: Sommer + Reisegesundheit Schwangerschaft
  oktober: Brustkrebsmonat — Früherkennung
  november: Wechseljahre — offen sprechen
  dezember: Jahresvorsorge vor Jahreswechsel
defaultKeywords:
  - "Frauenarzt [Ort]"
  - "Gynäkologie [Ort]"
  - "Schwangerschaft Vorsorge"
  - "Wechseljahre Behandlung"
  - "Hormontherapie [Ort]"
hwgHighRiskCategories:
  - Hormonelle Gesundheit
  - Wechseljahre
defaultCta: "Termin vereinbaren"
defaultFunnelDistribution:
  awareness: "40%"
  consideration: "35%"
  decision: "15%"
  retention: "10%"
```

### A6 — templates/dermatologie.yaml

```yaml
specialty: dermatologie
displayName: Dermatologie & Ästhetische Medizin
defaultCategories:
  - Hautkrebs-Früherkennung
  - Akne & Rosacea
  - Ästhetische Dermatologie
  - Neurodermitis & Allergologie
  - Laserbehandlungen
  - Anti-Aging
seasonalTopics:
  januar: Winterhaut pflegen
  februar: Valentinstag + Hautpflege-Routine
  april: Frühjahrssonne + UV-Schutz
  mai: Muttertag + Hautpflege-Geschenktipps
  juni: Sommercheck — Melanom-Früherkennung
  august: Sonnenschaden erkennen
  september: Sommer-Rückblick Hautpflege
  oktober: Herbst-Hauterneuerung
  november: Winter-Skincare starten
  dezember: Jahresabschluss + Hautcheck
defaultKeywords:
  - "Hautarzt [Ort]"
  - "Dermatologie [Ort]"
  - "Botox [Ort]"
  - "Hautkrebsscreening [Ort]"
  - "Akne Behandlung"
hwgHighRiskCategories:
  - Ästhetische Dermatologie
  - Laserbehandlungen
  - Anti-Aging
defaultCta: "Beratungstermin vereinbaren"
defaultFunnelDistribution:
  awareness: "35%"
  consideration: "35%"
  decision: "20%"
  retention: "10%"
```

### A7 — lib/templates/loader.ts

```typescript
// lib/templates/loader.ts
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml'; // pnpm add js-yaml + @types/js-yaml (prüfen ob bereits installiert)
import { logger } from '../utils/logger';

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

export function listAvailableTemplates(): string[] {
  try {
    return fs
      .readdirSync(TEMPLATES_DIR)
      .filter(f => f.endsWith('.yaml'))
      .map(f => f.replace('.yaml', ''));
  } catch (exc: unknown) {
    logger.warn({ err: exc }, '[Vysible] templates/-Verzeichnis nicht lesbar');
    return [];
  }
}

export function loadTemplate(specialty: string): FachgebietTemplate | null {
  const filePath = path.join(TEMPLATES_DIR, `${specialty}.yaml`);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return yaml.load(content) as FachgebietTemplate;
  } catch (exc: unknown) {
    logger.warn({ err: exc, specialty }, '[Vysible] Template nicht geladen');
    return null;
  }
}
```

> **Hinweis:** `js-yaml` prüfen ob schon in `package.json` (wird für andere YAML-Loads genutzt).
> Falls nicht: `pnpm add js-yaml` + `pnpm add -D @types/js-yaml`

### A8 — app/api/templates/route.ts

```typescript
// GET /api/templates — Liste aller Templates für Dropdown
// Auth-Check → listAvailableTemplates() → loadTemplate(name) für displayName
// Response: [{ id: 'zahnarzt', displayName: 'Zahnarzt', ... }]
```

### A9 — TemplateSelector-Komponente

```typescript
// components/wizard/TemplateSelector.tsx
'use client';
// Schließt forge-web-deviations.md Eintrag: stillen Catch L23
// Fetcht GET /api/templates bei Mount
// Zeigt Dropdown: "Kein Template" + alle verfügbaren Templates
// Auswahl → gibt Template-Daten an Wizard-State weiter (Keywords, Kategorien, saisonale Themen)
// Fehler bei Fetch: console.warn('[Vysible] Templates konnten nicht geladen werden', err)
//   (Client-Code → console.warn statt logger.warn, laut forge-web-deviations.md Konvention)
// Kein Template → Wizard funktioniert weiterhin ohne Vorbelegung (nicht blockierend)
```

### Acceptance Checklist

- [ ] `templates/`-Verzeichnis mit 4 YAML-Dateien vorhanden
- [ ] `loadTemplate('zahnarzt')` gibt valides `FachgebietTemplate`-Objekt zurück
- [ ] GET `/api/templates` → Liste aller 4 Templates mit `displayName`
- [ ] Wizard Step 3: Dropdown zeigt alle Templates
- [ ] Template gewählt → Keywords + Kategorien im Wizard vorbelegt
- [ ] Stiller Catch L23 in `TemplateSelector.tsx` durch `console.warn` ersetzt
- [ ] Template-YAML ohne Deployment editierbar (kein Build-Step nötig)
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(templates): 4 Fachgebiet-YAMLs + Loader + TemplateSelector (Slice 25 Sub-A)
```

---

## Sub-Slice B — Klon-Funktion

**Aufwand:** ~3–4 Stunden  
**Scope:** Projekt klonen mit selektivem Kopieren, Post-Klon-Hedy-Hinweis.

### IN

```
app/api/projects/clone/route.ts                 NEU — POST: Projekt klonen
app/(dashboard)/projects/page.tsx               MOD — "Ähnliches Projekt erstellen"-Button
```

### OUT

```
lib/templates/                                  NICHT anfassen (Sub-Slice A)
components/wizard/TemplateSelector.tsx          NICHT anfassen (Sub-Slice A)
```

### B1 — app/api/projects/clone/route.ts

```typescript
// POST: { sourceProjectId }
// Auth-Check: sourceProject muss dem anfragenden Nutzer gehören
//
// KOPIERT (aus plan.md):
//   - specialty
//   - Kanal-Auswahl (channels)
//   - Keywords
//   - ktListId
//   - wpUrl
//   - API-Key-Zuordnungen (ApiKey-Verweise, nicht die verschlüsselten Keys selbst)
//
// KOPIERT NICHT (aus plan.md):
//   - positioningDocument
//   - canvaFolderId / canvaFolderName
//   - generierte Inhalte (StoredTextResult, ThemenItem etc.)
//   - Kommentare, Freigaben, AuditLog-Einträge
//
// Neues Projekt bekommt:
//   - name: "[Originalname] (Klon)"
//   - status: 'new' (nicht der ursprüngliche Status)
//   - clonedFrom: sourceProjectId (für Nachvollziehbarkeit)
//   - hedyImportHighlight: true (Signal für Wizard-UI)
//
// Response: { newProjectId }
// Nach Redirect: /projects/[newProjectId]/wizard mit hervorgehobenem Hedy-Import-Button
```

### B2 — Klon-Button im Dashboard

```typescript
// In app/(dashboard)/projects/page.tsx (Projektliste):
// Neben jedem Projekt: "..." Menü oder direkter Button "Klonen"
// Klick → POST /api/projects/clone → Redirect zu neuem Projekt im Wizard
// Loading-State: "[INFO] Projekt wird geklont..."
```

### B3 — Post-Klon-Hedy-Hinweis

Im Wizard des geklonten Projekts (`hedyImportHighlight: true`):

```typescript
// In components/wizard/HedyImport.tsx:
// Wenn hedyImportHighlight (aus Projekt-Daten) → hervorgehobene Darstellung
// z.B. gelber Banner: "Neues Projekt geklont — Positionierungsworkshop importieren"
// "Aus Hedy importieren"-Button prominent (nicht als sekundäre Option)
```

### Acceptance Checklist

- [ ] Klon eines Projekts → neues Projekt in < 2 Min. angelegt
- [ ] Geklontes Projekt hat: specialty, Keywords, KT-Listen-ID, WP-URL ✅
- [ ] Geklontes Projekt hat NICHT: Positionierungsdokument, generierte Inhalte, Canva-Ordner ✅
- [ ] Klon eines fremden Projekts → 403
- [ ] Wizard des geklonten Projekts: Hedy-Import-Button hervorgehoben
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(templates): Klon-Funktion + Post-Klon-Hedy-Hinweis (Slice 25 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Template-YAML-Dateien alle vorhanden
@("templates/zahnarzt.yaml","templates/kfo.yaml","templates/gynaekologie.yaml","templates/dermatologie.yaml") |
  ForEach-Object { if (-not (Test-Path $_)) { Write-Error "FEHLT: $_" } else { Write-Host "[OK] $_" } }

# Stiller Catch aus deviations.md geschlossen
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" components/wizard/TemplateSelector.tsx
# → Zero Treffer

# Template-Loader: einzige Stelle für YAML-Lesen
Select-String "templates.*yaml\|yaml.*templates" lib,app -Recurse -i |
  Where-Object { $_.Path -notmatch "loader\.ts|templates/" }
# → Zero Treffer (nur loader.ts liest Template-YAMLs)

# Klon kopiert kein positioningDocument
Select-String "positioningDocument\|positioningDoc" app/api/projects/clone -Recurse -i
# → Zero Treffer (positioningDocument darf nicht kopiert werden)

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Template-Editor im Dashboard | Templates sind YAML-Dateien — direkte Datei-Bearbeitung ausreichend |
| Mehr als 4 Fachgebiete | Erweiterbar durch Hinzufügen weiterer YAML-Dateien ohne Code-Änderung |
| KI-generierte Template-Vorschläge | Phase 4 |
| Template-Versionierung | Overkill für YAML-Dateien — git history reicht |

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich seit 2026-05-15.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR ein Commit vorgeschlagen
> oder ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md`: Slice-Eintrag auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint <ID>)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: Sprint-Nachlaufblock entfernen, echte Restpunkte in sprintübergreifenden Abschnitt verschieben |
| 3 | Sprint-Prompt archivieren | `Move-Item docs/dev-prompts/<dieser-sprint>.md docs/dev-prompts/archive/` — Verifikation: `git status` zeigt Rename-Eintrag (`R`) |
| 4 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]`: Archivierung + Roadmap-Update + ggf. OpenActions-Cleanup explizit dokumentieren |

Vor dem ersten `git commit`-Aufruf gibt der Agent den **SPRINT CLOSEOUT-Bericht**
(`4/4 PASS · GO`) aus. Format siehe `Sprint_Closeout.md` § "Output Format".

Bei FAIL in einem Schritt: **HARD-STOP** — kein Commit, fehlenden Schritt
zuerst ausführen.

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P3-G ABSCHLUSSBERICHT
==============================

Sprint: P3-G — Fachgebiet-Templates + Klon-Funktion (Slice 25)

SUB-SLICES:
  A YAML-Templates + Loader + Selector:   [ ] DONE — Commit: <hash>
  B Klon-Funktion + Hedy-Hinweis:         [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  4 Template-YAMLs vorhanden:      [ ]
  Stiller Catch geschlossen:       [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P3-G ABGESCHLOSSEN — Phase-3-Backlog fast vollständig!
▶ Nächste Priorität: Sprint P3-H (Token-Ablauf-Warnsystem — Slice 26)
▶ deviations.md: components/wizard/TemplateSelector.tsx:23 als geschlossen markieren
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p3g-templates-klon.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
