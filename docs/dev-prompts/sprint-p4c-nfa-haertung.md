# Sprint P4-C — NFA-Härtung (Non-Functional Requirements)

**Projekt:** Vysible  
**Sprint:** P4-C  
**Format:** Tier 3 (Exploration dominiert — querschnittliche Härtung über viele Module)  
**Abhängigkeit:** Sprint P4-B ✅  
**Anforderungen:** plan.md Phase 4 DoD, Nicht-funktionale Pflicht-Constraints (plan.md §NFA)  
**Geschätzte Dauer:** ~2 Tage

> **Ziel:** Alle nicht-funktionalen Pflicht-Constraints aus plan.md auf  
> Produktionsreife härten. Fokus: Rate-Limiting (Middleware global), DSGVO-Löschkaskade  
> (DELETE-Route fehlt), AI-Call-Timeouts, Input-Validierung (Zod), CSP-Header.  
> Concurrency-Limiter (NFA-18) und Error-Boundary sind in Vorgänger-Sprints bereits  
> implementiert worden und werden **nicht** neu erstellt.

> **NFA-Referenzen (plan.md §NFA):** NFA-18 (Concurrency — ✅ erledigt via `queue.ts`),  
> plan.md §NFA-Rate-Limit, §NFA-Timeout, §NFA-CSP, §NFA-Input-Validierung

> **Hinweis:** Sprint P4-C ist in `docs/roadmap.md` (Phase-4-Backlog) eingetragen.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus
(Phase 0 — PSR + Phase 1 — technische Gates).
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.
Bei GO: Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Middleware: was wird aktuell abgefangen?
Get-Content middleware.ts -ErrorAction SilentlyContinue

# 2. Concurrency: gibt es bereits einen Limiter?
Select-String "concurrency\|semaphore\|maxParallel\|MAX_CONCURRENT" lib,app -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 3. Rate-Limiting: bereits vorhanden?
Select-String "rateLimit\|rate-limit\|throttle" lib,app,middleware -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 4. Projekt-Löschung: was passiert bei DELETE?
Get-ChildItem "app/api/projects/[id]" -Name -ErrorAction SilentlyContinue
Select-String "delete\|DELETE\|onDelete" "app/api/projects" -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 5. Prisma-Schema: onDelete-Verhalten
Select-String "onDelete" prisma/schema.prisma | Select-Object -First 15

# 6. Error-Boundaries: existieren sie?
Select-String "ErrorBoundary\|error\.tsx" app -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 7. CSP-Header: in next.config.mjs?
Get-Content next.config.mjs -ErrorAction SilentlyContinue

# 8. Input-Validierung: Zod auf API-Routen?
Select-String "z\.object\|z\.string\|zod" app/api -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 15

# 9. Logger-Coverage: welche API-Routen loggen NICHT?
Get-ChildItem app/api -Recurse -Filter "route.ts" | ForEach-Object {
  $hasLogger = Select-String "logger\." $_.FullName -ErrorAction SilentlyContinue
  if (-not $hasLogger) { Write-Host "MISSING LOGGER: $($_.FullName)" }
}

