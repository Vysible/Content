# Sprint Fix-A — Code Cleanup: JSON.parse-Muster + Dashboard Footer + Docs

**Projekt:** Vysible  
**Sprint:** Fix-A  
**Format:** Tier 1 (alle Änderungen präzise bekannt, kein Exploration-Risiko)  
**Abhängigkeit:** Keiner — läuft unabhängig von Phase-4-Sprints  
**Scope:** Code-Audit 2026-05-16 — F-020, Backlog #10, Backlog #8 (partial), OpenActions-Bereinigung  
**Geschätzte Dauer:** ~1.5 Stunden

> **Hintergrund:**  
> Code-Audit vom 2026-05-16 hat drei rein technische Schulden identifiziert,
> die keine funktionalen Änderungen erfordern und sofort adressierbar sind:
>
> 1. `JSON.parse(JSON.stringify(...))` als Prisma-Json-Serialisierungsmuster (F-020)
> 2. `lib/ai/client.ts` fehlt `// forge-scan`-Kommentar (Backlog #10 — verhindert false-positive CI-Warnung)
> 3. `app/(dashboard)/layout.tsx` hat keinen Footer mit Impressum/Datenschutz-Links (Backlog #8 partial)
> 4. `docs/dev-prompts/OpenActions.md` enthält mehrere veraltete Einträge die im Code bereits geschlossen sind

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus.  
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.  
Bei GO: Exploration starten.

```powershell
# Check A — Working Tree (muss clean sein)
git status --porcelain

# Check B — TypeScript (0 Fehler Pflicht)
node node_modules/typescript/bin/tsc --noEmit

# Check C — Kein aktiver Sprint blockiert
Select-String "Fix-A" docs/roadmap.md -i

# Check D — CHANGELOG hat [Unreleased]-Sektion
Select-String "\[Unreleased\]" CHANGELOG.md

# Check E — Tests
pnpm test --run
```

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Exakte JSON.parse-Vorkommen in lib/generation/ bestätigen
Select-String "JSON\.parse\(JSON\.stringify" lib/generation/pipeline.ts, lib/generation/job-store.ts -n

# 2. Prisma-Import-Status in pipeline.ts prüfen (brauchen wir neuen Import?)
Select-String "from '@prisma/client'" lib/generation/pipeline.ts

# 3. Prisma-Import-Status in job-store.ts bestätigen (Prisma bereits importiert)
Select-String "from '@prisma/client'" lib/generation/job-store.ts

# 4. forge-scan Kommentar: Besteht bereits?
Select-String "forge-scan" lib/ai/client.ts

# 5. Dashboard-Footer vorhanden?
Select-String "impressum|footer|datenschutz" app/(dashboard)/layout.tsx -i

# 6. OpenActions.md — Einträge die laut Code bereits geschlossen sind
Select-String "TemplateSelector|F-010|META/LINKEDIN|Backlog #9" docs/dev-prompts/OpenActions.md
```

**Bekannte Änderungen (Stand 2026-05-16, Code-Audit bestätigt):**

| Datei | Änderung | Zeile(n) |
|---|---|---|
| `lib/generation/pipeline.ts` | `JSON.parse(JSON.stringify(result))` → Prisma-Cast | 84 |
| `lib/generation/pipeline.ts` | `JSON.parse(JSON.stringify(themes))` → Prisma-Cast | 169 |
| `lib/generation/pipeline.ts` | `JSON.parse(JSON.stringify(textResults))` → Prisma-Cast | 231 |
| `lib/generation/job-store.ts` | `JSON.parse(JSON.stringify(events))` → Prisma-Cast | 117, 159 |
| `lib/ai/client.ts` | forge-scan Kommentar ergänzen | nach JSDoc |
| `app/(dashboard)/layout.tsx` | Footer mit Impressum + Datenschutz einfügen | EOF |
| `docs/dev-prompts/OpenActions.md` | Stale Einträge als ✅ markieren | mehrere |

---

## CRITICAL: Self-review Checklist

- [ ] Kein `JSON.parse(JSON.stringify(...))` mehr in `lib/generation/pipeline.ts` — `Select-String` → 0 Treffer
- [ ] Kein `JSON.parse(JSON.stringify(...))` mehr in `lib/generation/job-store.ts` — `Select-String` → 0 Treffer
- [ ] `import { Prisma } from '@prisma/client'` in `pipeline.ts` vorhanden (falls neu hinzugefügt)
- [ ] `lib/ai/client.ts` hat `// forge-scan: factory-only, no external calls` Kommentar
- [ ] Dashboard-Layout-Footer enthält klickbare Links zu `/impressum` und `/datenschutz`
- [ ] Keine `'use client'`-Direktive nötig für Footer-Ergänzung (Server Component bleibt Server Component)
- [ ] TypeScript: 0 Fehler nach allen Änderungen (`tsc --noEmit`)
- [ ] `CHANGELOG.md` unter `[Unreleased]` aktualisiert
- [ ] `docs/dev-prompts/OpenActions.md` — keine fälschlich offenen Einträge mehr

---

## Sub-Slice A — JSON.parse(JSON.stringify) durch Prisma-Cast ersetzen

**Aufwand:** ~30 Minuten  
**Scope:** F-020: Das `JSON.parse(JSON.stringify(...))` Anti-Pattern in `lib/generation/` durch typsicheres Prisma-Casting ersetzen. Kein funktionaler Unterschied — Prisma serialisiert Json-Felder intern bereits korrekt.

### IN (zu ändern)

- `lib/generation/pipeline.ts`
- `lib/generation/job-store.ts`

### OUT (nicht anfassen)

- Alle anderen Dateien
- Keine Logik-Änderungen, nur Cast-Syntax

### Implementierungsdetail

**`lib/generation/pipeline.ts`** — Import ergänzen (nur wenn noch nicht vorhanden):

```typescript
import { Prisma } from '@prisma/client'
```

Dann drei Stellen ersetzen:

```typescript
// Zeile ~84 (case 'scrape_done'):
// ALT:
data: { scrapedData: JSON.parse(JSON.stringify(result)) },
// NEU:
data: { scrapedData: result as unknown as Prisma.InputJsonValue },

// Zeile ~169 (case 'themes_done'):
// ALT:
data: { themeResults: JSON.parse(JSON.stringify(themes)) },
// NEU:
data: { themeResults: themes as unknown as Prisma.InputJsonValue },

// Zeile ~231 (case 'texts_done'):
// ALT:
textResults: JSON.parse(JSON.stringify(textResults)),
// NEU:
textResults: textResults as unknown as Prisma.InputJsonValue,
```

**`lib/generation/job-store.ts`** — Prisma ist bereits importiert. Zwei Stellen:

```typescript
// Zeile ~117 (emitEvent):
// ALT:
const serializedEvents = JSON.parse(JSON.stringify(events)) as Prisma.InputJsonValue
// NEU:
const serializedEvents = events as unknown as Prisma.InputJsonValue

// Zeile ~159 (resetForRetry):
// ALT:
events: JSON.parse(JSON.stringify(events)),
// NEU:
events: events as unknown as Prisma.InputJsonValue,
```

### Acceptance Checklist

- [ ] `Select-String "JSON\.parse\(JSON\.stringify" lib/generation/pipeline.ts` → 0 Treffer
- [ ] `Select-String "JSON\.parse\(JSON\.stringify" lib/generation/job-store.ts` → 0 Treffer
- [ ] `tsc --noEmit` → 0 Fehler
- [ ] `import { Prisma } from '@prisma/client'` in pipeline.ts vorhanden

### Commit-Message

```
refactor(generation): Prisma Json-Cast statt JSON.parse(JSON.stringify) (F-020)
```

---

## Sub-Slice B — Dashboard Footer + forge-scan Kommentar + OpenActions-Bereinigung

**Aufwand:** ~45 Minuten  
**Scope:** Drei kleine Dokumentations/UI-Fixes ohne funktionale Risiken.

### IN (zu ändern)

- `app/(dashboard)/layout.tsx` — Footer mit Rechtspflicht-Links
- `lib/ai/client.ts` — forge-scan Kommentar
- `docs/dev-prompts/OpenActions.md` — Veraltete Einträge bereinigen

### OUT (nicht anfassen)

- Keine Styling-Änderungen an bestehenden Layout-Bereichen
- Sidebar-Komponente unverändert
- Keine neuen Routen

### Änderung 1: Dashboard Footer

`app/(dashboard)/layout.tsx` — Footer-Block unterhalb `{children}` einfügen:

```tsx
// Im <div className="p-6 max-w-6xl mx-auto"> Block, nach {children}:
<footer className="mt-12 pt-4 border-t border-stone flex items-center justify-center gap-4">
  <a href="/impressum" className="text-xs text-stahlgrau hover:text-cognac transition">
    Impressum
  </a>
  <span className="text-stone text-xs">·</span>
  <a href="/datenschutz" className="text-xs text-stahlgrau hover:text-cognac transition">
    Datenschutz
  </a>
</footer>
```

> Hinweis: `<a>` statt `<Link>` ist hier korrekt — `/impressum` und `/datenschutz` sind
> ausserhalb der `(dashboard)`-Route-Gruppe, next/link würde einen Layout-Wechsel auslösen.

### Änderung 2: forge-scan Kommentar in lib/ai/client.ts

Bestehenden JSDoc-Kommentar der ersten Funktion um forge-scan Hinweis ergänzen:

```typescript
/**
 * Gibt einen Anthropic-Client zurück.
 * Bei projectApiKeyId: sucht zuerst den projektspezifischen Key (FA-F-11a),
 * fällt auf den globalen Default-Key zurück wenn nicht vorhanden.
 * @forge-scan factory-only — macht keine externen Calls, gibt nur Client-Instanz zurück.
 * Externe AI-Calls sind in lib/generation/themes.ts und lib/generation/texts.ts (withRetry gesichert).
 */
```

### Änderung 3: OpenActions.md bereinigen

Folgende Einträge markieren (Code-Audit 2026-05-16 bestätigt alle als geschlossen):

1. **Backlog #1**: `components/wizard/TemplateSelector.tsx:23` — Zeile ohne ✅ → `~~components/wizard/TemplateSelector.tsx:23~~ **✅ Geschlossen (Sprint P3-G)**`
2. **Backlog #9**: Prisma-Migration META/LINKEDIN — META/LINKEDIN sind bereits im Provider-Enum. Eintrag als ✅ markieren + Hinweis dass Schema-Seite erledigt, Prod-DB-Anwendung manuell nötig.
3. Die "noch 2 offen"-Aussage in Backlog #1 auf "noch 0 offen" aktualisieren (TemplateSelector war der letzte).

### Acceptance Checklist

- [ ] Dashboard zeigt Footer mit `/impressum` und `/datenschutz` Links (visuell prüfen oder HTML-Grep)
- [ ] `Select-String "forge-scan" lib/ai/client.ts` → Treffer
- [ ] `OpenActions.md`: `TemplateSelector.tsx:23` als ✅ markiert
- [ ] `OpenActions.md`: kein Entry mehr der als offen gilt, aber im Code geschlossen ist
- [ ] `tsc --noEmit` → 0 Fehler (kein TSX-Fehler durch Footer)

### Commit-Message

```
docs(dashboard): Impressum/Datenschutz Footer + forge-scan Kommentar + OpenActions bereinigt (Backlog #8/#10)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# 1. Keine JSON.parse(JSON.stringify) mehr in generation/
Select-String "JSON\.parse\(JSON\.stringify" lib/generation/pipeline.ts, lib/generation/job-store.ts
# → Erwartung: 0 Treffer

# 2. TypeScript sauber
node node_modules/typescript/bin/tsc --noEmit
# → Erwartung: 0 Fehler

# 3. forge-scan Kommentar vorhanden
Select-String "forge-scan" lib/ai/client.ts
# → Erwartung: 1 Treffer

# 4. Dashboard Footer vorhanden
Select-String "impressum" app/(dashboard)/layout.tsx -i
# → Erwartung: 1 Treffer

# 5. Tests laufen durch
pnpm test --run
# → Erwartung: alle grün

# 6. CHANGELOG aktualisiert
Select-String "\[Unreleased\]" CHANGELOG.md
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| ESLint-Config erweitern (F-016) | Scope: P4-C NFA-Härtung |
| In-Memory Rate-Limiter → Redis | Keine Prod-Blockierung, Single-Tenant |
| Browser-tauglicher Logger | Separater Sprint nach P4 |
| Themen-Quality-Gate Magic Numbers | Sprint Fix-B |
| KT-Status in StoredTextResult | Gehört zu KlickTipp-Feature |
| JSON.parse in anderen Dateien (salvageTruncatedArray etc.) | Dort ist es Logik, kein Serialisierungshack |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT FIX-A ABSCHLUSSBERICHT
═══════════════════════════════════════════════
Datum: [DATUM]
Agent: [AGENT]

Sub-Slice A — JSON.parse-Muster:
  pipeline.ts: [N] Ersetzungen
  job-store.ts: [N] Ersetzungen
  Prisma-Import pipeline.ts: [hinzugefügt | bereits vorhanden]

Sub-Slice B — Docs + Footer:
  Dashboard-Footer: [hinzugefügt | bereits vorhanden]
  forge-scan Kommentar: [hinzugefügt | bereits vorhanden]
  OpenActions bereinigt: [N] Einträge aktualisiert

TypeScript: [0 Fehler | Fehler: ...]
Tests: [PASS | FAIL: ...]

[OK] Fix-A ABGESCHLOSSEN
▶ Nächste Priorität: Sprint Fix-B (Themen-Quality-Gate Refactor)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-fix-a-codecleanup.md docs/dev-prompts/archive/
```
