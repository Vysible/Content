# Sprint P4-A — SEO-Analyse (Slice 14)

**Projekt:** Vysible  
**Sprint:** P4-A  
**Format:** Tier 3 (Exploration dominiert — plan.md-Details minimal, Anforderungen ableiten)  
**Abhängigkeit:** Sprint P2-F ✅  
**Anforderungen:** plan.md Slice 14  
**Geschätzte Dauer:** ~1.5 Tage

> **Ziel:** Automatische SEO-Analyse jedes generierten Blog-Artikels:  
> Keyword-Dichte, Meta-Description-Vorschlag, Title-Tag-Optimierung.  
> Ergebnisse in der Ergebnisansicht anzeigen — als Qualitätsindikatoren  
> vor Export/Veröffentlichung.

> **Hinweis:** Dies ist der **erste Sprint in Phase 4** (Quality & Scale).  
> Slice 14 hat im plan.md nur eine 3-Zeilen-Beschreibung — die Detaillierung  
> basiert auf dem Konzeptdokument v6.0 (FA-KI-07) und den bestehenden  
> Architekturmustern (DataForSEO-Integration, StoredTextResult, Quality-Gate).

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus
(Phase 0 — PSR + Phase 1 — technische Gates).
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.
Bei GO: Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Bestehende SEO-bezogene Dateien
Get-ChildItem lib -Recurse -Name | Select-String "seo" -i
Get-ChildItem app/api -Recurse -Name | Select-String "seo" -i

# 2. DataForSEO-Client (Slice 11a — Keyword-Recherche, verwandt)
Get-Content lib/dataseo/client.ts -ErrorAction SilentlyContinue
Get-ChildItem lib/dataseo -Recurse -Name -ErrorAction SilentlyContinue

# 3. StoredTextResult-Typ: welche Felder gibt es bereits?
Select-String "interface StoredTextResult\|type StoredTextResult" lib -Recurse -i
Get-Content lib/generation/results-store.ts -ErrorAction SilentlyContinue | Select-Object -First 50

# 4. Blog-Text-Generierung: was wird pro Artikel gespeichert?
Select-String "blog\|kanal.*BLOG" lib/generation -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 15

# 5. Ergebnisansicht: wie werden Texte dargestellt?
Get-ChildItem "app/(dashboard)/projects/[id]" -Recurse -Name -ErrorAction SilentlyContinue
Select-String "StoredTextResult\|textResults" "app/(dashboard)/projects" -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 6. Keywords pro Projekt (SEO-Keyword-Basis)
Select-String "keywords" prisma/schema.prisma -i | Select-Object -First 5

# 7. Quality-Gate (Themen-Quality — verwandtes Muster)
Get-Content lib/generation/themes-schema.ts -ErrorAction SilentlyContinue | Select-Object -First 60

# 8. KI-Prompts: gibt es schon einen SEO-bezogenen?
Get-ChildItem prompts -Name | Select-String "seo" -i

# 9. model-prices.ts (Kosten für zusätzlichen SEO-Analyse-Call)
Get-Content config/model-prices.ts -ErrorAction SilentlyContinue | Select-Object -First 30

# 10. Export: wo wird Blog-Content exportiert? (SEO-Daten mit exportieren)
Select-String "blog\|BLOG" lib/export -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10
```

**Bekannte Lücken (Stand Mai 2026, aus plan.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/seo/analyzer.ts` | Fehlend (ganzes Modul) | MUSS |
| `prompts/seo-analysis.yaml` | Fehlend (KI-Prompt für Meta-Description-Vorschlag) | MUSS |
| `app/api/projects/[id]/seo/route.ts` | Fehlend | MUSS |
| StoredTextResult | SEO-Felder fehlen (keywordDensity, metaDescription, titleTag) | MUSS |
| Ergebnisansicht | SEO-Score-Anzeige fehlend | MUSS |
| Export (DOCX/PDF) | SEO-Daten nicht enthalten | SOLL |

