# Sprint 1 — Slice 28: Compliance & Governance

**Projekt:** Vysible
**Sprint:** 1
**Slice:** 28
**Abhängigkeit:** Sprint 0 ✅ (generation_jobs, withRetry, SmtpConfig)
**Anforderungen:** FA-B-11, FA-B-12, FA-B-13, FA-F-31, FA-F-32
**Geschätzte Dauer:** ~3 Tage

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

> ⚠️ Lies den gesamten Prompt **bevor** du den ersten Tool-Call machst.
> Starte erst nach 4/4 PASS mit der Implementierung.

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die 4 Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain
# Erwartet: leere Ausgabe

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit
# Erwartet: 0 Fehler

# Check C — Roadmap
Select-String "Sprint 0.*abgeschlossen|Sprint 0.*✅" docs/roadmap.md -i
# Erwartet: Treffer

# Check D — CHANGELOG
Select-String "\[Unreleased\]" CHANGELOG.md
# Erwartet: Treffer
```

Bei **Hard-FAIL (A oder B):** SOFORT STOP. Kein weiterer Befehl. Kein weiterer Check. Keine Parallelisierung.  
Ausgabe: `HARD-FAIL: Check [X] — [Grund]` + erforderliche Aktion für den User. Dann **await User-Freigabe**.
Bei **Soft-FAIL (C oder D):** Dokumentiere, frage nach Override.
Bei **4/4 PASS:** Direkt mit Sub-Track A beginnen.

---

## CRITICAL: Was bereits existiert — NICHT neu implementieren

Vor der Implementierung prüfen:

```powershell
# Prisma-Schema: AuditLog + reviewMode + hwgFlag bereits vorhanden?
Select-String "model AuditLog|reviewMode|hwgFlag" prisma/schema.prisma
# → Erwartet: 3 Treffer (alle drei vorhanden)

# Audit-Logger bereits vorhanden?
Test-Path lib/audit/logger.ts
# → Erwartet: True

# /api/projects GET Datentrennung bereits vorhanden?
Select-String "createdById.*session" app/api/projects/route.ts
# → Erwartet: Treffer (FA-B-12 DONE)
```

**Was das bedeutet:**
- `AuditLog`-Tabelle: **Schema ist fertig**, nur `prisma migrate deploy` (oder `prisma migrate dev`) nötig
- `lib/audit/logger.ts` mit `writeAuditLog()`: **Funktion existiert**, aber wird **nirgendwo aufgerufen**
- `reviewMode` + `hwgFlag` Felder: **In DB vorhanden**, Gate und UI fehlen
- `createdById` Filter in `/api/projects`: **Bereits implementiert** — nicht anfassen

---

## CRITICAL: Self-review Checklist

- [ ] HWG-Gate in Export-Route: `hwgFlag === true` → HTTP 403, kein ZIP
- [ ] HWG-Gate in Social-Post/WordPress-Draft-Routes (falls vorhanden): analog blockiert
- [ ] `writeAuditLog()` aufgerufen in: export, project.create, project.delete, generate.start, api_key.create/delete
- [ ] Neuer PATCH `/api/projects/[id]/review` Endpunkt für reviewMode + hwgFlag
- [ ] Neuer GET `/api/projects/[id]/audit` Endpunkt (paginiert, max. 50 Einträge)
- [ ] Review-Workflow-UI: Badge (reviewMode) + Buttons (SIMPLE ↔ COMPLETE) in Projekt-Detailseite
- [ ] HWG-Flag-Anzeige: Rotes Banner in Projekt-Detailseite wenn `hwgFlag === true`
- [ ] Audit-Log-Tab: Chronologische Liste der AuditLog-Einträge pro Projekt
- [ ] Kein PII in AuditLog.meta — nur IDs, nie E-Mail/Name-Klartexte
- [ ] `prisma migrate dev --name add_audit_log_review_mode` (falls Migration noch aussteht)
- [ ] TypeScript strict: 0 Fehler nach Implementierung
- [ ] CHANGELOG.md im selben Commit aktualisiert

---

## Scope Check

**IN:**

```
prisma/                                         prisma migrate dev (falls nötig)
app/api/projects/[id]/export/route.ts           MOD — HWG-Gate + writeAuditLog
app/api/projects/route.ts                       MOD — writeAuditLog für create/delete
app/api/generate/start/route.ts                 MOD — writeAuditLog für generation.start
app/api/api-keys/route.ts                       MOD — writeAuditLog für create/delete
app/api/projects/[id]/review/route.ts           NEU — PATCH reviewMode + hwgFlag
app/api/projects/[id]/audit/route.ts            NEU — GET AuditLog-Einträge
app/(dashboard)/projects/[id]/page.tsx          MOD — HWG-Banner + Review-Bereich
components/compliance/HwgBanner.tsx             NEU — rotes Banner-Komponente
components/compliance/ReviewWorkflow.tsx        NEU — Statuswechsel-UI
components/compliance/AuditLogTab.tsx           NEU — Log-Tab-Komponente
CHANGELOG.md / docs/roadmap.md
```

**OUT:**

```
lib/audit/logger.ts                             NICHT anfassen — vollständig implementiert
lib/audit/                                      KEIN neues File in diesem Verzeichnis
prisma/schema.prisma                            NUR migrate, kein Schema-Edit nötig
/api/projects (GET)                             NICHT anfassen — createdById bereits korrekt
```

---

## Sub-Track A — HWG Compliance Gate (Export-Route)

**Datei:** `app/api/projects/[id]/export/route.ts` (MOD)

Das HWG-Flag (`hwgFlag`) wird aktuell aus der DB geladen, aber **nicht geprüft**.
Gate einfügen direkt nach der `null`-Prüfung für `project`:

```typescript
// Nach: if (!project) { return NextResponse.json(..., { status: 404 }) }
// Einfügen:

if (project.hwgFlag) {
  await writeAuditLog({
    action:    'export.download',
    entity:    'Project',
    entityId:  params.id,
    projectId: params.id,
    userId:    session.user.id,
    userEmail: session.user.email ?? undefined,
    meta:      { blocked: true, reason: 'hwg_flag_set' },
  });
  return NextResponse.json(
    { error: 'Export gesperrt: HWG-Compliance-Flag ist gesetzt. Bitte Inhalte prüfen und Flag zurücksetzen.' },
    { status: 403 }
  );
}
```

Außerdem: Nach erfolgreichem ZIP-Aufbau (vor `return`) einen Audit-Log-Eintrag schreiben:

```typescript
await writeAuditLog({
  action:    'export.download',
  entity:    'Project',
  entityId:  params.id,
  projectId: params.id,
  userId:    session.user.id,
  userEmail: session.user.email ?? undefined,
  meta:      { praxisName: praxisName },
});
```

**Analog prüfen:** Gibt es `app/api/wordpress/draft/route.ts`? Falls `project.hwgFlag === true`
dort ebenfalls blockieren (403 mit analogem Fehlertext).

---

## Sub-Track B — Audit Log Wiring (API-Routes)

`writeAuditLog()` ist in `lib/audit/logger.ts` vollständig implementiert.
Import-Pfad: `import { writeAuditLog } from '@/lib/audit/logger'`

**Regel:** Audit-Calls kommen ans Ende der Erfolgs-Pfade (nach DB-Schreiboperation),
niemals vor der Operation.

### B-1: `app/api/projects/route.ts`

POST (Projekt anlegen) — nach `prisma.project.create(...)`:

```typescript
await writeAuditLog({
  action:    'project.create',
  entity:    'Project',
  entityId:  project.id,
  projectId: project.id,
  userId:    session.user.id,
  userEmail: session.user.email ?? undefined,
  meta:      { name: project.name },
});
```

DELETE (falls vorhanden) — analog mit `action: 'project.delete'`.

### B-2: `app/api/generate/start/route.ts`

Nach dem Start der Generierung (Job wurde angelegt):

```typescript
await writeAuditLog({
  action:    'generation.start',
  entity:    'Project',
  entityId:  projectId,
  projectId: projectId,
  userId:    session.user.id,
  userEmail: session.user.email ?? undefined,
  meta:      { channels: project.channels },
});
```

### B-3: `app/api/api-keys/route.ts`

POST (API-Key anlegen) — nach `prisma.apiKey.create(...)`:

```typescript
await writeAuditLog({
  action:    'api_key.create',
  entity:    'ApiKey',
  entityId:  apiKey.id,
  userId:    session.user.id,
  userEmail: session.user.email ?? undefined,
  meta:      { name: apiKey.name, provider: apiKey.provider },
});
```

DELETE — analog mit `action: 'api_key.delete'`.

**Hinweis:** Der verschlüsselte Key (`encryptedKey`) darf **nie** in `meta` landen.
Nur `id`, `name`, `provider`.

---

## Sub-Track C — PATCH `/api/projects/[id]/review` (NEU)

**Datei:** `app/api/projects/[id]/review/route.ts` (NEU)

Dieser Endpunkt erlaubt:
1. ReviewMode umschalten: `SIMPLE` ↔ `COMPLETE`
2. HWG-Flag setzen/zurücksetzen: `hwgFlag: boolean`

```typescript
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/audit/logger'
import { z } from 'zod'

