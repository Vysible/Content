# Sprint P3-H — Token-Ablauf-Warnsystem (Slice 26)

**Projekt:** Vysible  
**Sprint:** P3-H  
**Format:** Tier 2 (Stubs vorhanden, Verhalten erweitern)  
**Abhängigkeit:** Sprint P3-G ✅  
**Anforderungen:** plan.md Slice 26  
**Geschätzte Dauer:** ~1 Tag

> **Ziel:** Proaktive Warnung bei ablaufenden OAuth-Tokens (Canva, Meta, LinkedIn)  
> bevor ein Workflow blockiert wird. Gestufte Eskalation (14d → 7d → 1d → abgelaufen)  
> mit farbcodierten Bannern, E-Mail-Alert und One-Click-Reauth.

> **Forge-Hinweis:** `components/layout/TokenWarningBanner.tsx:21` hat laut  
> `docs/forge-web-deviations.md` einen stillen Catch (Status: Accepted, Sprint 0a).  
> Dieser Sprint schließt diese Lücke.  
> `lib/tokens/expiry-checker.ts:21` ebenfalls gelistet — Exploration prüft Ist-Stand.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus
(Phase 0 — PSR + Phase 1 — technische Gates).
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.
Bei GO: Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Bestehende Token-Expiry-Dateien
Get-Content lib/tokens/expiry-checker.ts -ErrorAction SilentlyContinue
Get-Content components/layout/TokenWarningBanner.tsx -ErrorAction SilentlyContinue

# 2. API-Route für expiring-Keys
Get-Content app/api/api-keys/expiring/route.ts -ErrorAction SilentlyContinue

# 3. Gibt es bereits eine /api/tokens/status Route?
Get-ChildItem app/api/tokens -Recurse -Name -ErrorAction SilentlyContinue

# 4. CanvaToken-Modell (OAuth-Tokens mit eigenem expiresAt)
Select-String "model CanvaToken" prisma/schema.prisma -A 12

# 5. Wo wird TokenWarningBanner eingebunden?
Select-String "TokenWarningBanner" app,components -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 6. Stiller Catch in TokenWarningBanner (deviations.md)
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" components/layout/TokenWarningBanner.tsx

# 7. Stiller Catch in expiry-checker (deviations.md)
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" lib/tokens/expiry-checker.ts

# 8. E-Mail-Versand: sendNotification-Signatur
Select-String "export.*sendNotification" lib/email -Recurse |
  Select-Object Path, LineNumber, Line | Select-Object -First 5

# 9. Canva OAuth-Flow: wie wird Token erneuert?
Get-ChildItem app/api/canva -Recurse -Name -ErrorAction SilentlyContinue

# 10. Provider-Enum (Meta/LinkedIn vorhanden?)
Select-String "enum Provider" prisma/schema.prisma -A 10
```

**Bekannte Lücken (Stand Mai 2026, aus Roadmap + plan.md + deviations.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `components/layout/TokenWarningBanner.tsx:21` | Stiller Catch `.catch(() => {})` | MUSS (forge-deviation) |
| `lib/tokens/expiry-checker.ts:21` | Ggf. stiller Catch (deviations.md-Eintrag prüfen) | PRÜFEN |
| `app/api/tokens/status/route.ts` | Fehlend (plan.md) | MUSS |
| Eskalationsstufen (14d/7d/1d/abgelaufen) | Nur 1 Stufe im Stub (`WARN_DAYS`) | MUSS |
| CanvaToken-Integration | `expiry-checker` prüft nur `ApiKey.expiresAt`, nicht `CanvaToken.expiresAt` | MUSS |
| One-Click-Reauth-Button | Fehlend | MUSS |
| E-Mail bei 7d/1d | Fehlendes differenziertes Triggering | MUSS |

---

## CRITICAL: Self-review Checklist

- [ ] Stiller Catch `TokenWarningBanner.tsx:21` → `console.warn('[Vysible] …', err)` (Client-Code)
- [ ] `expiry-checker.ts` prüft **sowohl** `ApiKey.expiresAt` **als auch** `CanvaToken.expiresAt`
- [ ] 4 Eskalationsstufen mit korrekten Farben (gelb/orange/rot/rot+inaktiv)
- [ ] E-Mail-Alert bei ≤ 7 Tagen und ≤ 1 Tag (nicht bei 14 Tagen — nur Banner)
- [ ] One-Click-Reauth öffnet korrekten OAuth-Flow (Canva: `/api/canva/oauth/authorize`)
- [ ] Draft-Posting-Buttons inaktiv bei abgelaufenem Token
- [ ] `withRetry` auf alle externen Calls (fetch in Banner ist intern → kein Retry nötig)
- [ ] Kein stiller Catch irgendwo
- [ ] Kein PII in Logs (nur Key-ID, Provider, daysLeft)
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — Expiry-Checker erweitern + API-Route + Eskalationslogik

**Aufwand:** ~4–5 Stunden  
**Scope:** Expiry-Checker auf alle OAuth-Token-Quellen erweitern, 4-stufige Eskalation, neue API-Route `/api/tokens/status`.

### IN

```
lib/tokens/expiry-checker.ts               MOD — CanvaToken + Eskalationsstufen
app/api/tokens/status/route.ts             NEU — GET: alle Token-Status mit Eskalationsstufe
lib/email/mailer.ts                        MOD — ggf. neuen Trigger-Typ 'token_expiring'
```

### OUT

```
components/                                NICHT anfassen (Sub-Slice B)
app/api/canva/                             NICHT anfassen (OAuth-Flow existiert)
```

### A1 — Eskalationsstufen-Typ

```typescript
// lib/tokens/expiry-checker.ts
export type ExpiryLevel = 'ok' | 'warning' | 'urgent' | 'critical' | 'expired'

