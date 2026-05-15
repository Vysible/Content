# Sprint P3-F — KPI-Dashboard & Automatischer Monatsreport (Slice 24)

**Projekt:** Vysible  
**Sprint:** P3-F  
**Format:** Tier 1 (Anforderungen klar definiert, Exploration zuerst)  
**Abhängigkeit:** Sprint P3-E ✅, Sprint P3-A ✅ (`lib/costs/aggregator.ts` aktiv)  
**Anforderungen:** plan.md Slice 24, NFA-05 (Kosten-Logging vollständig)  
**Geschätzte Dauer:** ~1,5 Tage

> **Abhängigkeitshinweis:**  
> `lib/costs/aggregator.ts` wurde in Sprint P3-A implementiert und ist die einzige  
> Datenquelle für alle KPI-Zahlen. Nicht neu implementieren — nur aufrufen.  
> `lib/costs/reporter.ts` L56: `sendNotification.catch` loggt bereits via `logger.warn`  
> (kein stiller Catch mehr). Der `docs/forge-web-deviations.md`-Eintrag ist dennoch formal zu schließen.

> **Dependency-Check:** `pdfkit` ist im Projekt verfügbar (`lib/export/pdf.ts` +  
> `lib/costs/reporter.ts`). `node-cron` ist bereits installiert (`package.json ^4.2.1`).

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus
(Phase 0 — PSR + Phase 1 — technische Gates).
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.
Bei GO: Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# lib/costs/aggregator.ts — verfügbare Funktionen
Select-String "^export" lib/costs/aggregator.ts

# lib/costs/reporter.ts — stiller Catch L56 + aktueller Stand
Get-Content lib/costs/reporter.ts

# Bestehende KPI-Seite
Get-ChildItem app/(dashboard)/kpi -Recurse -Name -ErrorAction SilentlyContinue

# Bestehende KPI-API-Routen (aus P3-A: /api/kpi/costs/*)
Get-ChildItem app/api/kpi -Recurse -Name -ErrorAction SilentlyContinue

# pdfkit verfügbar? (Referenzimplementierung)
Get-Content lib/export/pdf.ts | Select-Object -First 5
Select-String "pdfkit" package.json

# node-cron vorhanden?
Select-String "node-cron\|nodeCron\|cron" package.json,lib,app -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# MonthlyReport-Modell in Prisma (für Report-History)?
Select-String "model.*Report\|MonthlyReport\|report.*history" prisma/schema.prisma -i

# Bestehende KPI-Komponenten
Get-ChildItem components/kpi -Recurse -Name -ErrorAction SilentlyContinue

# WP/KT-Status-Felder am Artefakt (für Pro-Projekt-KPI)
Select-String "wpDraftStatus\|ktCampaignId\|ktStatus" prisma/schema.prisma -i

# Chat-Iterationen / Revisionen am Artefakt?
Select-String "revisionCount\|chatIterations\|revision" prisma/schema.prisma -i

# Wo ist der App-Startup / Server-Einstiegspunkt für Cron?
Get-ChildItem app -Name "instrumentation.ts" -ErrorAction SilentlyContinue
Get-ChildItem lib -Name "cron*","scheduler*" -ErrorAction SilentlyContinue
```

**Bekannte Lücken (Stand Mai 2026, aus Roadmap + plan.md + deviations.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/costs/reporter.ts` | `deviations.md`-Eintrag formal schließen + `generateMonthlyReport` → `Promise<string>` (pdfPath) | MUSS |
| `app/(dashboard)/kpi/page.tsx` | Fehlend | MUSS |
| `components/kpi/CostChart.tsx` | Fehlend — Sparkline 6 Monate | MUSS |
| `components/kpi/ProjectKPICard.tsx` | Fehlend | MUSS |
| `components/kpi/MonthlyOverview.tsx` | Fehlend | MUSS |
| `app/api/kpi/route.ts` | Fehlend — globale KPI-Aggregation | MUSS |
| Cron-Job (node-cron) | Fehlend — Monatsreport automatisch | MUSS |
| `prisma/schema.prisma` | `MonthlyReport`-Modell für Report-History fehlt ggf. | PRÜFEN |

---

## CRITICAL: Self-review Checklist

- [ ] Alle KPI-Zahlen kommen ausschliesslich aus `lib/costs/aggregator.ts` — kein direktes `db.costEntry.findMany` in Route-Handlern oder Komponenten
- [ ] `deviations.md`-Eintrag `lib/costs/reporter.ts:56` formal geschlossen (catch loggt bereits — nur Eintrag entfernen)
- [ ] PDF-Report: keine PII, keine verschlüsselten Keys in generiertem PDF
- [ ] `lib/cron/scheduler.ts` erweitert: `sendMonthlyReport` nach `generateMonthlyReport`-Aufruf
- [ ] Report-History: max. 12 Reports gespeichert (älteste löschen)
- [ ] `node-cron` bereits installiert (`^4.2.1`) — kein `pnpm add` nötig
- [ ] Alle Catches loggen — kein stiller Catch
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — KPI-Daten + API + Dashboard-UI

