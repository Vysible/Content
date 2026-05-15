# Sprint P2-D — DataForSEO Keyword-Recherche (Slice 11a)

**Projekt:** Vysible  
**Sprint:** P2-D  
**Format:** Tier 2 (Stub vorhanden, Exploration zuerst)  
**Abhängigkeit:** Sprint P2-C ✅  
**Anforderungen:** plan.md Slice 11a, NFA-06 (Retry), NFA-05 (Kosten-Logging)  
**Geschätzte Dauer:** ~1 Tag

> **Pre-Condition (extern, vor Sprint-Start manuell erledigen):**  
> DataForSEO API-Credentials müssen vorhanden sein (`DATASEO_LOGIN`, `DATASEA_PASSWORD`).  
> **Vorab-Validierung (Roadmap-Pflicht):** PAA-Endpunkt manuell für mind. 3 reale  
> Praxis-URLs testen (z.B. `zahnzentrum-warendorf.de`) — Response-Struktur prüfen,  
> Kosten pro Call verifizieren. Ohne bestätigte API-Response-Struktur sind  
> Response-Parser nicht zuverlässig implementierbar.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap: Vorgänger P2-C abgeschlossen?
Select-String "P2-C.*✅|Sprint P2-C.*✅" docs/roadmap.md -i

# Check D — CHANGELOG
Select-String "\[Unreleased\]" CHANGELOG.md

# Check E — Tests
pnpm test --run
```

Bei **Hard-FAIL (A, B oder E):** STOP.  
Bei **5/5 PASS:** Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# Ist-Stand DataForSEO-Stub
Get-ChildItem lib/dataseo -Recurse -Name -ErrorAction SilentlyContinue
Get-Content lib/dataseo/client.ts -ErrorAction SilentlyContinue

# Bestehende API-Route
Get-ChildItem app/api/dataseo -Recurse -Name -ErrorAction SilentlyContinue

# KeywordReview-Komponente vorhanden?
Get-ChildItem components/wizard -Recurse -Name | Select-String "keyword|dataseo" -i

# Wie wird DataForSEO-Key aus dem API-Key-Manager gelesen?
Select-String "dataseo|DataForSEO" lib -Recurse -i -ErrorAction SilentlyContinue |
  Select-Object Path, LineNumber, Line | Select-Object -First 15

# Wie sieht der bestehende withRetry-Wrapper aus?
Get-Content lib/utils/retry.ts

# CostEntry-Struktur und trackCost-Signatur
Select-String "trackCost\|function trackCost" lib/costs/tracker.ts

# API-Key-Provider-Struktur (wie werden Provider-Keys geladen?)
Select-String "getApiKey\|findFirst.*provider\|ApiKey.*provider" lib,app/api -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# Wizard Step 3 — wo sitzt der DataForSEO-Einstiegspunkt?
Select-String "dataseo\|KeywordReview\|keyword.*recherche" app/(dashboard) -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10
```