export interface TokenExpiryStatus {
  id: string
  name: string
  provider: string
  expiresAt: Date
  daysLeft: number
  level: ExpiryLevel
  source: 'apiKey' | 'canvaToken'  // woher der Token stammt
}

function getExpiryLevel(daysLeft: number): ExpiryLevel {
  if (daysLeft <= 0) return 'expired'
  if (daysLeft <= 1) return 'critical'
  if (daysLeft <= 7) return 'urgent'
  if (daysLeft <= 14) return 'warning'
  return 'ok'
}
```

### A2 — CanvaToken in Prüfung einbeziehen

```typescript
// Neben ApiKey.findMany auch:
const canvaTokens = await prisma.canvaToken.findMany({
  where: { expiresAt: { lte: warnBefore } },
  select: { id: true, userId: true, expiresAt: true },
})
// → Mappt auf TokenExpiryStatus mit source: 'canvaToken', provider: 'CANVA'
```

### A3 — Differenzierte E-Mail-Auslösung

| Level | Aktion |
|---|---|
| `warning` (14d) | Kein E-Mail — nur Banner |
| `urgent` (7d) | E-Mail an Admin |
| `critical` (1d) | E-Mail an Admin + Browser-Notification (Placeholder) |
| `expired` | E-Mail + Draft-Buttons inaktiv |

### A4 — app/api/tokens/status/route.ts

```typescript
// GET /api/tokens/status
// Auth-Check → getAllTokenExpiryStatuses() → Response: TokenExpiryStatus[]
// Filtert nur level !== 'ok' (Frontend braucht nur Probleme)
```

### Acceptance Checklist

- [ ] `GET /api/tokens/status` → Array von `TokenExpiryStatus` (nur level !== 'ok')
- [ ] CanvaToken mit expiresAt in 5 Tagen → level: 'urgent' in Response
- [ ] ApiKey mit expiresAt in 20 Tagen → nicht in Response (level: 'ok')
- [ ] E-Mail wird bei level 'urgent' und 'critical' gesendet (nicht bei 'warning')
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(tokens): Eskalationsstufen + CanvaToken-Integration + /api/tokens/status (Slice 26 Sub-A)
```

---

## Sub-Slice B — TokenWarningBanner erweitern + One-Click-Reauth + Draft-Button-Deaktivierung

**Aufwand:** ~3–4 Stunden  
**Scope:** Banner farblich gestuft, One-Click-Reauth, Draft-Posting-Buttons bei Ablauf deaktivieren.

### IN

```
components/layout/TokenWarningBanner.tsx    MOD — stiller Catch schließen + farbige Stufen
components/dashboard/SocialPostButton.tsx   MOD — disabled bei expired Token (falls vorhanden)
app/(dashboard)/layout.tsx                  PRÜFEN — Banner eingebunden?
```

### OUT

```
lib/tokens/                                NICHT anfassen (Sub-Slice A)
app/api/tokens/                            NICHT anfassen (Sub-Slice A)
lib/social/                                NICHT anfassen
```

### B1 — Stiller Catch schließen (forge-deviation)

```typescript
// VORHER (TokenWarningBanner.tsx:21):
.catch(() => {})

// NACHHER:
.catch((err: unknown) => {
  console.warn('[Vysible] Token-Status konnte nicht geladen werden', err)
})
```