---

## CRITICAL: Self-review Checklist

- [ ] SEO-Analyse ist **deterministische Berechnung** (Keyword-Dichte) + **KI-Call** (Meta-Description)
- [ ] KI-Prompt in `prompts/seo-analysis.yaml` — kein Prompt-Text im TypeScript
- [ ] `withRetry` auf KI-Call für Meta-Description-Generierung
- [ ] CostEntry für SEO-Analyse-KI-Call (step: `seo_analysis`)
- [ ] Kein stiller Catch
- [ ] Keyword-Dichte-Berechnung ist pure function (kein KI-Call nötig)
- [ ] SEO-Score als optionale Erweiterung — fehlendes SEO blockiert nicht Export
- [ ] Kein PII in Logs
- [ ] AES-256 nicht relevant (kein Credential-Handling)
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests: Unit-Tests für Keyword-Dichte-Berechnung
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — SEO-Analyse-Engine + API-Route

**Aufwand:** ~5–6 Stunden  
**Scope:** Deterministische SEO-Metriken + KI-generierte Meta-Description + API-Route.

### IN

```
lib/seo/analyzer.ts                            NEU — Keyword-Dichte, Title-Tag-Analyse
lib/seo/meta-generator.ts                      NEU — KI-basierte Meta-Description
prompts/seo-analysis.yaml                      NEU — Prompt für Meta-Description
app/api/projects/[id]/seo/route.ts             NEU — POST: SEO-Analyse für einen Text
lib/generation/results-store.ts                MOD — SEO-Felder in StoredTextResult
```

### OUT

```
lib/dataseo/                                   NICHT anfassen (anderer Zweck: Keyword-Recherche)
components/                                    NICHT anfassen (Sub-Slice B)
lib/export/                                    NICHT anfassen (Sub-Slice B)
```

### A1 — Deterministische SEO-Metriken

```typescript
// lib/seo/analyzer.ts
export interface SeoMetrics {
  keywordDensity: number           // Prozent (0–100)
  keywordCount: number             // Absolute Häufigkeit
  wordCount: number                // Gesamtwortzahl
  titleContainsKeyword: boolean    // Keyword im Titel?
  titleLength: number              // Zeichen
  titleLengthOk: boolean           // 50–60 Zeichen optimal
  readabilityScore?: number        // Optional: Flesch-Index (deutsch)
}

export function analyzeSeo(text: string, title: string, keyword: string): SeoMetrics {
  // Pure function — keine IO, kein async
  // Keyword-Dichte: (keywordCount / wordCount) * 100
  // Title-Check: keyword.toLowerCase() in title.toLowerCase()
  // Title-Länge: 50–60 Zeichen = optimal
}
```

### A2 — KI-basierte Meta-Description

```typescript
// lib/seo/meta-generator.ts
import { withRetry } from '@/lib/utils/retry'
import { callAI } from '@/lib/ai/client'
import { logger } from '@/lib/utils/logger'

export async function generateMetaDescription(
  title: string,
  text: string,
  keyword: string,
  projectId?: string
): Promise<string> {
  // 1. Prompt aus prompts/seo-analysis.yaml laden
  // 2. KI-Call via callAI() mit withRetry
  // 3. CostEntry schreiben (step: 'seo_analysis', projectId)
  // 4. Return: 150–160 Zeichen Meta-Description
  return withRetry(async () => {
    // ...AI call...
  }, 'seo.generateMetaDescription')
}
```

### A3 — prompts/seo-analysis.yaml

