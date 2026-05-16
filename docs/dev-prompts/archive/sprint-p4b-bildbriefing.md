# Sprint P4-B — Bildbriefing erweitert (Slice 15)

**Projekt:** Vysible  
**Sprint:** P4-B  
**Format:** Tier 2 (Basis-Bildbriefing existiert, Erweiterung + DOCX-Export)  
**Abhängigkeit:** Sprint P4-A ✅  
**Anforderungen:** plan.md Slice 15  
**Geschätzte Dauer:** ~1.5 Tage

> **Ziel:** Das bestehende Bildbriefing (Motiv, Stil, Farbwelt, Textoverlay, Canva-Asset)  
> erweitern um: DOCX-Export, Stock-Suchbegriffe, HWG §11-Pflichtprüfung,  
> optionalen DALL-E 3 Prompt (nicht-patientenbezogene Motive), und  
> Unsplash-API-Suchlinks bei HWG-heiklen Motiven.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus
(Phase 0 — PSR + Phase 1 — technische Gates).
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.
Bei GO: Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Bestehendes Bildbriefing: Schema
Get-Content lib/generation/texts-schema.ts -ErrorAction SilentlyContinue

# 2. Bestehendes Bildbriefing: Generierung
Select-String "generateImageBrief\|image-brief" lib/generation/texts.ts -A 5

# 3. Prompt: image-brief.yaml
Get-Content prompts/image-brief.yaml -ErrorAction SilentlyContinue

# 4. Export: DOCX-Modul
Get-Content lib/export/docx.ts -ErrorAction SilentlyContinue | Select-Object -First 60

# 5. HWG-Compliance-Gate (Sprint 1): wie wird hwgFlag geprüft?
Select-String "hwgFlag\|hwg" lib/generation,lib/compliance -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 15

# 6. Canva-Asset-Kontext: wie werden Assets derzeit referenziert?
Select-String "canvaAsset\|canva.*asset" lib -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 7. TextResult: wo wird imageBrief gespeichert?
Select-String "imageBrief" lib/generation -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 8. Unsplash-API: bereits im Projekt?
Select-String "unsplash" lib,app,config -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 5

# 9. DALL-E / OpenAI Image: bereits genutzt?
Select-String "dall-e\|dalle\|image.*generation\|openai.*image" lib -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 5

# 10. Provider-Enum: OPENAI vorhanden?
Select-String "OPENAI" prisma/schema.prisma
```

**Bekannte Lücken (Stand Mai 2026, aus plan.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `ImageBriefSchema` | Fehlende Felder: stockSuchbegriffe, dallePrompt, unsplashLinks | MUSS |
| `prompts/image-brief.yaml` | Prompt kennt keine Stock-Suchbegriffe / DALL-E / Unsplash | MUSS |
| `lib/export/docx.ts` | Bildbriefing-DOCX-Export fehlend | MUSS |
| HWG §11-Pflichtprüfung | Kein automatischer Check auf Bildbriefing-Ebene | MUSS |
| Unsplash-API-Integration | Fehlend | MUSS |
| DALL-E 3 Prompt-Generierung | Fehlend (optional, nur für nicht-patientenbezogene Motive) | SOLL |

---

## CRITICAL: Self-review Checklist

- [ ] `ImageBriefSchema` erweitert (abwärtskompatibel — neue Felder optional)
- [ ] `prompts/image-brief.yaml` aktualisiert mit Stock + DALL-E + Unsplash-Logik
- [ ] Kein Prompt-Text im TypeScript-Code
- [ ] HWG §11: Bei `hwgFlag: 'rot'` → DALL-E-Prompt unterdrückt + Unsplash-Links stattdessen
- [ ] DOCX-Export: Bildbriefing als eigenes Kapitel im Gesamt-Export
- [ ] `withRetry` auf Unsplash-API-Call
- [ ] CostEntry für DALL-E-Prompt-Generierung (step: 'image-brief-extended')
- [ ] Kein stiller Catch
- [ ] Kein API-Key (Unsplash) im Code — nur via `process.env`
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — Schema-Erweiterung + Prompt-Update + HWG-Prüfung

**Aufwand:** ~5–6 Stunden  
**Scope:** ImageBrief-Schema erweitern, Prompt aktualisieren, HWG-Logik für Bildbriefing.

### IN

```
lib/generation/texts-schema.ts                 MOD — ImageBriefSchema erweitern
prompts/image-brief.yaml                       MOD — Stock + DALL-E + Unsplash-Logik
lib/generation/texts.ts                        MOD — generateImageBrief erweitern
lib/unsplash/client.ts                         NEU — Unsplash-API-Client
app/api/unsplash/search/route.ts               NEU — Proxy-Route für Client-Suche
```

### OUT

```
lib/export/                                    NICHT anfassen (Sub-Slice B)
components/                                    NICHT anfassen (Sub-Slice B)
```

### A1 — ImageBriefSchema erweitern

```typescript
// lib/generation/texts-schema.ts
export const ImageBriefSchema = z.object({
  motiv: z.string(),
  stil: z.string(),
  farbwelt: z.string(),
  textoverlay: z.string(),
  canvaAssetEmpfehlung: z.string(),
  hwgHinweis: z.string(),
  // NEU:
  stockSuchbegriffe: z.array(z.string()).default([]),       // 3–5 Stock-Keywords
  dallePrompt: z.string().optional(),                       // Nur bei hwgFlag !== 'rot'
  unsplashLinks: z.array(z.string()).default([]),           // Bei hwgFlag === 'rot'/'gelb'
  hwgParagraph11Check: z.boolean().default(false),          // Prüfung durchgeführt?
})
```

### A2 — prompts/image-brief.yaml erweitern

```yaml
system: |
  Du erstellst erweiterte Bildbriefings für Arzt- und Zahnarztpraxen.
  Ausgabe als JSON mit den Feldern:
    motiv, stil, farbwelt, textoverlay, canvaAssetEmpfehlung, hwgHinweis,
    stockSuchbegriffe, dallePrompt, hwgParagraph11Check

  Regeln:
  - Keine Patientenfotos ohne explizite Einwilligung empfehlen
  - stockSuchbegriffe: 3–5 englische Suchbegriffe für Stock-Portale (Shutterstock, iStock)
  - Bei HWG-Flag "rot" oder "gelb":
    - dallePrompt: LEER lassen (keine KI-generierten Bilder bei HWG-heiklem Inhalt)
    - hwgParagraph11Check: true
    - hwgHinweis: Erklärung warum Patientenbilder/Vorher-Nachher nicht erlaubt
  - Bei HWG-Flag "gruen":
    - dallePrompt: Detaillierter DALL-E 3 Prompt (abstrakt, keine Personen, keine Heilversprechen)
    - hwgParagraph11Check: false
  - Textoverlay: max. 5 Wörter, kein Heilsversprechen
  - Canva-Asset-Empfehlung: Verweis auf passende Ordner/Kategorien

