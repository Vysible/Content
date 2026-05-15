# Sprint P4-D — Performance & Stabilität

**Projekt:** Vysible  
**Sprint:** P4-D  
**Format:** Tier 3 (Exploration dominiert — querschnittliche Optimierung)  
**Abhängigkeit:** Sprint P4-C ✅  
**Anforderungen:** plan.md Phase 4 DoD ("Stabiler Betrieb mit 10+ Projekten")  
**Geschätzte Dauer:** ~2 Tage

> **Ziel:** Vysible läuft stabil mit 10+ aktiven Projekten auf dem Hostinger VPS.  
> Fokus: DB-Query-Optimierung, Connection-Pooling, Bundle-Size-Reduktion,  
> SSE-Connection-Management, Generation-Queue, Memory-Monitoring,  
> und Lazy-Loading in der UI.

> **Hinweis:** Dieser Sprint hat keinen eigenen Slice im plan.md.  
> Die Anforderungen leiten sich aus dem Phase-4-DoD ab:  
> "Content übertrifft manuelle Beispiele. Stabiler Betrieb mit 10+ Projekten."

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus
(Phase 0 — PSR + Phase 1 — technische Gates).
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.
Bei GO: Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Prisma: DB-Connection-Pool-Konfiguration
Select-String "connection_limit\|pool\|pgbouncer" prisma/schema.prisma,.env.example -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 5

# 2. Prisma: ineffiziente Queries (findMany ohne select/take)
Select-String "findMany\(\s*\)" lib,app -Recurse |
  Select-Object Path, LineNumber, Line | Select-Object -First 15

# 3. Prisma: N+1-Verdacht (verschachtelte Schleifen mit DB-Call)
Select-String "for.*await.*prisma\|forEach.*await.*prisma" lib,app -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 4. SSE: wie werden Verbindungen gehalten?
Select-String "ReadableStream\|SSE\|text/event-stream" app/api -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 5. Bundle-Analyse: gibt es heavy imports?
Select-String "import.*from.*'puppeteer\|import.*from.*'playwright" lib,app -Recurse |
  Select-Object Path, LineNumber, Line | Select-Object -First 5

# 6. Dynamic imports: bereits genutzt?
Select-String "dynamic\(\|next/dynamic\|lazy\(" app,components -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 7. Generation-Queue: Wie werden Jobs verwaltet?
Get-Content lib/generation/job-store.ts -ErrorAction SilentlyContinue | Select-Object -First 40

# 8. Docker: Memory-Limits gesetzt?
Select-String "mem_limit\|memory\|deploy.*resources" docker-compose.prod.yml -i

# 9. Prisma-Schema: fehlende Indexes
Select-String "@@index\|@unique" prisma/schema.prisma | Select-Object -First 20

# 10. Wie viele API-Routen gibt es insgesamt?
(Get-ChildItem app/api -Recurse -Filter "route.ts").Count

# 11. JSON-Felder (textResults, themeResults): Größe bei 10 Projekten?
Select-String "Json\?" prisma/schema.prisma

# 12. Next.js: ISR/Static/Dynamic-Rendering Konfiguration
Select-String "export const dynamic\|export const revalidate\|generateStaticParams" app -Recurse |
  Select-Object Path, LineNumber, Line | Select-Object -First 10
```

**Bekannte Performance-Risiken (Stand Mai 2026):**

| Bereich | Risiko | Priorität |
|---|---|---|
| DB-Queries | `findMany()` ohne `select` lädt alle Felder inkl. JSON-Blobs | MUSS |
| JSON-Spalten | `textResults` kann 50+ KB pro Projekt werden (6 Blog × HTML) | MUSS |
| SSE-Connections | Keine Cleanup-Logik bei Client-Disconnect? | MUSS |
| Connection-Pool | Prisma Default (5 Connections) ggf. zu wenig für 10 Projekte | MUSS |
| Bundle-Size | Puppeteer/Playwright-Imports in Next.js-Bundle? | PRÜFEN |
| Generation-Queue | Kein Prioritäts-/FIFO-Queue — nur Concurrency-Limit | SOLL |
| Docker-Memory | Playwright-Container: 512MB gesetzt, App-Container? | PRÜFEN |

---

## CRITICAL: Self-review Checklist

- [ ] DB-Queries: `select` auf allen `findMany`/`findFirst` (nur benötigte Felder)
- [ ] Prisma Connection-Pool-Size via `DATABASE_URL?connection_limit=10`
- [ ] SSE: AbortSignal-Listener für Client-Disconnect → Stream schließen
- [ ] JSON-Felder: bei Listen-Abfragen NICHT laden (nur bei Detail-Ansicht)
- [ ] Bundle: keine Server-only-Packages in Client-Imports
- [ ] Next.js Dynamic Imports für schwere Komponenten (Editor, Kalender)
- [ ] Docker: Memory-Limit für App-Container gesetzt
- [ ] Kein stiller Catch eingeführt
- [ ] Kein Breaking Change an bestehenden APIs
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — DB-Optimierung + Connection-Pooling + SSE-Cleanup

**Aufwand:** ~5–6 Stunden  
**Scope:** Query-Optimierung, Pool-Konfiguration, SSE-Lifecycle-Management.

### IN

```
lib/db.ts                                      MOD — Connection-Pool-URL-Parameter
app/api/generate/status/route.ts               MOD — SSE-Cleanup bei Disconnect (falls SSE hier)
app/api/projects/route.ts                      MOD — select statt Vollladung
app/(dashboard)/projects/page.tsx              MOD — Keine JSON-Blobs in Listen
prisma/schema.prisma                           MOD — fehlende Indexes ergänzen
.env.example                                   MOD — connection_limit Hinweis
```

### OUT

```
components/                                    NICHT anfassen (Sub-Slice B)
next.config.mjs                                NICHT anfassen (Sub-Slice A nur DB/SSE)
docker-compose.prod.yml                        NICHT anfassen (Sub-Slice B)
```

### A1 — Prisma: Connection-Pool explizit

```
# .env / .env.example:
# connection_limit=10 für VPS mit 10+ aktiven Projekten
DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=30"
```

### A2 — Query-Optimierung: select verwenden

```typescript
// VORHER (Projektliste):
const projects = await prisma.project.findMany({
  where: { createdById: session.user.id },
})
// → Lädt textResults (50KB+), themeResults, scrapedData — alles unnötig

