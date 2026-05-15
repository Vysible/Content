# Sprint P3-A — Kosten-Tracking pro Kunde (Slice 27)

**Projekt:** Vysible  
**Sprint:** P3-A  
**Format:** Tier 1 (Lücken präzise bekannt, Exploration trotzdem zuerst)  
**Abhängigkeit:** Sprint P2-E ✅, Sprint P2-C ✅ (SMTP aktiv)  
**Anforderungen:** plan.md Slice 27, NFA-05 (Kosten-Logging vollständig)  
**Geschätzte Dauer:** ~1 Tag

> **Erster Phase-3-Slice.** Alle nachfolgenden Phase-3-Slices (Hedy, Praxis-Portal,
> WordPress, KlickTipp, KPI-Dashboard) bauen auf der Aggregationsschicht dieses Sprints auf.
> Sauber implementieren — keine Abkürzungen.

> **Voraussetzung:** CostEntry-Tracking ist seit Phase 0 aktiv und schreibt bereits
> Einträge. Dieser Sprint fügt Aggregation, Export und Dashboard-UI hinzu.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap: Vorgänger P2-E abgeschlossen?
Select-String "P2-E.*✅|Sprint P2-E.*✅" docs/roadmap.md -i

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
# CostEntry-Modell vollständig lesen
Select-String "model CostEntry|CostEntry" prisma/schema.prisma -A 15

# Bestehender Tracker — was ist schon implementiert?
Get-Content lib/costs/tracker.ts

# Bestehendes aggregator.ts (Stub oder vollständig?)
Get-Content lib/costs/aggregator.ts -ErrorAction SilentlyContinue

# Bestehende Billing-Seite
Get-ChildItem app/(dashboard)/settings/billing -Recurse -Name -ErrorAction SilentlyContinue

# Bestehende KPI-API-Routen
Get-ChildItem app/api/kpi -Recurse -Name -ErrorAction SilentlyContinue

# Wo wird trackCost() bereits aufgerufen? (Vollständigkeits-Check)
Select-String "trackCost\|trackCostEntry\|createCostEntry" lib,app -Recurse -i |
  Select-Object Path, LineNumber, Line

# config/model-prices.ts — aktueller Stand
Get-Content config/model-prices.ts

# Bestehende Kosten-Schwellwert-Config
Select-String "costThreshold\|COST_THRESHOLD\|monthlyAlert\|alertThreshold" lib,app,prisma -Recurse -i -ErrorAction SilentlyContinue

# sendNotification-Signatur (für Schwellwert-E-Mail)
Select-String "function sendNotification\|export.*sendNotification" lib/email -Recurse
```

**Bekannte Lücken (Stand Mai 2026, aus Roadmap + plan.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/costs/aggregator.ts` | Fehlend oder unvollständig — keine Aggregationslogik | MUSS |
| `lib/costs/invoice-export.ts` | Fehlend — CSV-Export | MUSS |
| `lib/costs/threshold-checker.ts` | Fehlend — Schwellwert-Prüfung | MUSS |
| `app/api/kpi/costs/[projectId]/route.ts` | Fehlend | MUSS |
| `app/api/kpi/costs/export/route.ts` | Fehlend — CSV-Download | MUSS |
| `app/(dashboard)/settings/billing/page.tsx` | Fehlend | MUSS |
| `components/kpi/CostBreakdownTable.tsx` | Fehlend | MUSS |
| Schwellwert-Config | Kein Konfig-Feld in DB | MUSS |

---

## CRITICAL: Self-review Checklist

- [ ] `lib/costs/aggregator.ts` ist die **einzige** Stelle für Aggregationslogik —
  kein `reduce` auf CostEntries direkt in Route-Handlern oder UI-Komponenten
- [ ] CSV-Export enthält keine verschlüsselten Keys, Passwörter oder PII
- [ ] Kosten-Schwellwert aus DB, nicht hardcoded
- [ ] Schwellwert-E-Mail via bestehenden `sendNotification`-Mechanismus (lib/email/mailer.ts)
- [ ] `threshold-checker.ts` wird in `tracker.ts` aufgerufen — kein Fire-and-Forget,
  catch mit `logger.warn` (non-fatal)
- [ ] Billing-Seite nur für ADMIN zugänglich
- [ ] Alle Catches loggen (`logger.warn/error`) — kein stiller Catch
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — Aggregator + CSV-Export + API-Routen

**Aufwand:** ~4–5 Stunden  
**Scope:** Zentrale Aggregationsschicht, CSV-Export, API-Endpunkte.

### IN