# 10. Timeout: gibt es Request-Timeouts?
Select-String "timeout\|AbortController\|signal" lib,app -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 11. DSGVO: Datenlöschung-Route
Select-String "delete.*project\|lösch\|datenlöschung\|DSGVO" app/api -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 12. robots.txt Check vor Scraping
Select-String "robots\|robotsTxt\|robot" lib/scraper -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 5
```

**Bekannte Lücken (Stand Mai 2026, aus plan.md NFA-Constraints):**

| Anforderung (plan.md) | Ist-Stand (Exploration 2026-05-16) | Priorität |
|---|---|---|
| Max. 3 gleichzeitige Generierungen (NFA-18) | ✅ **ERLEDIGT** — `lib/generation/queue.ts` MAX_CONCURRENT=3, `tryEnqueue()` | — |
| Rate-Limiting auf API-Routen | ✅ Modul `lib/ratelimit/index.ts` vorhanden · ⚠️ Middleware-Integration **fehlt noch** | MUSS |
| DSGVO: Datenlöschung ≤24h | Prisma `onDelete: Cascade` für die meisten Relationen vorhanden · `app/api/projects/[id]/route.ts` (DELETE) **existiert nicht** | MUSS |
| CSP-Header | ❌ **Fehlt** in `next.config.mjs` | MUSS |
| Request-Timeout auf KI-Calls | ❌ **Fehlt** — `anthropic.messages.create` in `themes.ts`/`texts.ts` ohne `signal` | SOLL |
| Input-Validierung (Zod) auf POST-Routen | Teilweise · `/api/projects/[id]/social-post` nutzt nur `typeof`-Checks (kein Zod) | MUSS |
| Error-Boundaries in App Router | ✅ **ERLEDIGT** — `app/(dashboard)/error.tsx` vollständig implementiert | — |
| Strukturiertes Logging auf allen API-Routen | Teilweise (viele Routen ohne `logger.*`) | SOLL |
| robots.txt-Check vor Crawl | ✅ **SCOPE-OUT** — `lib/scraper/client.ts:checkRobotsRemote()` vorhanden | — |

---

## CRITICAL: Self-review Checklist

- [ ] Concurrency-Limiter: ✅ bereits via `lib/generation/queue.ts` (MAX_CONCURRENT=3) — nicht anfassen
- [ ] Rate-Limiter global: max 60 Req/Min pro IP in `middleware.ts` (SSE-Streams + /api/healthz ausgenommen)
- [ ] CSP-Header in `next.config.mjs` konfiguriert
- [ ] DSGVO: Projekt-Löschung kaskadiert alle zugehörigen Daten (CostEntries, AuditLog, etc.)
- [ ] Input-Validierung (Zod) auf allen POST/PUT-Routen die User-Input akzeptieren
- [ ] Error-Boundaries: `error.tsx` in relevanten Route-Segmenten
- [ ] Request-Timeout auf externe Calls (KI, Scraper) mit AbortController
- [ ] Kein stiller Catch eingeführt
- [ ] Kein PII in Logs
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün (bestehende Tests nicht gebrochen)
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — Concurrency-Limiter + Rate-Limiting + CSP

**Aufwand:** ~5–6 Stunden  
**Scope:** Infrastrukturelle Härtung: Concurrency, Rate-Limit, Security-Header.

### IN

```
lib/ratelimit/index.ts                         BEREITS — nicht anfassen (In-Memory Rate-Limiter vorhanden)
middleware.ts                                  MOD — Rate-Limiter global integrieren (nutzt lib/ratelimit/index.ts)
next.config.mjs                                MOD — CSP + Security-Header
```

### OUT

```
lib/generation/texts.ts                        NICHT anfassen
lib/generation/themes.ts                       NICHT anfassen
components/                                    NICHT anfassen (Sub-Slice B)
```

### A1 — Concurrency-Limiter (SKIP — bereits erledigt)

> ✅ `lib/generation/queue.ts` implementiert bereits `MAX_CONCURRENT = 3` und
> `tryEnqueue()` mit vollständiger Queue-Logik inkl. SSE-Event `queue_position`.
> `app/api/generate/start/route.ts` nutzt `tryEnqueue()` — kein neues File nötig.

### A2 — Rate-Limiter (SKIP — bereits erledigt)

> ✅ `lib/ratelimit/index.ts` implementiert bereits `rateLimit(key, max, windowMs)`.
> In-Memory-Store, Sliding Window, Cleanup-Intervall vorhanden.
> Bereits genutzt in `app/api/generate/start/route.ts:14`.
> Kein neues File nötig.

### A3 — Middleware: Rate-Limit-Integration (AKTION)

```typescript
// In middleware.ts — nutzt bestehendes lib/ratelimit/index.ts:
// Für /api/*-Routen (ausser /api/auth/*, /api/healthz, /api/generate/stream/*):
//   IP aus x-forwarded-for ?? request.ip ?? 'unknown'
//   rateLimit(ip, 60, 60_000) → false → 429 mit Header Retry-After: 60
//
// WICHTIG: /api/generate/stream/* AUSSCHLIESSEN — SSE-Langverbindungen
//   würden sonst nach 60 Requests sofort terminiert
// WICHTIG: /api/healthz AUSSCHLIESSEN — Healthcheck darf nicht geblockt werden
```

### A4 — CSP + Security-Header in next.config.mjs

```javascript
// In next.config.mjs → headers():
// Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';
//   style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// Referrer-Policy: strict-origin-when-cross-origin
// Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### A5 — Concurrency-Check in /api/generate/start (SKIP — bereits erledigt)

