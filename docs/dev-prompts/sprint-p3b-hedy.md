# Sprint P3-B — Hedy-Integration (Slice 20)

**Projekt:** Vysible  
**Sprint:** P3-B  
**Format:** Tier 2 (Stub möglicherweise vorhanden, Exploration zuerst)  
**Abhängigkeit:** Sprint P3-A ✅ (CostEntry-Tracking aktiv)  
**Anforderungen:** plan.md Slice 20, NFA-05 (Kosten-Logging), NFA-06 (Retry)  
**Geschätzte Dauer:** ~1 Tag

> **Pre-Condition (extern):**  
> Hedy API-Key muss vorhanden sein (`HEDY_API_KEY` oder via API-Key-Manager als Provider "Hedy").  
> Die API-Basis ist `https://api.hedy.bot/mcp`. Vor Sprint-Start:  
> - Manuell prüfen ob die Hedy-API ein Bearer-Token, API-Key-Header oder  
>   MCP-spezifisches Auth-Schema verwendet (Exploration klärt das).  
> - Eine Test-Session in der Hedy-App anlegen, damit die Session-Liste abgerufen werden kann.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap: Vorgänger P3-A abgeschlossen?
Select-String "P3-A.*✅|Sprint P3-A.*✅" docs/roadmap.md -i

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
# Hedy-Stub Stand
Get-ChildItem lib/hedy -Recurse -Name -ErrorAction SilentlyContinue
Get-Content lib/hedy/client.ts -ErrorAction SilentlyContinue

# Bestehende Hedy-API-Routen
Get-ChildItem app/api/hedy -Recurse -Name -ErrorAction SilentlyContinue

# HedyImport-Komponente vorhanden?
Get-ChildItem components/wizard -Recurse -Name | Select-String "hedy" -i

# prompts/positioning.yaml vorhanden?
Test-Path prompts/positioning.yaml

# Wie wird der Hedy-Provider im API-Key-Manager gespeichert?
Select-String "hedy" prisma/schema.prisma,lib -Recurse -i -ErrorAction SilentlyContinue |
  Where-Object { $_.Line -match "provider|Provider|hedy" } |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# Wie ruft der bestehende KI-Client Prompts aus YAML-Dateien ab?
Select-String "readFileSync.*yaml\|loadPrompt\|yaml.*prompts" lib/ai -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# Wie sieht der KI-Client-Aufruf (streamText/generateText) aus?
Get-Content lib/ai/client.ts | Select-Object -First 60

# Wo wird das Positionierungsdokument im Projekt gespeichert?
Select-String "positionierungsdokument\|positioningDoc\|positioning" prisma/schema.prisma -i
Select-String "positionierungsdokument\|positioningDoc\|positioning" lib/generation -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# Wizard Step 3: wo ist der Hedy-Import-Button-Stub?
Select-String "hedy\|HedyImport" app/(dashboard) -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10
```

**Bekannte Lücken (Stand Mai 2026, aus Roadmap + plan.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/hedy/client.ts` | Stub — kein echter API-Call | MUSS |
| `lib/hedy/transcript-parser.ts` | Fehlend | MUSS |
| `app/api/hedy/import/route.ts` | Fehlend | MUSS |
| `prompts/positioning.yaml` | Fehlend | MUSS |
| `components/wizard/HedyImport.tsx` | Fehlend | MUSS |
| Wizard Step 3 | Hedy-Import-Button nur als Platzhalter | MUSS |

---

## CRITICAL: Self-review Checklist

- [ ] Hedy-API-Key ausschliesslich via API-Key-Manager (Provider "hedy") + AES-256 — nie hardcoded
- [ ] KI-Prompt **ausschliesslich** in `prompts/positioning.yaml` — kein Prompt-String im TypeScript-Code
- [ ] `withRetry` auf Hedy HTTP-Calls und KI-Call
- [ ] `trackCost` nach KI-Call aufgerufen (step='positioning_generation')
- [ ] Alle 8 Pflichtfelder aus plan.md im `prompts/positioning.yaml` System-Prompt definiert
- [ ] Transkript-Abruf < 10s (Timeout implementiert)
- [ ] Gespeichertes Positionierungsdokument im Kontext-Builder identisch wie manueller Upload
- [ ] Keine stillen Catches — `catch (exc: unknown) { logger.warn/error(...) }`
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — Hedy-Client + YAML-Prompt + API-Route