```yaml
# prompts/seo-analysis.yaml
system: |
  Du bist ein SEO-Experte für medizinische Fachpraxen im DACH-Raum.
  Deine Aufgabe: Generiere eine Meta-Description für einen Blog-Artikel.
  
  Regeln:
  - Exakt 150–160 Zeichen
  - Enthält das Hauptkeyword natürlich eingebunden
  - Call-to-Action am Ende (z.B. "Jetzt informieren", "Termin vereinbaren")
  - Patientenfreundliche Sprache (kein Fachjargon)
  - HWG-konform: keine Heilversprechen, keine Vorher/Nachher-Vergleiche

user: |
  **Artikel-Titel:** {{title}}
  **Hauptkeyword:** {{keyword}}
  **Artikel-Zusammenfassung (erste 500 Zeichen):**
  {{textPreview}}
  
  Generiere eine Meta-Description (150–160 Zeichen):
```

### A4 — API-Route

```typescript
// POST /api/projects/[id]/seo
// Body: { index: number }  — welcher Text im textResults-Array
// Auth-Check + Ownership-Check
// 1. Text + Titel + Keyword aus Projekt laden
// 2. analyzeSeo() für deterministische Metriken
// 3. generateMetaDescription() für KI-Vorschlag
// 4. Ergebnis in StoredTextResult[index].seo speichern
// Response: { metrics: SeoMetrics, metaDescription: string }
```

### A5 — StoredTextResult erweitern

```typescript
// In lib/generation/results-store.ts:
seo?: {
  keywordDensity: number
  keywordCount: number
  wordCount: number
  titleContainsKeyword: boolean
  titleLength: number
  titleLengthOk: boolean
  metaDescription: string      // KI-generiert
  analyzedAt: string           // ISO-Datum
}
```

### Acceptance Checklist

- [ ] `analyzeSeo('text mit keyword keyword', 'Titel mit Keyword', 'Keyword')` → keywordDensity > 0
- [ ] Meta-Description ist 150–160 Zeichen
- [ ] CostEntry mit step='seo_analysis' in DB nach KI-Call
- [ ] POST `/api/projects/[id]/seo` → 200 mit `metrics` + `metaDescription`
- [ ] Unautorisierter Zugriff → 401
- [ ] Fremdes Projekt → 403
- [ ] Prompt-Text ausschließlich in `prompts/seo-analysis.yaml`
- [ ] TypeScript: 0 Fehler
- [ ] Unit-Test für `analyzeSeo()` pure function

### Commit-Message

```
feat(seo): SEO-Analyse-Engine + Meta-Description-Generator + API-Route (Slice 14 Sub-A)
```

---

## Sub-Slice B — SEO-Anzeige in Ergebnisansicht + Export

**Aufwand:** ~4–5 Stunden  
**Scope:** SEO-Score-Karte pro Blog-Artikel, "Analysieren"-Button, Meta-Description in Export.

### IN

```
components/results/SeoScoreCard.tsx            NEU — SEO-Metriken-Anzeige
app/(dashboard)/projects/[id]/page.tsx         MOD — SeoScoreCard in Blog-Ergebnisse
lib/export/docx.ts                             MOD — Meta-Description in DOCX-Export
```

### OUT

```
lib/seo/                                       NICHT anfassen (Sub-Slice A)
prompts/                                       NICHT anfassen (Sub-Slice A)
```

### B1 — SeoScoreCard-Komponente

```typescript
// components/results/SeoScoreCard.tsx
'use client'

// Props: { projectId, index, seoData?: StoredTextResult['seo'] }
// States:
//   - kein seoData: Button "SEO analysieren" → POST /api/projects/[id]/seo
//   - loading: Spinner + "[INFO] SEO wird analysiert..."
//   - seoData vorhanden: Ampel-Anzeige
//
// Ampel-Logik:
//   - Keyword-Dichte 1–3%: grün | <1% oder >3%: gelb | >5%: rot (Keyword-Stuffing)
//   - Title enthält Keyword: grün | fehlt: rot
//   - Title-Länge 50–60: grün | <50 oder >60: gelb
//   - Meta-Description: anzeigen + Copy-Button
//
// "Erneut analysieren"-Button → überschreibt vorherige Analyse
```