```
lib/costs/aggregator.ts                         NEU/MOD — zentrale Aggregationslogik
lib/costs/invoice-export.ts                     NEU — CSV-Export
lib/costs/threshold-checker.ts                  NEU — Schwellwert-Prüfung
app/api/kpi/costs/[projectId]/route.ts          NEU — Kosten-Abfrage pro Projekt
app/api/kpi/costs/export/route.ts               NEU — CSV-Download-Endpunkt
app/api/kpi/costs/global/route.ts               NEU — Globale Übersicht
prisma/schema.prisma                            MOD — CostSettings-Modell
```

### OUT

```
lib/costs/tracker.ts                            NICHT anfassen (nur aufrufen/erweitern)
prisma/schema.prisma (CostEntry)                NICHT anfassen — nur CostSettings ergänzen
config/model-prices.ts                          NICHT anfassen (nur lesen)
```

### A1 — Prisma: CostSettings-Modell

> Exploration prüft ob CostSettings bereits vorhanden. Nur bei Fehlen hinzufügen.

```prisma
model CostSettings {
  id              String   @id @default(cuid())
  monthlyAlertEur Float    @default(50.0)
  alertEnabled    Boolean  @default(true)
  updatedAt       DateTime @updatedAt
}
```

Nach Schema-Änderung: `pnpm prisma migrate dev --name add_cost_settings`

### A2 — lib/costs/aggregator.ts

```typescript
// lib/costs/aggregator.ts
import { db } from '../db';

export interface ProjectCostSummary {
  projectId: string;
  totalEur: number;
  currentMonthEur: number;
  lastMonthEur: number;
  byStep: Record<string, number>;
  avgPerArticle: number;
  avgPerNewsletter: number;
  avgPerSocialPost: number;
  entryCount: number;
}

export interface GlobalCostSummary {
  totalEur: number;
  currentMonthEur: number;
  avgPerPackage: number;
  projectCount: number;
  byProject: ProjectCostSummary[];
}

export async function getProjectCostSummary(projectId: string): Promise<ProjectCostSummary> {
  const entries = await db.costEntry.findMany({
    where: { projectId },
    orderBy: { timestamp: 'desc' },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const totalEur = entries.reduce((sum, e) => sum + e.costEur, 0);
  const currentMonthEur = entries
    .filter(e => e.timestamp >= monthStart)
    .reduce((sum, e) => sum + e.costEur, 0);
  const lastMonthEur = entries
    .filter(e => e.timestamp >= lastMonthStart && e.timestamp < monthStart)
    .reduce((sum, e) => sum + e.costEur, 0);

  const byStep = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.step] = (acc[e.step] ?? 0) + e.costEur;
    return acc;
  }, {});

  const avgOf = (step: string) => {
    const filtered = entries.filter(e => e.step === step);
    return filtered.length
      ? filtered.reduce((s, e) => s + e.costEur, 0) / filtered.length
      : 0;
  };

  return {
    projectId,
    totalEur: round4(totalEur),
    currentMonthEur: round4(currentMonthEur),
    lastMonthEur: round4(lastMonthEur),
    byStep: Object.fromEntries(Object.entries(byStep).map(([k, v]) => [k, round4(v)])),
    avgPerArticle: round4(avgOf('blog')),
    avgPerNewsletter: round4(avgOf('newsletter')),
    avgPerSocialPost: round4(avgOf('social')),
    entryCount: entries.length,
  };
}

export async function getGlobalCostSummary(): Promise<GlobalCostSummary> {
  const projects = await db.project.findMany({ select: { id: true } });
  const byProject = await Promise.all(projects.map(p => getProjectCostSummary(p.id)));
  const totalEur = byProject.reduce((sum, p) => sum + p.totalEur, 0);
  const currentMonthEur = byProject.reduce((sum, p) => sum + p.currentMonthEur, 0);

  return {
    totalEur: round4(totalEur),
    currentMonthEur: round4(currentMonthEur),
    avgPerPackage: byProject.length ? round4(totalEur / byProject.length) : 0,
    projectCount: projects.length,
    byProject,
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
```

### A3 — lib/costs/invoice-export.ts

```typescript
// lib/costs/invoice-export.ts
import { db } from '../db';

export async function exportCostEntriesCsv(projectId: string): Promise<string> {
  const entries = await db.costEntry.findMany({
    where: { projectId },
    orderBy: { timestamp: 'asc' },
  });

  const header = 'timestamp,model,step,input_tokens,output_tokens,cost_eur';
  const rows = entries.map(e =>
    [
      e.timestamp.toISOString(),
      e.model,
      e.step,
      e.inputTokens,
      e.outputTokens,
      e.costEur.toFixed(6),
    ].join(','),
  );

  return [header, ...rows].join('\n');
}
```