> ✅ `app/api/generate/start/route.ts:56` nutzt bereits `tryEnqueue(job.id, ...)` aus
> `lib/generation/queue.ts`. Bei vollem Slot (>= 3 laufende Jobs) wird der Job
> in Warteschlange eingereiht (Status `queued`, SSE-Event `queue_position`) —
> **kein 429**, sondern Queue-Semantik (UX-freundlicher als Ablehnen).

### Acceptance Checklist

- [ ] 4. Generierung bei 3 laufenden → 429 mit verständlicher Meldung
- [ ] 61. Request/Minute von gleicher IP → 429 mit Retry-After
- [ ] CSP-Header in Response-Headers sichtbar (DevTools → Network)
- [ ] X-Frame-Options: DENY in Response
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(nfa): Concurrency-Limiter + Rate-Limiting + CSP-Header (Phase 4 NFA Sub-A)
```

---

## Sub-Slice B — DSGVO-Löschung + Input-Validierung + Error-Boundaries + Timeouts

**Aufwand:** ~5–6 Stunden  
**Scope:** Datenschutz-Compliance, robuste Eingabeprüfung, UI-Fehlergrenzen.

### IN

```
app/api/projects/[id]/route.ts                 MOD — DELETE: vollständige Kaskade + Audit
lib/generation/pipeline.ts                     MOD — AbortController-Timeout auf KI-Calls
app/(dashboard)/error.tsx                      NEU/PRÜFEN — Error-Boundary
app/(dashboard)/projects/[id]/error.tsx        NEU — Projekt-spezifische Error-Boundary
app/api/projects/[id]/seo/route.ts             MOD — Zod-Validierung (Beispiel-Route)
app/api/projects/[id]/social-post/route.ts     MOD — Zod-Validierung
```

### OUT

```
lib/generation/concurrency.ts                  NICHT anfassen (Sub-Slice A)
middleware.ts                                  NICHT anfassen (Sub-Slice A)
next.config.mjs                                NICHT anfassen (Sub-Slice A)
```

### B1 — DSGVO: Projekt-Löschung vollständig

```typescript
// In app/api/projects/[id]/route.ts → DELETE Handler:
// 1. Auth + Ownership-Check
// 2. Audit-Log: "Projekt gelöscht" (vor Löschung!)
// 3. Prisma-Transaction:
//    - CostEntries (projectId) → löschen
//    - AuditLogs (projectId) → löschen (nach Audit-Eintrag)
//    - GenerationJobs (projectId) → löschen
//    - ShareLinks (projectId) → löschen
//    - Comments (projectId) → löschen
//    - ContentApprovals (projectId) → löschen
//    - InvitationTokens (projectId) → löschen
//    - PraxisUsers (projectId? — prüfen) → löschen
//    - Project selbst → löschen
// 4. Logger: erfolgreiche Löschung
// 5. Response: 204 No Content
//
// Prüfen: Prisma onDelete: Cascade auf allen Relationen?
// Falls nicht: explizit in Transaction löschen
```

### B2 — Request-Timeout auf KI-Calls

```typescript
// In lib/generation/pipeline.ts oder lib/ai/client.ts:
// AbortController mit 120s Timeout für KI-Calls
// Bei Timeout: AbortError → logger.error + sauberer Job-Status 'ERROR'

const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 120_000)
try {
  const response = await fetch(url, { signal: controller.signal, ... })
} finally {
  clearTimeout(timeout)
}
```

### B3 — Input-Validierung: Zod auf POST-Routen

```typescript
// Muster für alle POST/PUT-Routen die Body akzeptieren:
import { z } from 'zod'

const RequestSchema = z.object({
  index: z.number().int().min(0),
  kanal: z.string().min(1),
  text: z.string().min(1).max(10_000),
})