**Aufwand:** ~4–5 Stunden  
**Scope:** Hedy-Sessions abrufen, Transkript laden, KI-Transformation, Speichern.

### IN

```
lib/hedy/client.ts                        MOD — echte API-Calls (Stub ersetzen)
lib/hedy/transcript-parser.ts             NEU — Transkript-Normalisierung
app/api/hedy/import/route.ts              NEU — Session-Liste + Transkript + KI-Transform
prompts/positioning.yaml                  NEU — Pflicht-Prompt mit 8 Feldern
```

### OUT

```
lib/crypto/aes.ts                         NICHT anfassen
lib/ai/client.ts                          NICHT anfassen (nur aufrufen)
lib/costs/tracker.ts                      NICHT anfassen (nur aufrufen)
components/                              NICHT anfassen (Sub-Slice B)
```

### A1 — prompts/positioning.yaml (NEU)

```yaml
# prompts/positioning.yaml
# KI-Prompt: Hedy-Transkript → strukturiertes Positionierungsdokument
# ACHTUNG: Dieser Prompt wird ausschliesslich aus TypeScript per yaml-Load aufgerufen.
# Kein Prompt-Text im TypeScript-Code.

system: |
  Du bist Experte für Praxis-Positionierung im Gesundheitswesen.
  Analysiere das Transkript eines Positionierungsworkshops und erstelle
  ein strukturiertes Positionierungsdokument für eine Arzt- oder Zahnarztpraxis.

  Extrahiere zwingend alle 8 Felder (wenn nicht genannt: "[nicht besprochen]"):

  # 1. Praxis-Identität
  **Praxisname:** [Name]
  **Standort:** [Ort, Bundesland]

  # 2. Fachgebiet & Leistungen
  **Fachgebiet(e):** [Hauptfachgebiet(e)]
  **Leistungsschwerpunkte:** [3–7 konkrete Schwerpunkte]

  # 3. Einzigartige Stärken (USPs)
  [max. 5 konkrete, differenzierende Stärken — keine Marketing-Floskeln]

  # 4. Primäre Zielgruppe
  **Alter:** [Altersgruppe]
  **Lebensumstand:** [konkreter Kontext]
  **Schmerzpunkt:** [was bewegt sie zur Praxis]

  # 5. Sekundäre Zielgruppe
  [analog zu Feld 4]

  # 6. Tonalität
  **Gewünscht:** [warm / sachlich / modern / akademisch / kombiniert]
  **Begründung aus Transkript:** [kurze Ableitung]

  # 7. Differenzierung
  **Zum Wettbewerb:** [was macht die Praxis anders / besser]

  # 8. Saisonale Besonderheiten
  [Aktionsschwerpunkte, saisonale Themen, falls besprochen]

  Ausgabe: Strukturiertes Markdown-Dokument, max. 2.000 Wörter.
  Direkt beginnen. Keine Einleitung. Kein Kommentar. Kein "Hier ist das Dokument:".

user: |
  Transkript des Positionierungsworkshops:

  {{transcript}}
```

### A2 — lib/hedy/client.ts