### A4 — lib/costs/threshold-checker.ts

```typescript
// lib/costs/threshold-checker.ts
// Prüft nach jedem neuen CostEntry ob Monatssumme > Schwellwert.
// Sendet E-Mail wenn Schwellwert überschritten und noch keine Warnung diesen Monat.
// Non-fatal: Fehler → logger.warn, kein Rethrow.
import { db } from '../db';
import { logger } from '../utils/logger';
import { sendNotification } from '../email/mailer';

export async function checkCostThreshold(projectId: string): Promise<void> {
  try {
    const settings = await db.costSettings.findFirst();
    if (!settings?.alertEnabled) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlySum = await db.costEntry.aggregate({
      where: { projectId, timestamp: { gte: monthStart } },
      _sum: { costEur: true },
    });

    const total = monthlySum._sum.costEur ?? 0;
    if (total > settings.monthlyAlertEur) {
      // Prüfen ob Warnung diesen Monat schon versendet (via AuditLog oder separates Flag)
      // Einfachste Implementierung: immer senden wenn Schwellwert überschritten
      // TODO: De-Duplizierung in einem Folge-Sprint ergänzen
      await sendNotification('cost_threshold_exceeded', projectId);
    }
  } catch (exc: unknown) {
    logger.warn({ err: exc }, '[Vysible] Kosten-Schwellwert-Check fehlgeschlagen');
  }
}
```

> **Hinweis:** `sendNotification` muss den neuen Trigger `cost_threshold_exceeded`
> unterstützen. In `lib/email/mailer.ts` prüfen welche Trigger dort definiert sind und
> entsprechend ergänzen oder einen generischen Trigger nutzen.

### A5 — API-Routen

```typescript
// app/api/kpi/costs/[projectId]/route.ts — GET
// Auth-Check → getProjectCostSummary(projectId) → JSON

// app/api/kpi/costs/export/route.ts — GET ?projectId=...
// Auth-Check → exportCostEntriesCsv(projectId)
// Response: Content-Type: text/csv, Content-Disposition: attachment; filename="...csv"

// app/api/kpi/costs/global/route.ts — GET (nur ADMIN)
// Auth-Check + Role-Check (ADMIN) → getGlobalCostSummary() → JSON
```

### A6 — tracker.ts: Schwellwert-Check einbinden

In `lib/costs/tracker.ts` nach dem erfolgreichen `db.costEntry.create`-Call:

```typescript
// Am Ende von trackCost(), nach dem Schreiben in DB:
// checkCostThreshold(projectId) aufrufen — non-fatal, Fehler werden intern geloggt
checkCostThreshold(entry.projectId).catch((err: unknown) => {
  logger.warn({ err }, '[Vysible] Schwellwert-Check nach trackCost fehlgeschlagen');
});
```

### Acceptance Checklist