export async function POST(req: Request, ...) {
  const body = await req.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() }, { status: 400 })
  }
  // ... weiter mit parsed.data
}
```

Routen die Input-Validierung brauchen (Exploration bestätigt welche fehlen):
- `/api/projects/[id]/social-post` — hat teilweise, Zod ergänzen
- `/api/projects/[id]/seo` — neu (Sprint P4-A)
- `/api/generate/start` — prüfen
- `/api/hedy/import` — prüfen
- `/api/projects/clone` — prüfen

### B4 — Error-Boundaries

```typescript
// app/(dashboard)/error.tsx — Globale Fehlergrenze für Dashboard
'use client'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-lg font-bold text-red-700">Unerwarteter Fehler</h2>
      <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      <button onClick={reset} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
        Erneut versuchen
      </button>
    </div>
  )
}
```

### Acceptance Checklist

- [ ] Projekt-Löschung: alle zugehörigen Daten in DB gelöscht (kein Orphan)
- [ ] KI-Call > 120s → sauberer Abbruch mit Error-Status im Job
- [ ] POST ohne Body / mit ungültigem Body → 400 mit Zod-Fehlern
- [ ] Dashboard-Error: unerwarteter Serverfehler → freundliche Fehlermeldung + Retry
- [ ] Kein PII in Fehlerresponses (keine Stack-Traces an Client)
- [ ] TypeScript: 0 Fehler
- [ ] Bestehende Tests nicht gebrochen

### Commit-Message

```
feat(nfa): DSGVO-Löschkaskade + Timeouts + Input-Validierung + Error-Boundaries (Phase 4 NFA Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Concurrency-Limiter vorhanden
Select-String "acquireGenerationSlot\|MAX_CONCURRENT" lib/generation -Recurse
# → Mindestens 2 Treffer

# Rate-Limiter vorhanden
Select-String "checkRateLimit\|rate-limit" lib/utils,middleware.ts -Recurse -i
# → Mindestens 2 Treffer

# CSP-Header konfiguriert
Select-String "Content-Security-Policy\|contentSecurityPolicy" next.config.mjs
# → Mindestens 1 Treffer

# Keine neuen stillen Catches
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" lib,app -Recurse |
  Where-Object { $_.Path -notmatch "node_modules" }
# → Nur die 5 bekannten aus deviations.md (Sprint 0a)

# Error-Boundary vorhanden
Test-Path "app/(dashboard)/error.tsx"
# → True

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Redis-basiertes Rate-Limiting (Multi-Instance) | In-Memory reicht für Single-Instance VPS |
| WAF / DDoS-Protection | Cloudflare Tunnel übernimmt das |
| Automated Penetration Testing | Manuelles Security-Review nach Launch |
| GDPR Right-to-Portability (Daten-Export für User) | Nicht relevant (Single-Tenant, Agentur-intern) |
| Structured Logging → Elasticsearch/Loki | File-basiertes pino reicht für 10 Projekte |
| robots.txt-Enforcement im Scraper | Prüfen in Exploration — wenn vorhanden: Scope-Out |

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich seit 2026-05-15.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR ein Commit vorgeschlagen
> oder ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md`: "NFA-Härtung" auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint P4-C)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: ggf. NFA-Punkte schließen |
| 3 | Sprint-Prompt archivieren | `Move-Item docs/dev-prompts/sprint-p4c-nfa-haertung.md docs/dev-prompts/archive/` |
| 4 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]` |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P4-C ABSCHLUSSBERICHT
==============================

Sprint: P4-C — NFA-Härtung (Non-Functional Requirements)

SUB-SLICES:
  A Concurrency + Rate-Limit + CSP:            [ ] DONE — Commit: <hash>
  B DSGVO + Timeouts + Validierung + Errors:   [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  Concurrency-Limit aktiv:         [ ]
  Rate-Limit aktiv:                [ ]
  CSP-Header gesetzt:              [ ]
  DSGVO-Löschung vollständig:      [ ]
  Input-Validierung ergänzt:       [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P4-C ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P4-D (Performance & Stabilität)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p4c-nfa-haertung.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