**Aufwand:** ~5–6 Stunden  
**Scope:** Globale und Pro-Projekt-KPI-API, KPI-Dashboard-Seite, Komponenten.

### IN

```
app/api/kpi/route.ts                            NEU — globale KPI-Aggregation
app/(dashboard)/kpi/page.tsx                    NEU — KPI-Dashboard (Server-Komponente)
components/kpi/MonthlyOverview.tsx              NEU — Globale Übersicht (Server-Komponente)
components/kpi/ProjectKPICard.tsx               NEU — Pro-Projekt-KPI-Karte
components/kpi/CostChart.tsx                    NEU — Sparkline 6 Monate (Client-Komponente)
prisma/schema.prisma                            MOD — MonthlyReport-Modell (falls fehlt)
```

### OUT

```
lib/costs/aggregator.ts                         NICHT anfassen (nur aufrufen)
lib/costs/reporter.ts                           NICHT anfassen (Sub-Slice B)
app/api/kpi/costs/                              NICHT anfassen (aus P3-A)
```

### A1 — Prisma: MonthlyReport-Modell (falls fehlt)

```prisma
model MonthlyReport {
  id          String   @id @default(cuid())
  period      String   @unique  // Format: "2026-05" (JJJJ-MM) — konsistent mit CostReport
  pdfPath     String            // Lokaler Pfad oder relativer Pfad im Container
  generatedAt DateTime @default(now())
  sentAt      DateTime?
}
```

Migration: `pnpm prisma migrate dev --name add_monthly_report`

### A2 — app/api/kpi/route.ts

```typescript
// GET /api/kpi — globale KPI-Zusammenfassung
// Auth-Check + Role-Check (nur eingeloggte Nutzer)
// Kombiniert:
//   - getGlobalKpis() aus aggregator.ts  (liefert GlobalKpis — alle 7 KPIs)
//   - db.project.count({ where: { archived: false } }) für aktive Projekte
//   - db.comment.count(...) für ausstehende Praxis-Freigaben (aus Sprint P3-C)
//   - Generierte Artefakt-Zahlen (Artikel / Newsletter / Social Posts kumuliert)
// Response: { kpis: GlobalKpis, projects: { total, active, archived },
//             generatedContent: { articles, newsletters, socialPosts },
//             pendingApprovals: number }
```

### A3 — KPI-Dashboard (app/(dashboard)/kpi/page.tsx)

Server-Komponente. Ruft `/api/kpi` (oder direkt Funktionen) auf und rendert:

1. **Globale KPI-Leiste** (`MonthlyOverview`)
   - Projekte gesamt / aktiv
   - Generierter Content (Artikel / Newsletter / Social) — laufender Monat + kumuliert
   - KI-Kosten: laufender Monat / letzter Monat / kumuliert
   - Ø Kosten pro Content-Paket
   - Offene Praxis-Freigaben (Badge)

2. **Pro-Projekt-Karten** (`ProjectKPICard` pro Projekt)
   - Projektname
   - KI-Kosten: gesamt / letztes Paket
   - `CostChart` — Sparkline der letzten 6 Monate
   - WP-Drafts (wenn WP verbunden)
   - KT-Kampagnen (wenn KT verbunden)
   - Praxis-Freigaben ausstehend (Badge)

3. **Report-History** — letzte 12 PDF-Reports als Download-Links

### A4 — CostChart (Client-Komponente)

```typescript
// components/kpi/CostChart.tsx
'use client';
// Props: { data: Array<{ month: string, costEur: number }> } — letzte 6 Monate
// Einfache Sparkline ohne externe Chart-Bibliothek:
// SVG-Polyline als schlanke Lösung (kein recharts/chart.js installieren)
// Alternativ: Inline-Balkendiagramm mit Tailwind-Klassen
// Monats-Labels: "Jan", "Feb", ... unter der Sparkline
// Tooltip bei Hover: "März 2026: 1,26 €"
```

> **Hinweis:** Keine neue Chart-Bibliothek installieren — SVG-Sparkline oder  
> Tailwind-Balken reichen für diesen Anwendungsfall.

### Acceptance Checklist