- [ ] `getProjectCostSummary` gibt korrekte Summen für Projekt mit bekannten CostEntries zurück
- [ ] `currentMonthEur` und `totalEur` stimmen mit direkter DB-Abfrage überein
- [ ] CSV-Export: alle Felder vorhanden (timestamp, model, step, tokens, EUR), keine PII
- [ ] GET `/api/kpi/costs/[projectId]` → JSON mit byStep-Aufschlüsselung
- [ ] GET `/api/kpi/costs/export?projectId=...` → CSV-Datei im Browser herunterladbar
- [ ] Ohne Auth → 401
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(costs): Kosten-Aggregator + CSV-Export + API-Routen (Slice 27 Sub-A)
```

---

## Sub-Slice B — Billing-Dashboard + Marge-Kalkulation + Schwellwert-UI

**Aufwand:** ~4–5 Stunden  
**Scope:** Billing-Seite im Dashboard, Marge-Kalkulation, Schwellwert-Konfiguration.

### IN

```
app/(dashboard)/settings/billing/page.tsx       NEU — Server-Komponente (Billing-Dashboard)
components/kpi/CostBreakdownTable.tsx           NEU — Pro-Projekt-Kosten-Tabelle
components/kpi/MarginCalculator.tsx             NEU — Client-Komponente für Marge
app/api/settings/cost-threshold/route.ts        NEU — GET + PUT Schwellwert
```

### OUT

```
lib/costs/aggregator.ts                         NICHT anfassen (Sub-Slice A)
lib/costs/invoice-export.ts                     NICHT anfassen (Sub-Slice A)
lib/costs/threshold-checker.ts                  NICHT anfassen (Sub-Slice A)
```

### B1 — Billing-Seite (Struktur)

`/settings/billing` — Server-Komponente, nur für ADMIN.

**Abschnitte:**

1. **Globale Übersicht** (aus `getGlobalCostSummary`)
   - Gesamtkosten (kumuliert)
   - Laufender Monat
   - Ø Kosten pro Content-Paket

2. **Pro-Projekt-Tabelle** (`CostBreakdownTable`)

   | Projekt | Monat aktuell | Gesamt | Ø/Artikel | Ø/Newsletter | Ø/Social-Post | CSV |
   |---|---|---|---|---|---|---|
   - CSV-Button pro Projekt → Download

3. **Marge-Kalkulation** (`MarginCalculator`, Client-Komponente)
   - Eingabe: "Kundenpreis/Monat (€)"
   - Berechnung: `Marge = (Preis - Kosten) / Preis * 100`
   - Anzeige: Marge % + absoluter Gewinn/Monat
   - Referenz aus plan.md: 3–5 €/Monat empfohlen → ~250–400% Marge

4. **Schwellwert-Konfiguration**
   - Anzeige aktueller Schwellwert (aus DB, Standard: 50 €)
   - Eingabe: neuer Schwellwert + "Speichern"-Button
   - Toggle: Warnungen aktiv/inaktiv

### B2 — Marge-Kalkulation (Beispielrechnung)

```
Ø Kosten pro Paket: 1,26 €/Monat  
Kundenpreis: 5,00 €/Monat  
Marge: (5,00 - 1,26) / 5,00 * 100 = 74,8%  
Gewinn: 3,74 €/Monat  
```

Diese Rechnung in der UI als "Referenzwert" anzeigen wenn kein Kundenpreis eingegeben.

### B3 — API: Schwellwert

```typescript
// app/api/settings/cost-threshold/route.ts
// GET  → { monthlyAlertEur: number, alertEnabled: boolean }
// PUT  → { monthlyAlertEur: number, alertEnabled: boolean } → update db.costSettings
// Auth + ADMIN-Check auf beiden Methoden
```

### Acceptance Checklist

- [ ] `/settings/billing` erreichbar für ADMIN-User
- [ ] Nicht-Admin-User → 403 oder Redirect
- [ ] Globale Übersicht zeigt korrekte Gesamtkosten (mit direkter DB-Abfrage verifizieren)
- [ ] Pro-Projekt-Tabelle: alle Projekte aufgelistet
- [ ] CSV-Download funktioniert (vollständige Datei)
- [ ] Marge-Kalkulation: 5 € Kundenpreis, 1,26 € Kosten → 74,8% Marge korrekt berechnet
- [ ] Schwellwert speichern → Wert in DB (CostSettings)
- [ ] Schwellwert überschritten → E-Mail ausgelöst (manuell testbar via Test-CostEntry)
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(costs): Billing-Dashboard + Marge-Kalkulation + Schwellwert-Config (Slice 27 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Aggregationslogik ausschliesslich in aggregator.ts
Select-String "\.reduce.*costEur|costEur.*reduce" app,lib -Recurse |
  Where-Object { $_.Path -notmatch "aggregator\.ts" }
# → Zero Treffer (Aggregation nur in aggregator.ts)

# Kein hardcoded Schwellwert-Wert im Code
Select-String "50\.0|monthlyAlert.*[0-9]" lib,app -Recurse |
  Where-Object { $_.Path -notmatch "schema\.prisma" }
# → Nur Default im Schema erlaubt

# CostSettings-Modell in Schema vorhanden
Select-String "model CostSettings" prisma/schema.prisma
# → Treffer

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Kosten-Chart (Sparkline, Trendlinie) | Slice 24 (KPI-Dashboard) — grafische Aufbereitung dort |
| Automatischer Monatsreport (PDF) | Slice 24 (KPI-Dashboard) — puppeteer-PDF dort |
| Schwellwert-De-Duplizierung (1x/Monat) | Tech-Debt, Sprint 0a — einfach "immer senden" für MVP |
| Per-Step Anomalie-Detection | Phase 4 |
| Anthropic-Dashboard-Abgleich | Kein API für externe Kosten-Verifikation verfügbar |

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
SPRINT P3-A ABSCHLUSSBERICHT
==============================

Sprint: P3-A — Kosten-Tracking pro Kunde (Slice 27)

SUB-SLICES:
  A Aggregator + CSV + API:        [ ] DONE — Commit: <hash>
  B Billing-UI + Marge + Alert:    [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  Aggregation nur in aggregator:   [ ]
  Kein hardcoded Schwellwert:      [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P3-A ABGESCHLOSSEN — Erster Phase-3-Slice abgeschlossen!
▶ Nächste Priorität: Sprint P3-B (Hedy-Integration — Slice 20)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p3a-kosten-tracking.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