**Bekannte Lücken (Stand Mai 2026, aus Roadmap + plan.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/dataseo/client.ts` | Stub — kein echter API-Call | MUSS |
| `app/api/dataseo/keywords/route.ts` | Existiert nicht | MUSS |
| `components/wizard/KeywordReview.tsx` | Existiert nicht | MUSS |
| Wizard Step 3 | DataForSEO-Abfrage-Button nicht verdrahtet | MUSS |
| `lib/costs/tracker.ts` | CostEntry mit step='dataseo' noch nicht genutzt | MUSS |

---

## CRITICAL: Self-review Checklist

- [ ] Kein DataForSEO-Credential im Code — ausschliesslich via `ApiKey`-Modell + AES-256-Decrypt
- [ ] `withRetry` aus `lib/utils/retry.ts` auf alle DataForSEO HTTP-Calls angewendet
- [ ] `trackCost` nach jedem DataForSEO-Call aufgerufen (step='dataseo', costEur aus API-Response)
- [ ] Keine stillen Catches — `catch (exc: unknown) { logger.warn(...) }`
- [ ] Logger: `logger.*` in Server-Code, `console.warn/error('[Vysible] …')` in Client-Components
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — DataForSEO Client + API-Route

**Aufwand:** ~4–5 Stunden  
**Scope:** Echter API-Call mit Retry, PAA-Abfrage, CostEntry-Logging.

### IN

```
lib/dataseo/client.ts                     MOD — echte Implementierung (Stub ersetzen)
app/api/dataseo/keywords/route.ts         NEU — POST-Endpunkt für Wizard
```

### OUT

```
lib/crypto/aes.ts                         NICHT anfassen
lib/costs/tracker.ts                      NICHT anfassen (nur aufrufen)
prisma/schema.prisma                      NICHT anfassen
components/                              NICHT anfassen (Sub-Slice B)
```

### A1 — DataForSEO Client

DataForSEO nutzt HTTP Basic Auth (Base64 `login:password`) und bietet Live-Endpoints
(synchrone Antworten < 10s). Exploration zeigt die genaue Response-Struktur — Parser
entsprechend anpassen.

```typescript
// lib/dataseo/client.ts
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { trackCost } from '../costs/tracker';

const DATASEO_BASE = 'https://api.dataforseo.com/v3';

// Typen nach Vorab-Validierung der tatsächlichen Response verfeinern
export interface DataForSeoKeyword {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
}

export interface DataForSeoPaa {
  questions: string[];
}

interface DataForSeoTaskResult {
  items?: Array<{
    keyword?: string;
    search_volume?: number;
    cpc?: number;
    items?: Array<{ title?: string; type?: string }>;
  }>;
}

interface DataForSeoResponse {
  cost?: number;
  tasks?: Array<{ result?: DataForSeoTaskResult[] }>;
  status_code?: number;
  status_message?: string;
}

export async function fetchKeywordsForKeywords(
  keywords: string[],
  location: string,
  projectId: string,
  authHeader: string,
): Promise<DataForSeoKeyword[]> {
  return withRetry(
    async () => {
      const response = await fetch(
        `${DATASEO_BASE}/keywords_data/google_ads/keywords_for_keywords/live`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{
            keywords,
            language_code: 'de',
            location_name: location || 'Germany',
          }]),
        },
      );

      if (!response.ok) {
        throw new Error(`DataForSEO HTTP ${response.status}`);
      }

      const data = await response.json() as DataForSeoResponse;

      // Kosten aus API-Response erfassen (DataForSEO gibt cost in USD zurück)
      const costUsd = data.cost ?? 0;
      if (costUsd > 0) {
        await trackCost({
          projectId,
          model: 'dataseo',
          inputTokens: 0,
          outputTokens: 0,
          // DataForSEO rechnet in USD — Umrechnung ~0,92 EUR/USD (aus config/model-prices.ts pflegen)
          costEur: costUsd * 0.92,
          step: 'dataseo',
        });
      }

      return parseKeywordsForKeywords(data);
    },
    'dataseo.keywords_for_keywords',
  );
}

export async function fetchPaaQuestions(
  keyword: string,
  location: string,
  projectId: string,
  authHeader: string,
): Promise<string[]> {
  return withRetry(
    async () => {
      const response = await fetch(
        `${DATASEO_BASE}/serp/google/organic/live/advanced`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{
            keyword,
            language_code: 'de',
            location_name: location || 'Germany',
            depth: 10,
          }]),
        },
      );

      if (!response.ok) {
        throw new Error(`DataForSEO PAA HTTP ${response.status}`);
      }

      const data = await response.json() as DataForSeoResponse;

      const costUsd = data.cost ?? 0;
      if (costUsd > 0) {
        await trackCost({
          projectId,
          model: 'dataseo',
          inputTokens: 0,
          outputTokens: 0,
          costEur: costUsd * 0.92,
          step: 'dataseo',
        });
      }

      return parsePaaFromSerp(data);
    },
    'dataseo.serp_paa',
  );
}