const ReviewPatchSchema = z.object({
  reviewMode: z.enum(['SIMPLE', 'COMPLETE']).optional(),
  hwgFlag:    z.boolean().optional(),
}).refine(
  (data) => data.reviewMode !== undefined || data.hwgFlag !== undefined,
  { message: 'Mindestens ein Feld (reviewMode oder hwgFlag) muss angegeben werden.' }
);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = ReviewPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, reviewMode: true, hwgFlag: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
  }

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.reviewMode !== undefined && { reviewMode: parsed.data.reviewMode }),
      ...(parsed.data.hwgFlag !== undefined    && { hwgFlag: parsed.data.hwgFlag }),
    },
    select: { id: true, reviewMode: true, hwgFlag: true },
  });

  if (parsed.data.reviewMode !== undefined && parsed.data.reviewMode !== project.reviewMode) {
    await writeAuditLog({
      action:    'project.review_mode_change',
      entity:    'Project',
      entityId:  params.id,
      projectId: params.id,
      userId:    session.user.id,
      userEmail: session.user.email ?? undefined,
      meta:      { from: project.reviewMode, to: parsed.data.reviewMode },
    });
  }

  if (parsed.data.hwgFlag !== undefined && parsed.data.hwgFlag !== project.hwgFlag) {
    await writeAuditLog({
      action:    'project.hwg_flag_set',
      entity:    'Project',
      entityId:  params.id,
      projectId: params.id,
      userId:    session.user.id,
      userEmail: session.user.email ?? undefined,
      meta:      { hwgFlag: parsed.data.hwgFlag },
    });
  }

  return NextResponse.json(updated);
}
```

---

## Sub-Track D — GET `/api/projects/[id]/audit` (NEU)

**Datei:** `app/api/projects/[id]/audit/route.ts` (NEU)

Paginierte Liste der Audit-Einträge für ein Projekt. Max. 50 Einträge.

```typescript
import { requireAuth } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await requireAuth();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
  }

  const logs = await prisma.auditLog.findMany({
    where:   { projectId: params.id },
    orderBy: { createdAt: 'desc' },
    take:    50,
    select:  {
      id:        true,
      action:    true,
      entity:    true,
      entityId:  true,
      userId:    true,
      // userEmail: NICHT zurückgeben (PII) — nur userId reicht für die UI
      meta:      true,
      createdAt: true,
    },
  });

  return NextResponse.json({ logs });
}
```

---

## Sub-Track E — UI: HWG-Banner + Review-Workflow

### E-1: `components/compliance/HwgBanner.tsx` (NEU)

Client-Komponente. Zeigt ein rotes Banner wenn `hwgFlag === true`.
Bietet Button zum Zurücksetzen des Flags.

```tsx
'use client'

import { useState } from 'react'

interface HwgBannerProps {
  projectId:    string
  hwgFlag:      boolean
  onFlagChange: (newFlag: boolean) => void
}

