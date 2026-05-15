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
> `lib/costs/reporter.ts` hat laut `docs/forge-web-deviations.md` einen stillen Catch  
> (L56, Status: Accepted, Sprint 0a). Dieser Sprint schließt diese Lücke.

> **Dependency-Check:** `puppeteer` muss im Projekt verfügbar sein (bereits für  
> `lib/export/pdf.ts` eingesetzt — Exploration bestätigt). `node-cron` ggf. neu installieren.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap: Vorgänger P3-E abgeschlossen?
Select-String "P3-E.*✅|Sprint P3-E.*✅" docs/roadmap.md -i

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
# lib/costs/aggregator.ts — verfügbare Funktionen
Select-String "^export" lib/costs/aggregator.ts

# lib/costs/reporter.ts — stiller Catch L56 + aktueller Stand
Get-Content lib/costs/reporter.ts

# Bestehende KPI-Seite
Get-ChildItem app/(dashboard)/kpi -Recurse -Name -ErrorAction SilentlyContinue

# Bestehende KPI-API-Routen (aus P3-A: /api/kpi/costs/*)
Get-ChildItem app/api/kpi -Recurse -Name -ErrorAction SilentlyContinue

# Puppeteer verfügbar?
Select-String "puppeteer" package.json
Get-Content lib/export/pdf.ts | Select-Object -First 30

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
| `lib/costs/reporter.ts` | Stiller Catch L56 + unvollständige Implementierung | MUSS |
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
- [ ] Stiller Catch in `lib/costs/reporter.ts` L56 → `logger.warn` (schließt deviations.md-Eintrag)
- [ ] PDF-Report: keine PII, keine verschlüsselten Keys in generiertem PDF
- [ ] Cron-Job läuft im App-Prozess via Next.js `instrumentation.ts` oder äquivalentem Hook
- [ ] Report-History: max. 12 Reports gespeichert (älteste löschen)
- [ ] `node-cron` via `pnpm add node-cron` installieren falls nicht vorhanden
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
  period      String   @unique  // Format: "202506" (JJJJMM)
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
//   - getGlobalCostSummary() aus aggregator.ts
//   - db.project.count({ where: { archived: false } }) für aktive Projekte
//   - db.comment.count(...) für ausstehende Praxis-Freigaben (aus Sprint P3-C)
//   - Generierte Artefakt-Zahlen (Artikel / Newsletter / Social Posts kumuliert)
// Response: { costs: GlobalCostSummary, projects: { total, active, archived },
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
**Scope:** `lib/costs/reporter.ts` vervollständigen, puppeteer-PDF, Cron, Report-History.

### IN

```
lib/costs/reporter.ts                           MOD — stillen Catch schließen + vollständige Impl.
app/api/kpi/report/[period]/route.ts            NEU — PDF-Download eines gespeicherten Reports
app/instrumentation.ts                          MOD — Cron-Job registrieren (Next.js Hook)
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
// Stiller Catch L56 schließen → logger.warn
// Vollständige Implementierung:

import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { logger } from '../utils/logger';
import { getGlobalCostSummary } from './aggregator';
import { sendNotification } from '../email/mailer';
import { db } from '../db';

const REPORT_DIR = path.join(process.cwd(), 'reports');

export async function generateMonthlyReport(period: string): Promise<string> {
  // period: "202506" (JJJJMM des abgelaufenen Monats)
  await fs.mkdir(REPORT_DIR, { recursive: true });

  const summary = await getGlobalCostSummary();
  const html = buildReportHtml(period, summary);

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfPath = path.join(REPORT_DIR, `Report_${period}.pdf`);
    await page.pdf({ path: pdfPath, format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
    logger.info({ period, pdfPath }, '[Vysible] Monatsreport generiert');
    return pdfPath;
  } finally {
    await browser.close();
  }
}

export async function sendMonthlyReport(period: string, pdfPath: string): Promise<void> {
  // Report in DB speichern
  await db.monthlyReport.upsert({
    where: { period },
    create: { period, pdfPath, sentAt: new Date() },
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
  await sendNotification('monthly_report', `Report ${period}`).catch((err: unknown) => {
    logger.warn({ err }, '[Vysible] Monatsreport-E-Mail fehlgeschlagen — Report liegt in DB');
  });
}

function buildReportHtml(period: string, summary: GlobalCostSummary): string {
  // Einfaches HTML-Dokument für puppeteer-PDF
  // Enthält: Titel, Datum, globale KPI-Tabelle, Pro-Projekt-Aufschlüsselung
  // Kein PII — nur Projekt-IDs / Namen und Kostenzahlen
  return `<!DOCTYPE html><html lang="de">...`; // vollständig implementieren
}
```

> **Hinweis:** `buildReportHtml` vollständig implementieren mit allen KPIs aus plan.md.
> Die Funktion-Signatur und Rückgabe ist fest — Inhalt nach plan.md-Spezifikation befüllen.

### B2 — Cron-Job (app/instrumentation.ts)

```typescript
// app/instrumentation.ts
// Next.js instrumentation hook — wird beim App-Start einmalig ausgeführt
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: cron } = await import('node-cron');
    const { generateMonthlyReport, sendMonthlyReport } = await import('../lib/costs/reporter');
    const { logger } = await import('../lib/utils/logger');

    // Jeden 1. des Monats um 08:00 Uhr
    cron.schedule('0 8 1 * *', async () => {
      const now = new Date();
      // Vormonat berechnen
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const period = `${prevMonth.getFullYear()}${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

      try {
        const pdfPath = await generateMonthlyReport(period);
        await sendMonthlyReport(period, pdfPath);
      } catch (exc: unknown) {
        logger.error({ err: exc }, '[Vysible] Automatischer Monatsreport fehlgeschlagen');
      }
    });

    logger.info('[Vysible] Monatsreport-Cron registriert (1. des Monats, 08:00)');
  }
}
```

> **Hinweis:** `node-cron` installieren: `pnpm add node-cron` + `pnpm add -D @types/node-cron`

### B3 — Report-Download-Route

```typescript
// app/api/kpi/report/[period]/route.ts
// GET: ?period=202506
// Auth-Check (nur eingeloggte Nutzer)
// → db.monthlyReport.findUnique({ where: { period } })
// → fs.readFile(report.pdfPath)
// → Response mit Content-Type: application/pdf, Content-Disposition: attachment; filename=Report_[period].pdf
```

### Acceptance Checklist

- [ ] `generateMonthlyReport` generiert ein valides PDF mit allen KPIs
- [ ] PDF enthält kein PII und keine verschlüsselten Keys
- [ ] Cron-Job in `instrumentation.ts` registriert (Log-Eintrag beim App-Start sichtbar)
- [ ] Cron manuell ausgelöst → PDF in `reports/`-Verzeichnis vorhanden
- [ ] E-Mail nach Report-Generierung versendet (logger.warn bei Fehler, kein Crash)
- [ ] Report-History: Download-Links für die letzten ≤12 Reports funktionieren
- [ ] Stiller Catch in `reporter.ts` L56 durch `logger.warn` ersetzt
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

# node-cron installiert
Select-String "node-cron" package.json
# → Treffer

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