// Parser — nach Vorab-Validierung an tatsächliche Response-Struktur anpassen
function parseKeywordsForKeywords(data: DataForSeoResponse): DataForSeoKeyword[] {
  const result = data.tasks?.[0]?.result?.[0]?.items ?? [];
  return result.map(item => ({
    keyword: item.keyword ?? '',
    searchVolume: item.search_volume ?? null,
    cpc: item.cpc ?? null,
  })).filter(k => k.keyword);
}

function parsePaaFromSerp(data: DataForSeoResponse): string[] {
  const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
  return items
    .filter(item => item.type === 'people_also_ask')
    .flatMap(item => item.items?.map(q => q.title ?? '').filter(Boolean) ?? [])
    .slice(0, 10);
}
```

> **Wichtig:** Die `parse*`-Funktionen müssen nach der Vorab-Validierung an die tatsächliche
> Response-Struktur angepasst werden. Die Exploration-Phase zeigt den aktuellen Stub —
> die Typen dort als Ausgangsbasis nutzen.

### A2 — API-Route

```typescript
// app/api/dataseo/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { fetchKeywordsForKeywords, fetchPaaQuestions } from '@/lib/dataseo/client';
import { decrypt } from '@/lib/crypto/aes';
import { db } from '@/lib/db';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json() as {
      keywords: string[];
      location: string;
      projectId: string;
    };

    if (!body.keywords?.length || body.keywords.length > 5) {
      return NextResponse.json(
        { error: 'keywords: 1–5 Einträge erforderlich' },
        { status: 400 },
      );
    }

    const apiKey = await db.apiKey.findFirst({
      where: { provider: 'dataseo', createdById: session.user.id },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'DataForSEO API-Key nicht konfiguriert' },
        { status: 422 },
      );
    }

    // Format im API-Key-Manager: "login:password"
    const credentials = decrypt(apiKey.encryptedKey);
    const authHeader = Buffer.from(credentials).toString('base64');

    const [keywords, paaQuestions] = await Promise.all([
      fetchKeywordsForKeywords(body.keywords, body.location, body.projectId, authHeader),
      fetchPaaQuestions(body.keywords[0], body.location, body.projectId, authHeader),
    ]);

    return NextResponse.json({ keywords, paaQuestions });
  } catch (exc: unknown) {
    logger.error({ err: exc }, '[Vysible] DataForSEO keyword fetch fehlgeschlagen');
    return NextResponse.json({ error: 'DataForSEO-Abfrage fehlgeschlagen' }, { status: 500 });
  }
}
```

### Acceptance Checklist

- [ ] `fetchKeywordsForKeywords` gibt ≥1 Ergebnis für "Zahnarzt" zurück (live gegen API)
- [ ] `fetchPaaQuestions` gibt ≥3 PAA-Fragen zurück
- [ ] `CostEntry` in DB nach API-Call (step='dataseo', costEur > 0)
- [ ] Kein DataForSEO-Credential im Code — nur via Decrypt aus DB
- [ ] Fehler bei fehlendem API-Key → HTTP 422 mit klarer Meldung
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(dataseo): DataForSEO Client + Keywords-API-Route implementiert (Slice 11a Sub-A)
```

---

## Sub-Slice B — Keyword-Review-UI im Wizard

**Aufwand:** ~3–4 Stunden  
**Scope:** Editierbare Keyword-Liste + PAA-Chips in Wizard Step 3.

### IN

```
components/wizard/KeywordReview.tsx              NEU — Client-Komponente
app/(dashboard)/projects/new/page.tsx            MOD — KeywordReview einbinden (Step 3)
```

### OUT

```
lib/dataseo/client.ts                            NICHT anfassen (Sub-Slice A)
app/api/dataseo/keywords/route.ts                NICHT anfassen (Sub-Slice A)
lib/ai/context-builder.ts                        NICHT anfassen
```