export function HwgBanner({ projectId, hwgFlag, onFlagChange }: HwgBannerProps) {
  const [loading, setLoading] = useState(false)

  if (!hwgFlag) return null

  async function handleReset() {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/review`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hwgFlag: false }),
      })
      if (res.ok) {
        onFlagChange(false)
      }
    } catch {
      // Banner bleibt bei Fehler sichtbar
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4 flex items-start justify-between gap-4">
      <div>
        <p className="font-semibold text-red-800 text-sm">[WARN] HWG-Compliance-Flag gesetzt</p>
        <p className="text-red-700 text-sm mt-1">
          Dieser Inhalt enthält möglicherweise heilmittelwerberechtlich problematische Formulierungen.
          Export und Veröffentlichung sind gesperrt bis das Flag zurückgesetzt wird.
        </p>
      </div>
      <button
        onClick={handleReset}
        disabled={loading}
        className="shrink-0 text-sm bg-red-700 text-white px-3 py-1.5 rounded hover:bg-red-800 disabled:opacity-50"
      >
        {loading ? 'Wird gesetzt...' : 'Flag zurücksetzen'}
      </button>
    </div>
  )
}
```

### E-2: `components/compliance/ReviewWorkflow.tsx` (NEU)

Client-Komponente. Zeigt aktuellen ReviewMode als Badge und erlaubt Umschalten.

```tsx
'use client'

import { useState } from 'react'

type ReviewMode = 'SIMPLE' | 'COMPLETE'

interface ReviewWorkflowProps {
  projectId:  string
  reviewMode: ReviewMode
}

const LABELS: Record<ReviewMode, string> = {
  SIMPLE:   'Einfach-Review',
  COMPLETE: 'Vollständiger Review',
}

export function ReviewWorkflow({ projectId, reviewMode: initial }: ReviewWorkflowProps) {
  const [mode, setMode]     = useState<ReviewMode>(initial)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next: ReviewMode = mode === 'SIMPLE' ? 'COMPLETE' : 'SIMPLE'
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/review`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reviewMode: next }),
      })
      if (res.ok) setMode(next)
    } catch {
      // Kein silent fail — UI zeigt keine Änderung bei Fehler
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
        mode === 'COMPLETE'
          ? 'bg-green-100 text-green-800'
          : 'bg-stone text-anthrazit'
      }`}>
        {LABELS[mode]}
      </span>
      <button
        onClick={toggle}
        disabled={loading}
        className="text-sm text-tiefblau hover:underline disabled:opacity-50"
      >
        {loading ? '...' : mode === 'SIMPLE' ? 'Auf vollständigen Review umstellen' : 'Zurück zu Einfach-Review'}
      </button>
    </div>
  )
}
```

### E-3: `components/compliance/AuditLogTab.tsx` (NEU)

Client-Komponente. Lädt und zeigt die Audit-Log-Einträge für ein Projekt.

Anforderungen:
- Lädt via `GET /api/projects/[id]/audit` beim Mount
- Zeigt Zeitstempel (deutsch, `de-DE` locale), Action, Meta-Infos
- Kein PII anzeigen — `userEmail` kommt nicht vom API, nur `userId`
- Ladezustand mit einfachem Spinner-Text
- Leerer Zustand: "Noch keine Aktivitäten aufgezeichnet."

Struktur (Self-Contained, eigene Fetch-Logik):

