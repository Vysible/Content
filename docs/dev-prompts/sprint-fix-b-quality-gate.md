# Sprint Fix-B — Themen-Quality-Gate: Magic Numbers + istFrage deterministisch

**Projekt:** Vysible  
**Sprint:** Fix-B  
**Format:** Tier 2 (Stub-Dateien vorhanden, Abhängigkeiten zwischen Schema/Logik/Prompt komplex)  
**Abhängigkeit:** Sprint Fix-A ✅  
**Anforderungen:** Backlog #5 aus `docs/dev-prompts/OpenActions.md`  
**Geschätzte Dauer:** ~3–4 Stunden

> **Hintergrund:**  
> In der Prod-Umgebung (Zahnzentrum Warendorf, Mai 2026) brach eine Pipeline mit  
> *"Nur 36% SEO-Titel als Frage/mit Keyword (Minimum 50%)"* ab — der SEO-Check
> war ein Hard-Fail mit hardcoded Schwellwert. Dieser Punkt wurde bereits teilweise
> adressiert: der SEO-Check ist jetzt ein Warning. Der `praxisPct < 0.8`-Check ist
> jedoch noch ein Hard-Fail mit hardcoded Magic Number.
>
> Zusätzlich berechnet das LLM `istFrage` selbst — ein Self-Assessment das unzuverlässig
> ist (Self-Assessment-Bias) und unnötige Token kostet. `istFrage` lässt sich deterministisch
> aus `seoTitel` und `keywordPrimaer` ableiten.
>
> Dieser Sprint löst beide Probleme.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus.  
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.  
Bei GO: Exploration starten.

```powershell
# Check A — Working Tree (Sprint Fix-A committed)
git status --porcelain

# Check B — TypeScript (0 Fehler Voraussetzung)
node node_modules/typescript/bin/tsc --noEmit

# Check C — Sprint Fix-A abgeschlossen?
Select-String "Fix-A.*✅|Sprint Fix-A.*✅" docs/roadmap.md -i

# Check D — CHANGELOG hat [Unreleased]-Sektion
Select-String "\[Unreleased\]" CHANGELOG.md

# Check E — Tests
pnpm test --run
```

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Aktuelle themes-schema.ts vollständig lesen
Get-Content lib/generation/themes-schema.ts

# 2. Aktuelle themes.ts (wie wird validateThemenQuality aufgerufen?)
Get-Content lib/generation/themes.ts

# 3. Aktuelles prompts/themes.yaml vollständig lesen
Get-Content prompts/themes.yaml

# 4. Existiert lib/generation/config.ts bereits?
Test-Path lib/generation/config.ts

# 5. Wo wird validateThemenQuality ausser themes.ts noch aufgerufen?
Select-String "validateThemenQuality" lib,app -Recurse | Select-Object Path, LineNumber, Line

# 6. Wo wird istFrage gelesen (ausser Schema/Validation)?
Select-String "istFrage" lib,app,components -Recurse | Select-Object Path, LineNumber, Line

# 7. Wo wird praxisspezifisch gelesen (ausser Schema/Validation)?
Select-String "praxisspezifisch" lib,app,components -Recurse | Select-Object Path, LineNumber, Line