- [ ] KPI-Dashboard zeigt korrekte Gesamtkosten (mit DB-Abfrage verifizieren)
- [ ] `CostChart` rendert für Projekt mit ≥3 Generierungen
- [ ] Globale KPI-Leiste: alle 7 KPIs sichtbar
- [ ] Pro-Projekt-Karte: Kosten + Status korrekt
- [ ] Report-History-Bereich vorhanden (auch wenn noch keine Reports vorhanden: "Noch keine Reports")
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(kpi): KPI-Dashboard + Projektübersicht + CostChart-Sparkline (Slice 24 Sub-A)
```

---

## Sub-Slice B — Reporter + Cron-Job + PDF + E-Mail-Versand

**Aufwand:** ~5–6 Stunden  
**Scope:** `lib/costs/reporter.ts` vervollständigen, pdfkit-PDF, Cron-Erweiterung, Report-History.

### IN

```
lib/costs/reporter.ts                           MOD — deviations.md formal schließen + pdfkit-PDF + Promise<string>
lib/cron/scheduler.ts                           MOD — sendMonthlyReport nach generateMonthlyReport-Aufruf
app/api/kpi/report/[period]/route.ts            NEU — PDF-Download eines gespeicherten Reports
```

### OUT

```
lib/costs/aggregator.ts                         NICHT anfassen
components/kpi/                                 NICHT anfassen (Sub-Slice A)
app/(dashboard)/kpi/page.tsx                    MOD nur für Report-History-Download-Links
```

### B1 — lib/costs/reporter.ts

```typescript
// lib/costs/reporter.ts
// deviations.md-Eintrag reporter.ts:56 formal schließen
// + generateMonthlyReport → pdfkit (architecture.md: kein puppeteer) + Promise<string>

import PDFDocument from 'pdfkit';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import fs from 'node:fs/promises';
import { logger } from '../utils/logger';
import { getGlobalKpis } from './aggregator';
import type { GlobalKpis } from './aggregator';
import { sendNotification } from '../email/mailer';
import { db } from '../db';

const REPORT_DIR = path.join(process.cwd(), 'reports');

export async function generateMonthlyReport(month: string): Promise<string> {
  // month: "2026-05" (JJJJ-MM) — konsistent mit scheduler.ts und CostReport-Modell
  await fs.mkdir(REPORT_DIR, { recursive: true });

  const kpis = await getGlobalKpis();
  const pdfPath = path.join(REPORT_DIR, `Report_${month}.pdf`);
  await buildReportPdf(pdfPath, month, kpis);
  logger.info({ month, pdfPath }, '[Vysible] Monatsreport generiert');
  return pdfPath;
}

export async function sendMonthlyReport(month: string, pdfPath: string): Promise<void> {
  // Report in DB speichern
  await db.monthlyReport.upsert({
    where: { period: month },
    create: { period: month, pdfPath, sentAt: new Date() },
    update: { sentAt: new Date() },
  });

  // Report-History auf max. 12 begrenzen
  const reports = await db.monthlyReport.findMany({ orderBy: { generatedAt: 'asc' } });
  if (reports.length > 12) {
    const toDelete = reports.slice(0, reports.length - 12);
    for (const r of toDelete) {
      await db.monthlyReport.delete({ where: { id: r.id } });
      await fs.unlink(r.pdfPath).catch((err: unknown) => {
        logger.warn({ err }, '[Vysible] Altes Report-PDF konnte nicht gelöscht werden');
      });
    }
  }

  // E-Mail an alle Admins
  await sendNotification('monthly_report', `Report ${month}`).catch((err: unknown) => {
    logger.warn({ err }, '[Vysible] Monatsreport-E-Mail fehlgeschlagen — Report liegt in DB');
  });
}