### B2 — Integration in Ergebnisansicht

```typescript
// Nur für kanal === 'BLOG' anzeigen (Newsletter/Social brauchen keine SEO)
// Unterhalb des Text-Editors / der Text-Vorschau
// Collapsible: "SEO-Analyse ▼" (standardmässig eingeklappt wenn vorhanden)
```

### B3 — Meta-Description im DOCX-Export

```typescript
// In lib/export/docx.ts:
// Wenn seo.metaDescription vorhanden → eigener Abschnitt im DOCX:
// Überschrift: "Meta-Description (SEO)"
// Text: die generierte Meta-Description
// Hinweis: "Keyword-Dichte: X% | Title-Länge: Y Zeichen"
```

### Acceptance Checklist

- [ ] Blog-Artikel ohne SEO-Daten → "SEO analysieren"-Button sichtbar
- [ ] Klick → Analyse läuft → Ampel-Anzeige erscheint
- [ ] Keyword-Dichte 2% → grüne Anzeige
- [ ] Title ohne Keyword → rote Warnung
- [ ] Meta-Description mit Copy-Button
- [ ] DOCX-Export enthält Meta-Description-Abschnitt (wenn analysiert)
- [ ] Newsletter/Social-Texte zeigen KEINE SEO-Karte
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(seo): SEO-Score-Karte in Ergebnisansicht + DOCX-Export (Slice 14 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# SEO-Modul vorhanden
Get-ChildItem lib/seo -Name
# → analyzer.ts, meta-generator.ts (mindestens)

# Prompt in YAML, nicht im Code
Select-String "Meta-Description\|SEO-Experte" lib,app -Recurse -i |
  Where-Object { $_.Path -notmatch "\.yaml$" }
# → Zero Treffer (Prompt-Text nur in YAML)

# withRetry auf KI-Call
Select-String "withRetry" lib/seo/meta-generator.ts
# → Mindestens 1 Treffer

# CostEntry wird geschrieben
Select-String "seo_analysis\|step.*seo" lib/seo -Recurse -i
# → Mindestens 1 Treffer

# Kein stiller Catch
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" lib/seo -Recurse
# → Zero Treffer

# Unit-Test für analyzeSeo
Select-String "analyzeSeo" __tests__ -Recurse -i
# → Mindestens 1 Treffer

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Automatische SEO-Analyse bei Generierung (Pipeline-Hook) | Erst manuell on-demand — Phase 4b |
| Bulk-SEO-Analyse aller Texte | On-demand pro Artikel — Bulk später |
| SEO-Score als Quality-Gate (blockiert Export) | Nur informativ — kein Blocker |
| Readability-Score (Flesch-Index deutsch) | Nice-to-have, optional in analyzer.ts vorbereiten |
| Konkurrenz-Analyse / SERP-Check | Erfordert DataForSEO-Credits — separater Slice |
| Title-Tag-Rewrite durch KI | Nur Analyse + Warnung — kein automatisches Umschreiben |

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich seit 2026-05-15.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR ein Commit vorgeschlagen
> oder ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md`: Slice 14 auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint P4-A)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: ggf. SEO-bezogene Punkte |
| 3 | Sprint-Prompt archivieren | `Move-Item docs/dev-prompts/sprint-p4a-seo.md docs/dev-prompts/archive/` |
| 4 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]` |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P4-A ABSCHLUSSBERICHT
==============================

Sprint: P4-A — SEO-Analyse (Slice 14)

SUB-SLICES:
  A SEO-Engine + Meta-Generator + API:         [ ] DONE — Commit: <hash>
  B SEO-Score-Karte + DOCX-Export:             [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  Unit-Test analyzeSeo:            [ ]
  withRetry auf KI-Call:           [ ]
  Prompt nur in YAML:              [ ]
  CostEntry für SEO:              [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P4-A ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P4-B (Bildbriefing erweitert — Slice 15)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p4a-seo.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