user: |
  Thema: {{thema}}
  Praxis: {{praxisName}}
  Kanal: {{kanal}}
  HWG-Flag: {{hwgFlag}}
  Canva-Ordner: {{canvaOrdner}}
  Fachgebiet: {{fachgebiet}}
  Keywords: {{keywords}}
```

### A3 — Unsplash-Client

```typescript
// lib/unsplash/client.ts
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const UNSPLASH_BASE = 'https://api.unsplash.com'

export async function searchUnsplash(query: string, count = 5): Promise<string[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    logger.warn('[Vysible] UNSPLASH_ACCESS_KEY nicht konfiguriert — keine Links generiert')
    return []
  }

  return withRetry(async () => {
    const res = await fetch(
      `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    )
    if (!res.ok) throw new Error(`Unsplash API ${res.status}`)
    const data = await res.json()
    return data.results.map((r: { urls: { regular: string } }) => r.urls.regular)
  }, 'unsplash.search')
}
```

### A4 — generateImageBrief erweitern

```typescript
// In lib/generation/texts.ts → generateImageBrief():
// Nach KI-Call:
// 1. Wenn hwgFlag === 'rot' oder 'gelb' → searchUnsplash(stockSuchbegriffe) → unsplashLinks setzen
// 2. Wenn hwgFlag === 'rot' → dallePrompt auf '' setzen (Sicherheit: auch wenn KI es füllt)
// 3. CostEntry: step = 'image-brief' (besteht bereits)
```

### Acceptance Checklist

- [ ] `ImageBriefSchema` hat neue Felder (abwärtskompatibel mit `.default([])`)
- [ ] KI-Output enthält `stockSuchbegriffe` (3–5 Einträge)
- [ ] HWG-Flag 'rot' → kein `dallePrompt`, dafür `unsplashLinks`
- [ ] HWG-Flag 'gruen' → `dallePrompt` vorhanden, keine Unsplash-Links
- [ ] Unsplash-Client mit `withRetry`, kein stiller Catch
- [ ] Fehlender UNSPLASH_ACCESS_KEY → graceful degradation (leere Links)
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(image-brief): Erweiterte Bildbriefings + HWG §11 + Unsplash + DALL-E (Slice 15 Sub-A)
```

---

## Sub-Slice B — DOCX-Export + UI-Erweiterung

**Aufwand:** ~4–5 Stunden  
**Scope:** Bildbriefing als DOCX-Kapitel, erweiterte Anzeige in Ergebnisansicht.

### IN

```
lib/export/docx.ts                             MOD — Bildbriefing-Kapitel
components/results/ImageBriefCard.tsx           NEU — Erweiterte Bildbriefing-Anzeige
app/(dashboard)/projects/[id]/page.tsx         MOD — ImageBriefCard einbinden
```

### OUT

```
lib/generation/                                NICHT anfassen (Sub-Slice A)
prompts/                                       NICHT anfassen (Sub-Slice A)
lib/unsplash/                                  NICHT anfassen (Sub-Slice A)
```

### B1 — DOCX-Export: Bildbriefing-Kapitel

```typescript
// In lib/export/docx.ts:
// Neues Kapitel "Bildbriefings" nach Texten:
// Pro Thema:
//   Überschrift: "Bildbriefing: [Thema]"
//   Tabelle:
//     | Feld              | Inhalt                    |
//     |-------------------|---------------------------|
//     | Motiv             | [motiv]                   |
//     | Stil              | [stil]                    |
//     | Farbwelt          | [farbwelt]                |
//     | Textoverlay       | [textoverlay]             |
//     | Canva-Empfehlung  | [canvaAssetEmpfehlung]    |
//     | Stock-Suchbegriffe| [stockSuchbegriffe.join]  |
//     | HWG-Hinweis       | [hwgHinweis]              |
//   Wenn dallePrompt:
//     Überschrift: "DALL-E 3 Prompt"
//     Code-Block: [dallePrompt]
//   Wenn unsplashLinks:
//     Überschrift: "Unsplash-Empfehlungen"
//     Links als klickbare Hyperlinks
```

### B2 — ImageBriefCard-Komponente

```typescript
// components/results/ImageBriefCard.tsx
'use client'

// Props: { imageBrief: ImageBrief }
// Anzeige:
//   - Motiv + Stil + Farbwelt als kompakte Karte
//   - Stock-Suchbegriffe als Tags/Chips
//   - HWG-Hinweis: gelb/rot-Badge wenn hwgParagraph11Check === true
//   - DALL-E Prompt: Code-Block mit Copy-Button (nur wenn vorhanden)
//   - Unsplash-Links: Thumbnail-Vorschau (lazy-loaded) mit Link
//   - Canva-Empfehlung: Text + Link zu /settings/canva
```

### B3 — Integration in Ergebnisansicht

```typescript
// Im Tab "Bildbriefings" (Slice 5 — existiert):
// Ersetze einfache Text-Anzeige durch ImageBriefCard
// Collapsible pro Thema, erweiterte Felder sichtbar
```

### Acceptance Checklist

- [ ] DOCX-Export enthält Bildbriefing-Kapitel mit allen Feldern
- [ ] DALL-E-Prompt im DOCX als Code-Block formatiert
- [ ] Unsplash-Links im DOCX als Hyperlinks
- [ ] ImageBriefCard zeigt Stock-Suchbegriffe als Chips
- [ ] HWG-Badge sichtbar bei heiklen Motiven
- [ ] Copy-Button für DALL-E-Prompt funktional
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(image-brief): DOCX-Export + ImageBriefCard-Komponente (Slice 15 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Prompt nur in YAML
Select-String "stockSuchbegriffe\|dallePrompt\|Unsplash" lib,app -Recurse -i |
  Where-Object { $_.Path -notmatch "\.yaml$|unsplash/client|texts-schema|texts\.ts|export/docx|ImageBriefCard" }
# → Zero Treffer (nur in erlaubten Dateien)

# withRetry auf Unsplash-Call
Select-String "withRetry" lib/unsplash/client.ts
# → 1 Treffer

# Kein stiller Catch
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" lib/unsplash,lib/generation/texts.ts -Recurse
# → Zero Treffer

# HWG-Logik: dallePrompt leer bei rot
Select-String "hwgFlag.*rot\|rot.*dalle" lib/generation/texts.ts -i
# → Mindestens 1 Treffer (Guard-Logik)

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| DALL-E 3 API-Call (Bild generieren) | Nur Prompt generieren — kein Bild-Rendering |
| Unsplash-Bild-Download + Einbettung | Nur Links, kein Download in die App |
| Canva-Design aus Bildbriefing erstellen | Phase 5 — Canva Apps SDK |
| Bildrechte-Management | Manuell durch Agentur — kein Automatismus |
| A/B-Testing verschiedener Bildstile | Overkill für MVP |

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich seit 2026-05-15.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR ein Commit vorgeschlagen
> oder ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md`: Slice 15 auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint P4-B)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: ggf. Bildbriefing-Punkte |
| 3 | Sprint-Prompt archivieren | `Move-Item docs/dev-prompts/sprint-p4b-bildbriefing.md docs/dev-prompts/archive/` |
| 4 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]` |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P4-B ABSCHLUSSBERICHT
==============================

Sprint: P4-B — Bildbriefing erweitert (Slice 15)

SUB-SLICES:
  A Schema + Prompt + HWG + Unsplash:          [ ] DONE — Commit: <hash>
  B DOCX-Export + ImageBriefCard:              [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  HWG §11 korrekt:                [ ]
  DOCX-Export mit Bildbriefing:    [ ]
  withRetry auf Unsplash:          [ ]
  Prompt nur in YAML:              [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P4-B ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P4-C (NFA-Härtung)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p4b-bildbriefing.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