# 8. Aktuelle ENV-Variablen in .env.example
Select-String "THEMES" .env.example
```

**Bekannte Ausgangslage (Stand 2026-05-16):**

| Datei | IST | SOLL |
|---|---|---|
| `lib/generation/themes-schema.ts:37` | `praxisPct < 0.8` hardcoded | aus `THEMES_CONFIG.minPraxisQuote` |
| `lib/generation/themes-schema.ts:45` | `seoPct < 0.5` hardcoded | aus `THEMES_CONFIG.minSeoQuote` |
| `lib/generation/themes-schema.ts:25` | `istFrage: z.boolean()` — Pflichtfeld vom LLM | `istFrage: z.boolean().optional().default(false)` |
| `lib/generation/config.ts` | existiert nicht | anlegen mit Defaults + ENV-Override |
| `lib/generation/themes.ts` | kein post-parse Compute | `computeIstFrage()` nach Parse einfügen |
| `prompts/themes.yaml` | `"istFrage": true` in Schema-Beispiel | Feld entfernen |
| `prompts/themes.yaml` | Rule: "50% als Frage…" als LLM-Anweisung | Guideline behalten, aber nicht als Pflichtfeld |

---

## CRITICAL: Self-review Checklist

- [ ] `lib/generation/config.ts` exportiert `THEMES_CONFIG` mit `minPraxisQuote` und `minSeoQuote`
- [ ] ENV-Override funktioniert: `THEMES_MIN_PRAXIS_QUOTE=0.6` würde Schwellwert ändern
- [ ] `themes-schema.ts` enthält keine hardcoded `0.8` oder `0.5` mehr
- [ ] `validateThemenQuality()` importiert Werte aus config, nicht inline
- [ ] `istFrage` in Schema ist optional (kein LLM-Pflichtfeld mehr)
- [ ] `computeIstFrage()` in themes.ts: `endsWith('?') || includes(keyword)` — deterministische Berechnung
- [ ] Post-parse: alle Items erhalten `istFrage` gesetzt via `computeIstFrage()`
- [ ] `prompts/themes.yaml` hat kein `"istFrage"` Feld mehr im JSON-Schema-Beispiel
- [ ] `prompts/themes.yaml` Regel zur seoTitel-Formatierung bleibt erhalten (LLM-Guidance, nicht Pflichtfeld)
- [ ] `praxisspezifisch` bleibt LLM-Pflichtfeld (kein deterministisches Äquivalent möglich)
- [ ] Keine Stelle im Code liest `istFrage` aus der DB und erwartet es als `true`/`false` (Grep bestätigt)
- [ ] `.env.example` enthält neue ENV-Variablen dokumentiert
- [ ] TypeScript: 0 Fehler
- [ ] Tests: bestehende Unit-Tests für themes-schema laufen durch
- [ ] `CHANGELOG.md` aktualisiert

---

## Sub-Slice A — lib/generation/config.ts + themes-schema.ts refactor

**Aufwand:** ~1.5 Stunden  
**Scope:** Neue Config-Datei anlegen, Magic Numbers herausziehen, `istFrage` optional machen.  
Kein Logik-Bruch — Defaults identisch zu bisherigen Hardcodes.

### IN (zu ändern/anlegen)

- `lib/generation/config.ts` — **neu anlegen**
- `lib/generation/themes-schema.ts` — Magic Numbers ersetzen, `istFrage` optional
- `.env.example` — neue Variablen dokumentieren

### OUT (nicht anfassen in diesem Sub-Slice)

- `lib/generation/themes.ts` — kommt in Sub-Slice B
- `prompts/themes.yaml` — kommt in Sub-Slice B

### Implementierung: lib/generation/config.ts (neu)

```typescript
/**
 * Konfigurierbare Schwellwerte für die Themen-Qualitätsprüfung.
 * Defaults entsprechen den plan.md-Spezifikationen (Sektion Themes-Quality-Gate).
 * Können per ENV-Override angepasst werden ohne Deployment.
 *
 * @forge-scan factory-only — kein IO, nur Konfigurationswerte.
 */
export const THEMES_CONFIG = {
  /**
   * Mindestanteil praxisspezifischer Themen (0–1).
   * ENV: THEMES_MIN_PRAXIS_QUOTE (z.B. "0.7" für 70%)
   * Default: 0.8 (plan.md Spec)
   */
  minPraxisQuote: parseFloat(process.env.THEMES_MIN_PRAXIS_QUOTE ?? '0.8'),

  /**
   * Mindestanteil SEO-Titel als Frage oder mit Primärkeyword (0–1).
   * Unterschreitung → Warning, kein Hard-Fail.
   * ENV: THEMES_MIN_SEO_QUOTE (z.B. "0.4" für 40%)
   * Default: 0.5 (plan.md Spec)
   */
  minSeoQuote: parseFloat(process.env.THEMES_MIN_SEO_QUOTE ?? '0.5'),
} as const
```

### Implementierung: themes-schema.ts Änderungen

```typescript
// Import ergänzen (erste Zeile nach den Zod-Imports):
import { THEMES_CONFIG } from './config'

// istFrage: Pflichtfeld → optional (wird post-parse deterministisch gesetzt)
// ALT:
istFrage: z.boolean(),
// NEU:
istFrage: z.boolean().optional().default(false),

// validateThemenQuality: hardcoded Werte → config
// ALT:
if (praxisPct < 0.8) {
  return {
    ok: false,
    reason: `Nur ${Math.round(praxisPct * 100)}% praxisspezifisch (Minimum 80%)`,
  }
}
const seoPct = items.filter((i) => i.istFrage).length / items.length
const warning = seoPct < 0.5
  ? `Nur ${Math.round(seoPct * 100)}% SEO-Titel als Frage/mit Keyword (Empfehlung: ≥50%)`
  : undefined