// NACHHER:
const projects = await prisma.project.findMany({
  where: { createdById: session.user.id },
  select: {
    id: true, name: true, praxisName: true, status: true,
    fachgebiet: true, createdAt: true, updatedAt: true,
    channels: true, planningStart: true, planningEnd: true,
  },
  orderBy: { updatedAt: 'desc' },
})
```

### A3 — Fehlende Indexes

```prisma
// In prisma/schema.prisma — Indexes die bei 10+ Projekten Performance sichern:
model Project {
  // ...
  @@index([createdById, updatedAt])    // Projektliste sortiert
  @@index([status])                     // Filterung nach Status
}

model CostEntry {
  // ...
  @@index([projectId, timestamp])      // Kosten-Aggregation
}

model AuditLog {
  // ...
  @@index([projectId, createdAt])      // Audit-Anzeige
}

model GenerationJob {
  // ...
  @@index([status, createdAt])         // Queue-Management
}
```

### A4 — SSE-Cleanup bei Client-Disconnect

```typescript
// In der SSE-Route (app/api/generate/status/route.ts oder ähnlich):
// ReadableStream mit cancel()-Callback:
const stream = new ReadableStream({
  start(controller) { /* ... */ },
  cancel() {
    // Client hat Verbindung geschlossen → Cleanup
    logger.info({ projectId }, '[Vysible] SSE-Verbindung geschlossen (Client-Disconnect)')
    // Ggf. Interval/Subscription aufräumen
  }
})
// + req.signal.addEventListener('abort', cleanup)
```

### Acceptance Checklist

- [ ] Projektliste lädt ohne JSON-Blob-Felder (Network-Tab: Response < 5KB pro Projekt)
- [ ] `connection_limit=10` in `.env.example` dokumentiert
- [ ] Mindestens 3 neue Indexes in Prisma-Schema
- [ ] SSE: Client-Tab schließen → Server-Log zeigt Cleanup
- [ ] TypeScript: 0 Fehler
- [ ] Migration: `pnpm prisma migrate dev --name performance_indexes`

### Commit-Message

```
perf(db): Query-Optimierung + Connection-Pool + Indexes + SSE-Cleanup (Phase 4 Perf Sub-A)
```

---

## Sub-Slice B — Bundle-Size + Lazy-Loading + Docker-Memory + Queue

**Aufwand:** ~4–5 Stunden  
**Scope:** Frontend-Optimierung, Memory-Limits, Generation-Queue-Verbesserung.

### IN

```
app/(dashboard)/projects/[id]/page.tsx         MOD — Dynamic Import für Editor/Kalender
components/calendar/ContentCalendar.tsx        MOD — lazy-loaded (next/dynamic)
docker-compose.prod.yml                        MOD — Memory-Limit für App-Container
lib/generation/job-store.ts                    MOD — FIFO-Queue mit Priorität
next.config.mjs                                MOD — Bundle-Analyzer (optional dev-dep)
```

### OUT

```
prisma/schema.prisma                           NICHT anfassen (Sub-Slice A)
lib/db.ts                                      NICHT anfassen (Sub-Slice A)
```

### B1 — Dynamic Imports für schwere Komponenten

```typescript
// In app/(dashboard)/projects/[id]/page.tsx oder Layout:
import dynamic from 'next/dynamic'