```typescript
// lib/hedy/client.ts
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';

// Hedy API: https://api.hedy.bot/mcp
// Auth-Schema per Vorab-Validierung klären — wahrscheinlich Bearer-Token oder API-Key-Header
const HEDY_BASE = 'https://api.hedy.bot/mcp';

export interface HedySession {
  id: string;
  title: string;
  date: string;         // ISO-8601
  durationMinutes: number;
}

export interface HedyTranscript {
  sessionId: string;
  text: string;         // Volltext des Transkripts
  language: string;
}

export async function listSessions(apiKey: string): Promise<HedySession[]> {
  return withRetry(async () => {
    const response = await fetch(`${HEDY_BASE}/sessions`, {
      headers: buildHeaders(apiKey),
    });
    if (!response.ok) throw new Error(`Hedy Sessions HTTP ${response.status}`);
    const data = await response.json() as { sessions?: HedySession[] };
    // Letzte 20 Sessions, neueste zuerst
    return (data.sessions ?? []).slice(0, 20);
  }, 'hedy.list_sessions');
}

export async function fetchTranscript(
  sessionId: string,
  apiKey: string,
): Promise<HedyTranscript> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s Timeout

  try {
    return await withRetry(async () => {
      const response = await fetch(`${HEDY_BASE}/sessions/${sessionId}/transcript`, {
        headers: buildHeaders(apiKey),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Hedy Transcript HTTP ${response.status}`);
      return await response.json() as HedyTranscript;
    }, 'hedy.fetch_transcript');
  } finally {
    clearTimeout(timeout);
  }
}

// Auth-Header-Aufbau — nach Vorab-Validierung anpassen
// Typische Varianten: Bearer-Token, X-API-Key, Basic Auth
function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}
```

> **Hinweis:** `buildHeaders` nach Verifikation des tatsächlichen Hedy-Auth-Schemas anpassen.
> MCP (`Model Context Protocol`) deutet auf ein strukturiertes Request-Format hin —
> falls Hedy kein Standard-REST verwendet, die Exploration-Ergebnisse als Grundlage nutzen.

### A3 — lib/hedy/transcript-parser.ts

```typescript
// lib/hedy/transcript-parser.ts
// Normalisiert das Hedy-Rohtranskrip für den KI-Prompt.
// Kürzt auf max. ~12.000 Zeichen (≈ 4.000 Tokens) um Kontext-Budget einzuhalten.