### B2 — Farbcodierung nach Level

| Level | Styling |
|---|---|
| `warning` (14d) | `bg-amber-50 border-amber-200 text-amber-800` (gelb) |
| `urgent` (7d) | `bg-orange-50 border-orange-200 text-orange-800` (orange) |
| `critical` (1d) | `bg-red-50 border-red-200 text-red-800` (rot) |
| `expired` | `bg-red-100 border-red-300 text-red-900 font-bold` (dunkelrot) |

### B3 — One-Click-Reauth

```typescript
// Je nach Provider:
// - CANVA: Link zu /settings/canva (dort existiert OAuth-Connect-Button)
// - META/LINKEDIN: Link zu /settings/api-keys (manuelles Token-Update bis OAuth implementiert)
// Button-Text: "Token erneuern →"
```

### B4 — Draft-Posting-Buttons inaktiv bei expired

```typescript
// In der Social-Post-UI (SocialPostButton oder ähnlich):
// Wenn ein Token für den Ziel-Provider expired ist → Button disabled + Tooltip
// "Token abgelaufen — erst erneuern"
// Check: GET /api/tokens/status beim Laden der Seite → im State speichern
```

### B5 — Banner-Endpoint umstellen

```typescript
// VORHER: fetch('/api/api-keys/expiring')
// NACHHER: fetch('/api/tokens/status')  — nutzt die neue, reichhaltigere Route
```

### Acceptance Checklist

- [ ] Stiller Catch `.catch(() => {})` in TokenWarningBanner.tsx eliminiert
- [ ] Token 6 Tage vor Ablauf → oranges Banner angezeigt
- [ ] Abgelaufener Token → rotes Banner + "Token erneuern →" Button
- [ ] Klick auf "Token erneuern" bei CANVA → navigiert zu `/settings/canva`
- [ ] Draft-Posting-Button bei expired Token → `disabled` + Tooltip
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(tokens): Farbiges Banner + One-Click-Reauth + Draft-Deaktivierung (Slice 26 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Stiller Catch aus deviations.md geschlossen
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" components/layout/TokenWarningBanner.tsx
# → Zero Treffer

Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" lib/tokens/expiry-checker.ts
# → Zero Treffer

# API-Route vorhanden und auth-geschützt
Select-String "requireAuth\|getServerSession" app/api/tokens/status/route.ts

# Eskalationsstufen korrekt implementiert
Select-String "ExpiryLevel\|getExpiryLevel" lib/tokens/expiry-checker.ts
# → Mindestens 2 Treffer

# CanvaToken wird geprüft
Select-String "canvaToken" lib/tokens/expiry-checker.ts -i
# → Mindestens 1 Treffer

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Cron-Job (täglich 07:00) | Erfordert node-cron oder Coolify-Scheduled-Task — Phase 4 |
| Browser Push-Notifications | Web-Push-API + Service-Worker — Phase 4 |
| Meta/LinkedIn OAuth-Flow | Slice 18 (Social Media) — dort eigener OAuth implementiert |
| Token-Refresh-Automatik | Nur Canva hat Auto-Refresh (bereits in `/api/canva/oauth/`) |
| API-Key-Löschung bei Ablauf | Nur Warnung, kein Auto-Delete |

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich seit 2026-05-15.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR ein Commit vorgeschlagen
> oder ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md`: Slice 26 auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint P3-H)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: ggf. Token-bezogene Punkte schließen |
| 3 | Sprint-Prompt archivieren | `Move-Item docs/dev-prompts/sprint-p3h-token-warning.md docs/dev-prompts/archive/` |
| 4 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]` |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P3-H ABSCHLUSSBERICHT
==============================

Sprint: P3-H — Token-Ablauf-Warnsystem (Slice 26)

SUB-SLICES:
  A Expiry-Checker + API-Route + Eskalation:   [ ] DONE — Commit: <hash>
  B Banner-Farben + Reauth + Deaktivierung:    [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  Stille Catches geschlossen:     [ ]
  CanvaToken integriert:           [ ]
  4 Eskalationsstufen:            [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P3-H ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P2-F (Social Media Draft-Posting — Slice 18)
▶ deviations.md: components/layout/TokenWarningBanner.tsx:21 als geschlossen markieren
▶ deviations.md: lib/tokens/expiry-checker.ts:21 prüfen und ggf. als geschlossen markieren
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p3h-token-warning.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