// NEU:
const minPraxis = THEMES_CONFIG.minPraxisQuote
if (praxisPct < minPraxis) {
  return {
    ok: false,
    reason: `Nur ${Math.round(praxisPct * 100)}% praxisspezifisch (Minimum ${Math.round(minPraxis * 100)}%)`,
  }
}
const seoPct = items.filter((i) => i.istFrage).length / items.length
const minSeo = THEMES_CONFIG.minSeoQuote
const warning = seoPct < minSeo
  ? `Nur ${Math.round(seoPct * 100)}% SEO-Titel als Frage/mit Keyword (Empfehlung: ≥${Math.round(minSeo * 100)}%)`
  : undefined
```

### Implementierung: .env.example Ergänzung

```bash
# Themen-Quality-Gate (optional, Defaults aus plan.md Spec)
# THEMES_MIN_PRAXIS_QUOTE=0.8
# THEMES_MIN_SEO_QUOTE=0.5
```

### Acceptance Checklist

- [ ] `Test-Path lib/generation/config.ts` → `True`
- [ ] `Select-String "0\.8|0\.5" lib/generation/themes-schema.ts` → 0 Treffer (keine Hardcodes mehr)
- [ ] `Select-String "THEMES_CONFIG" lib/generation/themes-schema.ts` → Treffer
- [ ] `istFrage: z.boolean().optional()` in themes-schema.ts vorhanden
- [ ] `.env.example` enthält `THEMES_MIN_PRAXIS_QUOTE` dokumentiert (auskommentiert)
- [ ] `tsc --noEmit` → 0 Fehler

### Commit-Message

```
refactor(generation): Themen-Quality-Gate Magic Numbers in config.ts + istFrage optional (Backlog #5 Sub-A)
```

---

## Sub-Slice B — themes.ts: istFrage deterministisch + themes.yaml update

**Aufwand:** ~1.5 Stunden  
**Scope:** LLM muss `istFrage` nicht mehr selbst befüllen. Deterministische Berechnung post-parse.  
Prompt-Simplifikation: `istFrage`-Feld aus YAML-Schema-Beispiel entfernen.

### IN (zu ändern)

- `lib/generation/themes.ts` — `computeIstFrage()` + post-parse Mapping
- `prompts/themes.yaml` — `istFrage` aus JSON-Schema-Beispiel entfernen

### OUT (nicht anfassen)

- `lib/generation/themes-schema.ts` — wurde in Sub-Slice A bereits angepasst
- `lib/generation/config.ts` — wurde in Sub-Slice A angelegt
- Andere Pipeline-Dateien

### Implementierung: themes.ts

**Neue Hilfsfunktion** (am Ende der Datei, vor dem Default-Export / nach den Imports):

```typescript
/**
 * Berechnet deterministisch ob ein SEO-Titel als Frage formuliert ist
 * oder das Primärkeyword enthält. Ersetzt LLM-Self-Assessment für istFrage.
 *
 * Kriterien:
 *   (a) seoTitel endet mit '?' → Frage-Format
 *   (b) seoTitel enthält keywordPrimaer (case-insensitive) → Keyword-Präsenz
 */
function computeIstFrage(seoTitel: string, keywordPrimaer: string): boolean {
  const t = seoTitel.trim()
  return t.endsWith('?') || t.toLowerCase().includes(keywordPrimaer.toLowerCase())
}
```

**Post-parse Anwendung** — in der Stelle wo `parseThemesJson(rawText)` aufgerufen wird  
(in `generateThemes`, nach dem `const items = parseThemesJson(rawText)`-Aufruf):

```typescript
// ALT:
const items = parseThemesJson(rawText)
const validation = validateThemenQuality(items)
// ...
return items

// NEU — istFrage direkt beim Mapping setzen, Variable bleibt 'items':
const items = parseThemesJson(rawText).map((item) => ({
  ...item,
  istFrage: computeIstFrage(item.seoTitel, item.keywordPrimaer),
}))
const validation = validateThemenQuality(items)
// ... (Rest unverändert)
return items
```

> Hinweis: Die Variable bleibt `items` — kein Rename nötig, keine Downstream-Änderungen.

### Implementierung: prompts/themes.yaml

`"istFrage": true` aus dem JSON-Schema-Beispiel entfernen.  
Die Guideline-Regel bleibt erhalten (das LLM soll weiterhin SEO-Titel korrekt formulieren):

```yaml
# ALT (Zeile 24 im JSON-Beispiel-Block):
    "praxisspezifisch": true,
    "istFrage": true
# NEU:
    "praxisspezifisch": true
# Keine istFrage-Zeile mehr — wird serverseitig berechnet
```

Die Regelzeile (ca. Zeile 30):  
```yaml
# ALT:
  - Mindestens 50% der seoTitel als Frage oder mit Primärkeyword
# NEU (Guideline bleibt, aber als Output-Hinweis formuliert):
  - Formuliere mindestens 50% der seoTitel als Frage (endet mit ?) oder mit dem Primärkeyword
```

> Hinweis: Die Regel im Prompt dient weiterhin als Guidance für das LLM um gute seoTitel
> zu erzeugen. Die Prüfung erfolgt serverseitig deterministisch — das LLM muss kein
> `istFrage`-Feld mehr liefern.

### Acceptance Checklist

- [ ] `computeIstFrage()` Funktion in `lib/generation/themes.ts` vorhanden
- [ ] Post-parse: `parseThemesJson(rawText).map(...)` mit `computeIstFrage` Aufruf vorhanden
- [ ] `validateThemenQuality` wird mit den gemappten `items` aufgerufen
- [ ] Kein zweifaches `JSON.parse(JSON.stringify(...))` im themes.ts eingeschleppt
- [ ] `Select-String "istFrage" prompts/themes.yaml` → 0 Treffer
- [ ] Guideline-Regel in themes.yaml bleibt erhalten (seoTitel-Formatting-Hint)
- [ ] Unit-Test für `computeIstFrage` anlegen (falls `__tests__/unit/` vorhanden):
  - `computeIstFrage('Wie oft zahnarzt?', 'zahnarzt')` → `true` (Frage + Keyword)
  - `computeIstFrage('Prophylaxe beim Zahnarzt', 'zahnarzt')` → `true` (Keyword)
  - `computeIstFrage('Gesunde Ernährung für Patienten', 'Implantat')` → `false` (kein Keyword, kein Fragezeichen)
  - `computeIstFrage('Was kostet eine Zahnreinigung?', 'reinigung')` → `true` (Frage)
- [ ] `tsc --noEmit` → 0 Fehler
- [ ] `pnpm test --run` → alle Tests grün

### Commit-Message

```
feat(generation): istFrage deterministisch berechnet, aus LLM-Prompt entfernt (Backlog #5 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# 1. config.ts angelegt und exportiert THEMES_CONFIG
Test-Path lib/generation/config.ts
Select-String "THEMES_CONFIG" lib/generation/config.ts

# 2. Keine Magic Numbers mehr in themes-schema.ts
Select-String "0\.8|0\.5" lib/generation/themes-schema.ts
# → Erwartung: 0 Treffer

# 3. istFrage optional in Schema
Select-String "istFrage.*optional" lib/generation/themes-schema.ts
# → Erwartung: Treffer

# 4. computeIstFrage in themes.ts
Select-String "computeIstFrage" lib/generation/themes.ts
# → Erwartung: min. 2 Treffer (Definition + Aufruf)

# 5. Kein istFrage in themes.yaml
Select-String "istFrage" prompts/themes.yaml
# → Erwartung: 0 Treffer

# 6. ENV-Variablen in .env.example dokumentiert
Select-String "THEMES_MIN" .env.example
# → Erwartung: Treffer (auskommentiert)

# 7. TypeScript
node node_modules/typescript/bin/tsc --noEmit
# → Erwartung: 0 Fehler

# 8. Tests
pnpm test --run
# → Erwartung: alle grün
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| `praxisspezifisch` aus LLM-Output entfernen | Kein deterministisches Äquivalent ohne Praxis-Kontext |
| Soft-Warn-UI bei Qualitätsfehler (QUALITY_WARNING Job-Status) | UI-Änderung → eigener Sprint |
| `praxisPct`-Hard-Fail → Soft-Warn umwandeln | Bewusstes Design — Hard-Fail ist hier korrekt; nur Schwellwert wird konfigurierbar |
| ESLint-Regeln erweitern | Sprint P4-C |
| Browser-Logger | Post-P4 |
| KT-Status in StoredTextResult | KlickTipp-Feature-Sprint |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT FIX-B ABSCHLUSSBERICHT
═══════════════════════════════════════════════
Datum: [DATUM]
Agent: [AGENT]

Sub-Slice A — config.ts + schema refactor:
  lib/generation/config.ts: [angelegt]
  themes-schema.ts Magic Numbers: [entfernt, N Stellen]
  istFrage: [optional.default(false)]
  .env.example: [aktualisiert]

Sub-Slice B — deterministisches istFrage + YAML:
  computeIstFrage() in themes.ts: [implementiert]
  post-parse Mapping: [implementiert]
  prompts/themes.yaml: [istFrage entfernt, Guideline-Regel angepasst]
  Unit-Tests: [N Tests für computeIstFrage angelegt]

TypeScript: [0 Fehler | Fehler: ...]
Tests: [PASS | FAIL: ...]

[OK] Fix-B ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P4-A (SEO-Analyse — Slice 14)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-fix-b-quality-gate.md docs/dev-prompts/archive/
```