export function prepareTranscriptForPrompt(transcript: HedyTranscript): string {
  const text = transcript.text.trim();

  // Speaker-Labels normalisieren (z.B. "SPEAKER_00:" → "Moderator:", "SPEAKER_01:" → "Teilnehmer:")
  const normalized = text
    .replace(/SPEAKER_00:/g, 'Moderator:')
    .replace(/SPEAKER_\d+:/g, 'Teilnehmer:')
    .replace(/\[inaudible\]/gi, '[unverständlich]')
    .replace(/\n{3,}/g, '\n\n');   // Mehrfach-Leerzeilen reduzieren

  // Auf max. 12.000 Zeichen kürzen (von hinten kürzen ist schlechter — von Mitte kürzen)
  if (normalized.length <= 12_000) return normalized;

  const half = 5_500;
  return `${normalized.slice(0, half)}\n\n[... Mittelteil gekürzt für Token-Budget ...]\n\n${normalized.slice(-half)}`;
}
```

### A4 — app/api/hedy/import/route.ts

```typescript
// app/api/hedy/import/route.ts
// GET  ?action=sessions       → Liste letzter 20 Sessions
// GET  ?action=transcript&id= → Transkript einer Session
// POST                         → KI-Transformation + Speichern als Positionierungsdokument
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { listSessions, fetchTranscript } from '@/lib/hedy/client';
import { prepareTranscriptForPrompt } from '@/lib/hedy/transcript-parser';
import { decrypt } from '@/lib/crypto/aes';
import { db } from '@/lib/db';
import { logger } from '@/lib/utils/logger';
import { generateText } from '@/lib/ai/client';
import { trackCost } from '@/lib/costs/tracker';
import { loadYamlPrompt } from '@/lib/ai/prompt-loader'; // bestehende Hilfsfunktion prüfen

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  const apiKey = await db.apiKey.findFirst({
    where: { provider: 'hedy', createdById: session.user.id },
  });
  if (!apiKey) {
    return NextResponse.json({ error: 'Hedy API-Key nicht konfiguriert' }, { status: 422 });
  }
  const hedyKey = decrypt(apiKey.encryptedKey);

  try {
    if (action === 'sessions') {
      const sessions = await listSessions(hedyKey);
      return NextResponse.json({ sessions });
    }

    if (action === 'transcript') {
      const sessionId = searchParams.get('id');
      if (!sessionId) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
      const transcript = await fetchTranscript(sessionId, hedyKey);
      return NextResponse.json({ transcript: prepareTranscriptForPrompt(transcript) });
    }

    return NextResponse.json({ error: 'Unbekannte action' }, { status: 400 });
  } catch (exc: unknown) {
    logger.error({ err: exc }, '[Vysible] Hedy API-Aufruf fehlgeschlagen');
    return NextResponse.json({ error: 'Hedy-Abruf fehlgeschlagen' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { projectId, transcript } = await req.json() as {
      projectId: string;
      transcript: string;
    };

    // KI-Transformation via prompts/positioning.yaml
    const prompt = await loadYamlPrompt('positioning', { transcript });
    const result = await generateText({
      system: prompt.system,
      user: prompt.user,
      model: 'claude-sonnet-4-6',
    });

    // CostEntry schreiben
    await trackCost({
      projectId,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costEur: result.costEur,
      step: 'positioning_generation',
    });

    // Positionierungsdokument im Projekt speichern
    await db.project.update({
      where: { id: projectId },
      data: { positioningDocument: result.text },
    });

    return NextResponse.json({ document: result.text });
  } catch (exc: unknown) {
    logger.error({ err: exc }, '[Vysible] Hedy KI-Transformation fehlgeschlagen');
    return NextResponse.json({ error: 'KI-Transformation fehlgeschlagen' }, { status: 500 });
  }
}
```

> **Hinweis:** `loadYamlPrompt` und `generateText` — Exploration zeigt wie YAML-Prompts
> in bestehenden KI-Calls geladen werden (`lib/ai/`). Bestehende Hilfsfunktionen nutzen,
> nicht neu implementieren (No-Duplication-Regel).

### Acceptance Checklist

- [ ] `GET ?action=sessions` → Liste letzter 20 Hedy-Sessions mit Titel + Datum
- [ ] `GET ?action=transcript&id=...` → Transkript-Text < 10s
- [ ] `POST` → KI-Output enthält alle 8 Pflichtfelder (manuell prüfen)
- [ ] `CostEntry` in DB nach KI-Call (step='positioning_generation')
- [ ] Hedy-Key fehlt → HTTP 422 mit klarer Meldung
- [ ] Kein Prompt-Text im TypeScript — ausschliesslich in `prompts/positioning.yaml`
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(hedy): Hedy-Client + Transcript-Parser + KI-Import-Route + positioning.yaml (Slice 20 Sub-A)
```

---

## Sub-Slice B — HedyImport-Wizard-Komponente

**Aufwand:** ~3–4 Stunden  
**Scope:** UI-Flow in Wizard Step 3: Session-Liste, Vorschau, KI-Transformation, editierbare Vorschau, Speichern.

### IN

```
components/wizard/HedyImport.tsx             NEU — Client-Komponente (5-Schritt-Flow)
app/(dashboard)/projects/new/page.tsx        MOD — HedyImport als echte Komponente einbinden
```

### OUT

```
app/api/hedy/import/route.ts                 NICHT anfassen (Sub-Slice A)
lib/hedy/                                    NICHT anfassen (Sub-Slice A)
prompts/positioning.yaml                     NICHT anfassen (Sub-Slice A)
```

### B1 — HedyImport-Komponente (5-Schritt-Flow)

```typescript
// components/wizard/HedyImport.tsx
'use client';
// Schritt 1: "Aus Hedy importieren"-Button
//   → GET /api/hedy/import?action=sessions
//   → Zeigt Liste letzter 20 Sessions (Titel, Datum, Dauer)
//   → Ladezustand: Spinner + "[INFO] Sessions werden geladen..."
//
// Schritt 2: Session auswählen
//   → Klick auf Session → GET /api/hedy/import?action=transcript&id=...
//   → Ladezustand: "[INFO] Transkript wird abgerufen..." (Timeout 12s)
//
// Schritt 3: Transformation bestätigen
//   → "Positionierungsdokument generieren"-Button
//   → POST /api/hedy/import (projectId + transcript)
//   → Ladezustand: "[INFO] KI analysiert Transkript..." (kann 20–30s dauern)
//
// Schritt 4: Editierbare Vorschau
//   → Textarea mit generiertem Markdown, vollständig editierbar
//   → Zeichenzähler (max. ca. 2.000 Wörter)
//
// Schritt 5: Speichern
//   → "Als Positionierungsdokument speichern"-Button
//   → onDocumentSaved(document: string) Callback an Wizard
//   → "[OK] Positionierungsdokument gespeichert — identisch zu manuellem Upload"
//
// Fehlerbehandlung:
//   Hedy nicht erreichbar → "[FAIL] Hedy nicht verfügbar. API-Key prüfen."
//   KI-Fehler → "[FAIL] Generierung fehlgeschlagen. Erneut versuchen."
//   Kein API-Key → "[WARN] Hedy nicht konfiguriert" + Link zu /settings/api-keys
```

**Wichtig:** Die gespeicherte Vorschau muss im Wizard-State und im Kontext-Builder
identisch behandelt werden wie ein manuell hochgeladenes Positionierungsdokument
(gleiche `positioningDocument`-Property im Projekt).

### Acceptance Checklist

- [ ] 5-Schritt-Flow vollständig durchlaufbar
- [ ] Session-Liste zeigt Titel + Datum (lesbar formatiert: "12.05.2026")
- [ ] KI-Transformation: Ladezustand sichtbar (mind. 15–30s erwartet)
- [ ] Vorschau editierbar vor Speicherung
- [ ] Gespeichertes Dokument erscheint in Wizard als Positionierungsdokument (identisch zu manuellem Upload)
- [ ] Kein Hedy-API-Key → freundliche Meldung ohne Hard-Fail im Wizard
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(hedy): HedyImport-Wizard-Komponente + 5-Schritt-Flow (Slice 20 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Kein Prompt-Text in TypeScript-Code
Select-String "Du bist Experte\|Positionierungsworkshop\|Extrahiere zwingend" app,lib -Recurse
# → Zero Treffer (Prompt ausschliesslich in YAML)

# Hedy-Credential nie hardcoded
Select-String "hedy.bot" lib/hedy/client.ts | Where-Object { $_.Line -match "api_key|password|token.*=" -and $_.Line -notmatch "apiKey|buildHeaders" }
# → Zero direkte Credential-Treffer

# CostEntry für positioning_generation
Select-String "positioning_generation" lib/hedy,app/api/hedy -Recurse
# → Treffer in import/route.ts

# prompts/positioning.yaml vorhanden und nicht leer
(Get-Content prompts/positioning.yaml).Length | Where-Object { $_ -gt 10 }

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Hedy-Audio-Zugriff | API gibt nur Transkript — keine Rohdaten (plan.md Stop-Condition) |
| Hedy-Session-Erstellung aus dem Tool | Stop-Condition plan.md Slice 20 |
| Mehrsprachige Transkripte | DE-Fokus ausreichend für DACH-Agentur |
| Transkript-Qualitätsprüfung | Phase 4 |
| Automatischer Import ohne Nutzer-Aktion | Sicherheitsrisiko — immer manuell bestätigen |

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
SPRINT P3-B ABSCHLUSSBERICHT
==============================

Sprint: P3-B — Hedy-Integration (Slice 20)

SUB-SLICES:
  A Client + YAML + API-Route:     [ ] DONE — Commit: <hash>
  B HedyImport-Wizard-Komponente:  [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>
  Hedy-Auth-Schema: <Bearer / API-Key-Header / anderes — dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  Kein Prompt im TypeScript:       [ ]
  CostEntry step=positioning_gen:  [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P3-B ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P3-C (Praxis-Portal — Slice 21)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p3b-hedy.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