### B1 — KeywordReview-Komponente (Struktur)

```typescript
// components/wizard/KeywordReview.tsx
'use client';
// State: keywords (editierbar), paaQuestions (Chips, togglebar), isLoading, error
//
// Layout:
// - "Keyword-Vorschläge abrufen"-Button → POST /api/dataseo/keywords
// - Ergebnis: Liste editierbarer Keywords + PAA-Chips (Standard: alle selektiert)
// - Ladezustand: Spinner + "Abfrage läuft..." (Timeout-Hinweis 12s)
// - Fehler: "[FAIL] DataForSEO nicht erreichbar — Keywords manuell eingeben"
// - Fallback: manuelle Eingabe immer möglich (unabhängig von API-Status)
// - "Bestätigen"-Button → übergibt ausgewählte Keywords + PAA-Fragen an Wizard-Kontext
//
// Nicht-blockierend: Wenn kein DataForSEO-Key konfiguriert →
//   "DataForSEO nicht konfiguriert" + Link zu /settings/api-keys
```

**UI-Anforderungen:**
- PAA-Fragen als klickbare Chips (de-/selektierbar, Standard: alle selektiert)
- Keyword-Ergebnisse zeigen: Keyword, Suchvolumen (wenn verfügbar)
- UI-Timeout 12s → automatisch auf manuelle Eingabe zurückfallen
- Abruf läuft nicht automatisch — nur auf Button-Klick

### Acceptance Checklist

- [ ] "Keyword-Daten abrufen" → PAA-Liste erscheint innerhalb 12s
- [ ] Keywords vor Bestätigung editierbar (hinzufügen / entfernen)
- [ ] PAA-Chips de-selektierbar
- [ ] Kein DataForSEO-Credential im Client-Code
- [ ] API-Key fehlt → freundliche Meldung + Link zu API-Key-Einstellungen (kein Hard-Fail im Wizard)
- [ ] "Bestätigen" → Keywords + PAA im Wizard-State vor Generierungsstart
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(dataseo): Keyword-Review-UI in Wizard Step 3 (Slice 11a Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Kein DataForSEO-Credential hardcoded im Code
Select-String "dataforseo.com" app,lib -Recurse |
  Where-Object { $_.Line -match "login|password" -and $_.Line -notmatch "authHeader|decrypt|Basic" }
# → Zero direkte Credential-Treffer

# withRetry auf allen DataForSEO-Fetch-Calls
Select-String "fetch.*dataforseo" lib/dataseo -Recurse
# → Alle in withRetry eingebettet (manuell prüfen)

# CostEntry-Logging vorhanden
Select-String "step.*dataseo|dataseo.*step" lib/dataseo/client.ts
# → Treffer in beiden Fetch-Funktionen

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| DataForSEO Autocomplete (Suggest-API) | PAA + Keywords-for-Keywords reicht für MVP |
| Keyword-Tracking über Zeit | Kein DB-Schema für historische Keyword-Daten geplant |
| Bulk-Keywords >5 | Bewusstes Limit für Kosten-Kontrolle (plan.md) |
| Google Search Console Integration | Phase 4 |
| Keyword-Difficulty Score | Nicht im plan.md-Scope für Slice 11a |

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
SPRINT P2-D ABSCHLUSSBERICHT
==============================

Sprint: P2-D — DataForSEO Keyword-Recherche (Slice 11a)

SUB-SLICES:
  A Client + API-Route:   [ ] DONE — Commit: <hash>
  B KeywordReview-UI:     [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:              [ ]
  Alle Tests grün:                  [ ] x/x PASS
  CostEntry nach API-Call:          [ ]
  Kein Credential im Code:          [ ]
  CHANGELOG aktuell:                [ ]

═══════════════════════════════════════════════
[OK] P2-D ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P2-E (Canva OAuth + Ordner-Abruf — Slice 17)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p2d-dataseo.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