```tsx
'use client'

import { useEffect, useState } from 'react'

interface AuditEntry {
  id:        string
  action:    string
  entity:    string
  entityId:  string | null
  userId:    string | null
  meta:      Record<string, unknown> | null
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  'project.create':            'Projekt erstellt',
  'project.update':            'Projekt bearbeitet',
  'project.delete':            'Projekt gelöscht',
  'project.status_change':     'Status geändert',
  'project.review_mode_change':'Review-Modus geändert',
  'project.hwg_flag_set':      'HWG-Flag geändert',
  'generation.start':          'Generierung gestartet',
  'generation.complete':       'Generierung abgeschlossen',
  'generation.error':          'Generierungsfehler',
  'export.download':           'Export heruntergeladen',
  'share_link.create':         'Share-Link erstellt',
  'share_link.delete':         'Share-Link gelöscht',
  'api_key.create':            'API-Key erstellt',
  'api_key.delete':            'API-Key gelöscht',
  'user.login':                'Anmeldung',
  'user.logout':               'Abmeldung',
}

export function AuditLogTab({ projectId }: { projectId: string }) {
  const [logs, setLogs]       = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/audit`)
      .then((r) => r.json())
      .then((data: { logs: AuditEntry[] }) => setLogs(data.logs ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <p className="text-sm text-gray-400 py-4">[INFO] Lade Aktivitäten...</p>
  if (logs.length === 0) return <p className="text-sm text-gray-400 py-4">Noch keine Aktivitäten aufgezeichnet.</p>

  return (
    <div className="divide-y divide-stone">
      {logs.map((log) => (
        <div key={log.id} className="py-3 flex gap-4 items-start">
          <time className="text-xs text-gray-400 shrink-0 pt-0.5 w-36">
            {new Date(log.createdAt).toLocaleString('de-DE', {
              day:    '2-digit',
              month:  '2-digit',
              year:   'numeric',
              hour:   '2-digit',
              minute: '2-digit',
            })}
          </time>
          <div>
            <p className="text-sm font-medium text-anthrazit">
              {ACTION_LABELS[log.action] ?? log.action}
            </p>
            {log.meta && Object.keys(log.meta).length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {Object.entries(log.meta)
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(' · ')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## Sub-Track F — Projekt-Detailseite MOD

**Datei:** `app/(dashboard)/projects/[id]/page.tsx` (MOD)

Die Seite muss `reviewMode` und `hwgFlag` aus der DB laden und die neuen Komponenten einbinden.

### F-1: Prisma-Query erweitern

```typescript
const project = await prisma.project.findUnique({
  where:   { id: params.id },
  include: {
    costEntries: { orderBy: { timestamp: 'desc' }, take: 10 },
  },
  // reviewMode und hwgFlag sind Standard-Felder, werden automatisch selektiert
})
```

`reviewMode` und `hwgFlag` sind einfache skalare Felder — sie kommen ohne `select`/`include`-Erweiterung zurück. Prüfen ob sie im Rückgabeobjekt sind; falls `select` genutzt wird, ergänzen.

### F-2: Import der neuen Komponenten

```typescript
import { HwgBanner }      from '@/components/compliance/HwgBanner'
import { ReviewWorkflow }  from '@/components/compliance/ReviewWorkflow'
import { AuditLogTab }     from '@/components/compliance/AuditLogTab'
```

### F-3: JSX-Ergänzungen

Direkt nach dem öffnenden `<div>`:

```tsx
{/* HWG-Compliance-Banner (nur sichtbar wenn hwgFlag gesetzt) */}
<HwgBanner
  projectId={project.id}
  hwgFlag={project.hwgFlag}
  onFlagChange={() => { /* Server-revalidation via router.refresh() wenn nötig */ }}
/>
```

Nach `GenerateSection`:

```tsx
{/* Review-Workflow */}
<div className="mb-4">
  <InfoCard label="Review-Status">
    <ReviewWorkflow projectId={project.id} reviewMode={project.reviewMode} />
  </InfoCard>
</div>
```

Am Ende der Seite, als eigener Abschnitt:

```tsx
{/* Aktivitäts-Log */}
<section className="mt-8">
  <h2 className="text-sm font-semibold text-anthrazit mb-3">Aktivitäten</h2>
  <div className="bg-white rounded-xl border border-stone p-4">
    <AuditLogTab projectId={project.id} />
  </div>
</section>
```

---

## Sub-Track G — Prisma Migration

Falls noch nicht geschehen (prüfe `prisma/migrations/` nach einer Migration mit `audit_log`):

```powershell
# Prüfen ob Migration bereits existiert
Get-ChildItem prisma/migrations -Filter "*audit*"
# Falls keine Ausgabe: Migration anlegen
npx prisma migrate dev --name add_audit_log_review_mode
```

Falls Migration bereits existiert aber nicht auf der Live-DB ist:
→ Siehe `docs/dev-prompts/OpenActions.md` — muss manuell über `prisma migrate deploy` erfolgen.

---

## CHANGELOG-Eintrag (im selben Commit)

Unter `## [Unreleased]` einfügen:

```markdown
### Added
- Slice 28: Compliance & Governance (FA-B-11, FA-B-12, FA-B-13, FA-F-31, FA-F-32)
  - HWG-Compliance-Gate: Export und WordPress-Draft blockiert wenn `hwgFlag === true` (FA-B-13)
  - Audit-Log-Wiring: `writeAuditLog()` in export, project.create, generate.start, api_key create/delete
  - PATCH `/api/projects/[id]/review` — reviewMode + hwgFlag änderbar
  - GET `/api/projects/[id]/audit` — paginierte Aktivitätsliste (max. 50 Einträge)
  - `components/compliance/HwgBanner` — rotes Banner mit Flag-Zurücksetzen
  - `components/compliance/ReviewWorkflow` — SIMPLE/COMPLETE Umschalter
  - `components/compliance/AuditLogTab` — Aktivitäts-Tab pro Projekt
```

---

## Validation Block

```powershell
# 1. Neue Dateien vorhanden
@(
  "app/api/projects/$([char]91)id$([char]93)/review/route.ts",
  "app/api/projects/$([char]91)id$([char]93)/audit/route.ts",
  "components/compliance/HwgBanner.tsx",
  "components/compliance/ReviewWorkflow.tsx",
  "components/compliance/AuditLogTab.tsx"
) | ForEach-Object {
  if (Test-Path $_) { Write-Host "[OK]  $_" } else { Write-Host "[FAIL] FEHLT: $_" }
}

# 2. HWG-Gate im Export implementiert
Select-String "hwgFlag" "app/api/projects/[id]/export/route.ts"
# → Treffer (hwgFlag-Check)
Select-String "403" "app/api/projects/[id]/export/route.ts"
# → Treffer

# 3. writeAuditLog aufgerufen in den neuen/modifizierten Routes
@(
  "app/api/projects/route.ts",
  "app/api/generate/start/route.ts",
  "app/api/api-keys/route.ts",
  "app/api/projects/[id]/export/route.ts"
) | ForEach-Object {
  $hit = Select-String "writeAuditLog" $_
  if ($hit) { Write-Host "[OK]  audit in $_" } else { Write-Host "[FAIL] KEIN AUDIT in $_" }
}

# 4. TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit
# → 0 Fehler

# 5. Smoke-Tests
# a) Export bei gesetztem HWG-Flag muss 403 zurückgeben
#    (manueller Test: Flag in Prisma Studio setzen, dann Export aufrufen)
# b) PATCH /api/projects/[id]/review mit { reviewMode: "COMPLETE" }
#    → HTTP 200, AuditLog-Eintrag in DB

# 6. Kein PII in AuditLog-Meta
Select-String "userEmail.*meta\|email.*meta" app/api/ -Recurse
# → Zero Treffer erwartet (userEmail nie in meta-Feld)
```

**Stop-Conditions (bekannte Fallstricke):**
- `HwgBanner` und `ReviewWorkflow` brauchen `'use client'` — Server-Komponente `page.tsx` muss sie als Client-Komponenten einbinden
- `AuditLogTab` fetcht client-seitig, braucht `useEffect` — kein direkter Prisma-Aufruf
- `prisma migrate dev` schlägt fehl wenn DB nicht erreichbar → Docker zuerst starten
- `ReviewMode` Enum in Prisma: `SIMPLE` und `COMPLETE` (Großschreibung beachten)
- Zod `z.enum` muss die gleichen String-Werte haben wie das Prisma-Enum

---

## Auto-Commit Block

```powershell
git add app/api/projects/[id]/export/route.ts
git add app/api/projects/[id]/review/route.ts
git add app/api/projects/[id]/audit/route.ts
git add app/api/projects/route.ts
git add app/api/generate/start/route.ts
git add app/api/api-keys/route.ts
git add app/(dashboard)/projects/[id]/page.tsx
git add components/compliance/
git add CHANGELOG.md docs/roadmap.md

git commit -m "feat(compliance): Slice 28 — HWG-Gate, Audit-Log-Wiring, Review-Workflow-UI (FA-B-11/12/13, FA-F-31/32)"
```

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT 1 — SLICE 28 ABSCHLUSSBERICHT
=====================================

Sprint: 1 — Compliance & Governance
Anforderungen: FA-B-11, FA-B-12, FA-B-13, FA-F-31, FA-F-32

CHECKS:
  Pre-Slice Validation:     [ ] 4/4 PASS
  Working tree clean:       [ ]
  TypeScript:               [ ] 0 Fehler
  HWG-Gate (export 403):    [ ]
  Audit-Log-Wiring (4 Routes): [ ]
  PATCH /review Endpunkt:   [ ]
  GET /audit Endpunkt:      [ ]
  Review-Workflow-UI:       [ ]
  HWG-Banner:               [ ]
  Audit-Log-Tab:            [ ]
  CHANGELOG aktuell:        [ ]

DATEIEN:
  Angelegt:    app/api/projects/[id]/review/route.ts
               app/api/projects/[id]/audit/route.ts
               components/compliance/HwgBanner.tsx
               components/compliance/ReviewWorkflow.tsx
               components/compliance/AuditLogTab.tsx
  Modifiziert: app/api/projects/[id]/export/route.ts (HWG-Gate)
               app/api/projects/route.ts (audit)
               app/api/generate/start/route.ts (audit)
               app/api/api-keys/route.ts (audit)
               app/(dashboard)/projects/[id]/page.tsx (UI)

DRIFT: <keiner / Abweichungen dokumentieren>

═══════════════════════════════════════════════
[OK] SPRINT 1 ABGESCHLOSSEN
▶ Nächste Priorität: Sprint 2 — Tests (Vitest + Playwright)
═══════════════════════════════════════════════
```