const ContentCalendar = dynamic(
  () => import('@/components/calendar/ContentCalendar'),
  { loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
)

const TextEditor = dynamic(
  () => import('@/components/editor/TextEditor'),
  { ssr: false, loading: () => <div className="animate-pulse h-48 bg-gray-100 rounded" /> }
)
```

### B2 — Docker-Memory-Limit für App-Container

```yaml
# docker-compose.prod.yml
services:
  app:
    # ...
    deploy:
      resources:
        limits:
          memory: 1024m    # 1GB für Next.js App
        reservations:
          memory: 512m
```

### B3 — Generation-Queue: FIFO mit Status-Tracking

```typescript
// lib/generation/job-store.ts
// Erweiterung: wenn Concurrency-Limit erreicht (Sub-A Sprint P4-C):
// - Job bekommt Status 'QUEUED' (nicht 'RUNNING')
// - Nächster Job wird gestartet wenn ein laufender fertig wird
// - Queue-Position in SSE-Updates an Client melden:
//   "Position 2 von 3 in der Warteschlange"
//
// Keine externe Queue-Library nötig — DB-basiert:
// SELECT * FROM generation_jobs WHERE status = 'QUEUED' ORDER BY createdAt ASC LIMIT 1
```

### B4 — Bundle-Size: Server-only-Packages prüfen

```typescript
// Sicherstellen dass diese Packages NICHT im Client-Bundle landen:
// - puppeteer (sollte nur in services/playwright sein)
// - pino + pino-pretty (nur Server)
// - @prisma/client (nur Server)
//
// Prüfung: ANALYZE=true pnpm build → .next/analyze/client.html
// Falls nötig: next.config.mjs → serverExternalPackages erweitern
```

### Acceptance Checklist

- [ ] ContentCalendar wird lazy-loaded (Netzwerk: separater Chunk)
- [ ] TextEditor wird nur client-seitig geladen (`ssr: false`)
- [ ] Docker: `memory: 1024m` im App-Service gesetzt
- [ ] Queued-Jobs: Position wird in UI angezeigt (SSE-Update)
- [ ] Kein `puppeteer` oder `pino` im Client-Bundle
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
perf(bundle): Lazy-Loading + Docker-Memory + Generation-Queue-FIFO (Phase 4 Perf Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Query-Optimierung: select verwendet
Select-String "findMany\(\s*\)" app/api/projects/route.ts
# → Zero Treffer (alle findMany haben select/where)

# Indexes in Migration
Get-ChildItem prisma/migrations -Directory | Select-Object -Last 1 | Get-ChildItem -Name
# → Neueste Migration enthält CREATE INDEX

# Dynamic Import vorhanden
Select-String "next/dynamic\|dynamic\(" app/(dashboard) -Recurse |
  Select-Object Path, LineNumber, Line | Select-Object -First 5
# → Mindestens 2 Treffer

# Docker Memory-Limit
Select-String "memory.*1024\|mem_limit" docker-compose.prod.yml
# → 1 Treffer

# SSE-Cleanup
Select-String "cancel\(\)\|abort.*cleanup\|disconnect" app/api -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 5

# Kein stiller Catch
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" lib,app -Recurse |
  Where-Object { $_.Path -notmatch "node_modules" }
# → Nur die 5 bekannten aus deviations.md (Sprint 0a)

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Redis-Cache für häufige DB-Queries | Overkill für 10 Projekte — erst ab 50+ |
| CDN für statische Assets | Cloudflare Tunnel cached bereits |
| Horizontal Scaling (Multiple Instances) | Single VPS reicht für Zielgröße |
| Automatic Scaling (Kubernetes/Docker Swarm) | Nicht benötigt auf einem VPS |
| APM-Tool (Datadog, New Relic) | Zu teuer — pino-Logs + Coolify-Monitoring reicht |
| DB-Sharding / Read-Replicas | Overkill für 10 Projekte |
| ISR/Static-Generation für Dashboard-Pages | Dashboard ist dynamisch — kein Caching sinnvoll |

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich seit 2026-05-15.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR ein Commit vorgeschlagen
> oder ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md`: "Performance" auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint P4-D)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: ggf. Performance-Punkte schließen |
| 3 | Sprint-Prompt archivieren | `Move-Item docs/dev-prompts/sprint-p4d-performance.md docs/dev-prompts/archive/` |
| 4 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]` |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P4-D ABSCHLUSSBERICHT
==============================

Sprint: P4-D — Performance & Stabilität

SUB-SLICES:
  A DB-Optimierung + Pool + SSE-Cleanup:       [ ] DONE — Commit: <hash>
  B Bundle + Lazy-Loading + Docker + Queue:    [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  Queries optimiert (select):      [ ]
  Indexes angelegt:                [ ]
  Lazy-Loading aktiv:              [ ]
  Docker Memory-Limit:             [ ]
  SSE-Cleanup:                     [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P4-D ABGESCHLOSSEN

═══════════════════════════════════════════════
[OK] Phase 4 ABGESCHLOSSEN — ALLE PHASEN FERTIG!
▶ Vysible ist produktionsreif für 10+ Projekte.
▶ Nächste Schritte: Launch-Vorbereitung, Monitoring, User-Feedback-Loop.
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p4d-performance.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