function buildReportPdf(pdfPath: string, month: string, kpis: GlobalKpis): Promise<void> {
  // pdfkit — kein puppeteer (architecture.md §Tech-Stack: kein puppeteer)
  // Enthält: Titel, Datum, globale KPI-Tabelle, Pro-Projekt-Aufschlüsselung
  // Kein PII — nur Projekt-IDs / Namen und Kostenzahlen
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(18).font('Helvetica-Bold').text(`Monatsreport ${month}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).font('Helvetica');
    doc.text(`Projekte gesamt: ${kpis.projectsTotal}  |  Aktiv: ${kpis.projectsActive}`);
    doc.text(`Artikel: ${kpis.articlesGenerated}  |  Newsletter: ${kpis.newslettersGenerated}  |  Social: ${kpis.socialPostsGenerated}`);
    doc.moveDown();
    doc.fontSize(13).font('Helvetica-Bold').text('KI-Kosten');
    doc.fontSize(11).font('Helvetica');
    doc.text(`Laufender Monat: ${kpis.currentMonthEur.toFixed(4)} €`);
    doc.text(`Letzter Monat:   ${kpis.lastMonthEur.toFixed(4)} €`);
    doc.text(`Gesamt:          ${kpis.totalCostEur.toFixed(4)} €`);
    doc.text(`Ø pro Paket:     ${kpis.avgCostPerPackage.toFixed(4)} €`);
    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
```

> **Hinweis:** `buildReportPdf` vollständig implementieren mit allen KPIs aus `GlobalKpis`.
> pdfkit-API: `doc.text()`, `doc.moveDown()`, `doc.fontSize()` — kein HTML, kein puppeteer.

### B2 — Cron-Job (lib/cron/scheduler.ts erweitern)

```typescript
// lib/cron/scheduler.ts — MOD: sendMonthlyReport nach generateMonthlyReport
// instrumentation.ts NICHT anfassen — delegiert bereits an startCronJobs()

// Import-Zeile anpassen (bestehenden generateMonthlyReport-Import ergänzen):
import { generateMonthlyReport, sendMonthlyReport } from '@/lib/costs/reporter'

// Cron-Job-Body ersetzen (0 6 1 * *):
cron.schedule('0 6 1 * *', async () => {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  logger.info({ month }, '[Vysible] Cron: Monatsreport starten')
  try {
    const pdfPath = await generateMonthlyReport(month)
    await sendMonthlyReport(month, pdfPath)
  } catch (exc: unknown) {
    logger.error({ err: exc, month }, '[Vysible] Automatischer Monatsreport fehlgeschlagen')
  }
})
```

> **Hinweis:** `node-cron` ist bereits installiert (`^4.2.1`). `instrumentation.ts` NICHT anfassen.

### B3 — Report-Download-Route

```typescript
// app/api/kpi/report/[period]/route.ts
// GET /api/kpi/report/2026-05  (period = JJJJ-MM als URL-Segment)
// Auth-Check (nur eingeloggte Nutzer)
// → db.monthlyReport.findUnique({ where: { period } })
// → fs.readFile(report.pdfPath)
// → Response mit Content-Type: application/pdf, Content-Disposition: attachment; filename=Report_[period].pdf
```

### Acceptance Checklist

- [ ] `generateMonthlyReport` generiert ein valides PDF (pdfkit) mit allen KPIs aus `GlobalKpis`
- [ ] PDF enthält kein PII und keine verschlüsselten Keys
- [ ] `lib/cron/scheduler.ts` erweitert: `sendMonthlyReport`-Aufruf nach `generateMonthlyReport`
- [ ] Cron manuell ausgelöst → PDF in `reports/`-Verzeichnis vorhanden
- [ ] E-Mail nach Report-Generierung versendet (logger.warn bei Fehler, kein Crash)
- [ ] Report-History: Download-Links für die letzten ≤12 Reports funktionieren
- [ ] `deviations.md`-Eintrag `reporter.ts:56` formal geschlossen
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(kpi): Reporter + PDF-Cron + Report-History-Download (Slice 24 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Kein direktes db.costEntry in Route-Handlern (nur aggregator.ts)
Select-String "db\.costEntry\." app/api/kpi,app/(dashboard)/kpi -Recurse -ErrorAction SilentlyContinue
# → Zero Treffer (Kosten-Zugriff nur via aggregator.ts)

# Stiller Catch aus deviations.md geschlossen
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" lib/costs/reporter.ts
# → Zero Treffer

# node-cron installiert (bereits vorhanden)
Select-String "node-cron" package.json
# → Treffer (^4.2.1)

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Qualitäts-Score-Berechnung (KI-basiert) | Phase 4 |
| Interaktive Chart-Bibliothek (recharts) | SVG-Sparkline reicht für Phase 3 |
| Report-E-Mail mit PDF als Attachment | nodemailer-Attachment-Konfiguration — Erweiterung Sprint 0a |
| Kosten-Trending-Anomalie-Detection | Phase 4 |
| KPI-Alerts in Echtzeit (WebSocket) | Phase 4 |

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
SPRINT P3-F ABSCHLUSSBERICHT
==============================

Sprint: P3-F — KPI-Dashboard + Automatischer Monatsreport (Slice 24)

SUB-SLICES:
  A KPI-Dashboard + API + Komponenten:  [ ] DONE — Commit: <hash>
  B Reporter + Cron + PDF + History:    [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  Aggregator-only KPI-Daten:       [ ]
  Stiller Catch geschlossen:       [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P3-F ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P3-G (Fachgebiet-Templates + Klon — Slice 25)
▶ deviations.md: lib/costs/reporter.ts:56 als geschlossen markieren
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p3f-kpi-dashboard.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
