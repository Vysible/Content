# Sprint P2-F — Social Media Draft-Posting (Slice 18)

**Projekt:** Vysible  
**Sprint:** P2-F  
**Format:** Tier 2 (Stubs vorhanden, Provider-Hacks bereinigen + UI ergänzen)  
**Abhängigkeit:** Sprint P3-H ✅  
**Anforderungen:** plan.md Slice 18  
**Geschätzte Dauer:** ~1.5 Tage

> **Pre-Condition (extern, vor Sprint-Start manuell erledigen):**
> 1. **Meta-Business-Verifizierung** muss abgeschlossen sein (Vorlaufzeit Wochen).
>    Ohne Verifizierung kann die Graph API keine Draft-Posts erstellen.
>    Status prüfen: https://business.facebook.com/settings/security
> 2. **LinkedIn Developer App** muss mit `w_member_social`-Scope zugelassen sein.
>    App anlegen: https://www.linkedin.com/developers/apps
> 3. **Provider-Enum** muss `META` und `LINKEDIN` enthalten (aktuell fehlen diese —
>    Stubs nutzen `WORDPRESS` und `KLICKTIPP` als Platzhalter).

> **Ziel:** Social-Media-Posts (Facebook, Instagram, LinkedIn) als Draft über
> die jeweilige API hochladen. Status-Tracking pro Post (Ausstehend → Hochgeladen
> → Freigegeben → Veröffentlicht). Provider-Hacks aus Stub-Phase bereinigen.

> **Forge-Hinweis:** `SocialTokenStatusSection` in den API-Key-Settings queryt
> noch `ApiKey` mit Provider CANVA — seit Sprint P2-E (Canva OAuth) obsolet.
> Dieser Sprint bereinigt auch diese technische Schuld (siehe OpenActions.md Punkt 3).

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus
(Phase 0 — PSR + Phase 1 — technische Gates).
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.
Bei GO: Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Bestehende Social-Stubs
Get-Content lib/social/meta.ts -ErrorAction SilentlyContinue
Get-Content lib/social/linkedin.ts -ErrorAction SilentlyContinue

# 2. API-Route für Social-Post
Get-Content "app/api/projects/[id]/social-post/route.ts" -ErrorAction SilentlyContinue

# 3. Provider-Enum (fehlen META/LINKEDIN?)
Select-String "enum Provider" prisma/schema.prisma -A 10

# 4. SocialTokenStatusSection (OpenActions Punkt 3)
Get-Content "app/(dashboard)/settings/api-keys/SocialTokenStatusSection.tsx" -ErrorAction SilentlyContinue

# 5. CanvaToken-Modell (als Referenz für eigene OAuth-Token-Tabellen)
Select-String "model CanvaToken" prisma/schema.prisma -A 12

# 6. Wo wird social-post Route genutzt?
Select-String "social-post\|socialPost\|SOCIAL_" app,components -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 15

# 7. StoredTextResult-Typ: socialStatus-Feld vorhanden?
Select-String "socialStatus\|socialDraft" lib/generation -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 8. UI-Button zum Social-Posting vorhanden?
Select-String "SocialPost\|PostButton\|DraftButton" components -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 9. Token-Expiry-Integration (Sprint P3-H): Token-Status-API
Get-Content app/api/tokens/status/route.ts -ErrorAction SilentlyContinue

# 10. Dashboard-Layout: wo Social-Aktionen eingebaut?
Select-String "social\|facebook\|instagram\|linkedin" app/(dashboard) -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 15
```

**Bekannte Lücken (Stand Mai 2026, aus Roadmap + plan.md + OpenActions):**

| Datei | Lücke | Priorität |
|---|---|---|
| `prisma/schema.prisma` — Provider-Enum | `META` und `LINKEDIN` fehlen | MUSS |
| `lib/social/meta.ts` | Nutzt `WORDPRESS`-Provider als Platzhalter (L12) | MUSS |
| `lib/social/linkedin.ts` | Nutzt `KLICKTIPP`-Provider als Platzhalter (L9) | MUSS |
| `lib/social/meta.ts` | Kein `withRetry` auf externen Graph-API-Call | MUSS |
| `lib/social/linkedin.ts` | Kein `withRetry` auf externen LinkedIn-API-Call | MUSS |
| Social-Drafts-UI | Fehlend — aktuell nur API, keine User-facing Buttons | MUSS |
| `SocialTokenStatusSection.tsx` | Queryt veraltete ApiKey-Rows statt OAuth-Modelle | SOLL |
| Status-Tracking (Ausstehend/Hochgeladen/Freigegeben/Veröffentlicht) | Nur `socialStatus: 'hochgeladen'` im Stub | MUSS |

---

## CRITICAL: Self-review Checklist

- [ ] Provider-Enum: `META` und `LINKEDIN` hinzugefügt + Migration
- [ ] `lib/social/meta.ts`: Provider-Hack durch echten `META`-Provider ersetzt
- [ ] `lib/social/linkedin.ts`: Provider-Hack durch echten `LINKEDIN`-Provider ersetzt
- [ ] `withRetry` auf Graph-API-Call und LinkedIn-API-Call
- [ ] Kein stiller Catch — alle `.catch` loggen via `logger.warn/error`
- [ ] Kein `access_token` in Logs oder Responses
- [ ] `SocialTokenStatusSection` liest aus CanvaToken (+ ggf. Meta/LinkedIn-Token)
- [ ] Status-Zyklus vollständig: Ausstehend → Hochgeladen → (Freigegeben →) Veröffentlicht
- [ ] Token-Expiry (Sprint P3-H): Draft-Button deaktiviert bei expired Social-Token
- [ ] AES-256: `decrypt()` für Token — kein Klartext in Response
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — Provider-Bereinigung + Retry + API-Hardening

**Aufwand:** ~5–6 Stunden  
**Scope:** Provider-Enum erweitern, Stubs bereinigen, withRetry hinzufügen, Status-Modell vollständig.

### IN

```
prisma/schema.prisma                           MOD — Provider-Enum: +META, +LINKEDIN
lib/social/meta.ts                             MOD — Provider-Hack entfernen, withRetry
lib/social/linkedin.ts                         MOD — Provider-Hack entfernen, withRetry
app/api/projects/[id]/social-post/route.ts     MOD — Status-Feld erweitern
lib/generation/results-store.ts                MOD — socialStatus-Typ erweitern
```

### OUT

```
components/                                    NICHT anfassen (Sub-Slice B)
app/(dashboard)/settings/                      NICHT anfassen (Sub-Slice C)
```

### A1 — Prisma: Provider-Enum erweitern

```prisma
enum Provider {
  ANTHROPIC
  OPENAI
  DATASEO
  KLICKTIPP
  WORDPRESS
  HEDY
  CANVA
  META       // NEU
  LINKEDIN   // NEU
}
```

Migration: `pnpm prisma migrate dev --name add_meta_linkedin_providers`

### A2 — lib/social/meta.ts bereinigen

```typescript
// VORHER:
// where: { provider: 'WORDPRESS', active: true, name: { startsWith: 'meta:' } }
// NACHHER:
// where: { provider: 'META', active: true }

// Token-Name-Format: name enthält pageId[:igId]
// Alternativ: separate Felder (pragmatisch: name-Parsing beibehalten)

// withRetry auf alle fetch-Calls:
import { withRetry } from '@/lib/utils/retry'

const res = await withRetry(
  async () => fetch(`${GRAPH_API}/${pageId}/feed`, { ... }),
  'meta.postFacebookDraft'
)
```

### A3 — lib/social/linkedin.ts bereinigen

```typescript
// VORHER:
// where: { provider: 'KLICKTIPP', active: true, name: { startsWith: 'linkedin:' } }
// NACHHER:
// where: { provider: 'LINKEDIN', active: true }

// withRetry:
const res = await withRetry(
  async () => fetch('https://api.linkedin.com/v2/ugcPosts', { ... }),
  'linkedin.postDraft'
)
```

### A4 — socialStatus-Typ erweitern

```typescript
// In lib/generation/results-store.ts (StoredTextResult):
socialStatus?: 'ausstehend' | 'hochgeladen' | 'freigegeben' | 'veroeffentlicht' | 'fehler'
socialDraftId?: string
socialPlatform?: string
socialError?: string
```

### A5 — API-Route: Status vollständig setzen

```typescript
// In app/api/projects/[id]/social-post/route.ts:
// Erfolg: socialStatus = 'hochgeladen', socialDraftId = result.draftId
// Fehler: socialStatus = 'fehler', socialError = result.error
// Bestehenden Code anpassen (aktuell nur 'hochgeladen')
```

### Acceptance Checklist

- [ ] `META` und `LINKEDIN` in Provider-Enum
- [ ] `lib/social/meta.ts` queryt `provider: 'META'` (kein WORDPRESS-Hack)
- [ ] `lib/social/linkedin.ts` queryt `provider: 'LINKEDIN'` (kein KLICKTIPP-Hack)
- [ ] `withRetry` auf allen externen Calls in meta.ts und linkedin.ts
- [ ] socialStatus-Typ enthält alle 5 Zustände
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(social): Provider-Bereinigung META/LINKEDIN + withRetry + Status-Modell (Slice 18 Sub-A)
```

---

## Sub-Slice B — Social-Drafts-UI + Status-Tracking

**Aufwand:** ~4–5 Stunden  
**Scope:** UI-Buttons für Draft-Posting in der Ergebnisansicht, Status-Badge im Kalender.

### IN

```
components/results/SocialPostButton.tsx        NEU — Button + Status-Anzeige
app/(dashboard)/projects/[id]/page.tsx         MOD — SocialPostButton in Ergebnisliste
components/calendar/ContentCalendar.tsx        MOD — Social-Status-Badge (wpDraftStatus analog)
```

### OUT

```
lib/social/                                    NICHT anfassen (Sub-Slice A)
prisma/schema.prisma                           NICHT anfassen (Sub-Slice A)
```

### B1 — SocialPostButton-Komponente

```typescript
// components/results/SocialPostButton.tsx
'use client'

// Props: { projectId, index, kanal, text, currentStatus, tokenExpired? }
// States:
//   - idle: Button "Als Draft hochladen" (disabled wenn tokenExpired)
//   - loading: Spinner + "[INFO] Wird hochgeladen..."
//   - success: Grün "Hochgeladen ✓" + draftId anzeigen
//   - error: Rot "Fehler: [message]" + "Erneut versuchen" Button
//
// Klick → POST /api/projects/[id]/social-post → Status-Update
// Token expired → disabled + Tooltip "Token abgelaufen — erneuern unter Einstellungen"
```

### B2 — Integration in Ergebnisansicht

```typescript
// Für jeden Social-Text (kanal: SOCIAL_FACEBOOK / SOCIAL_INSTAGRAM / SOCIAL_LINKEDIN):
// SocialPostButton rendern mit aktuellem socialStatus aus StoredTextResult
// Kalender: Badge analog wpDraftStatus — "FB" / "IG" / "LI" mit Farbcode
```

### B3 — Kalender-Badge

```typescript
// In ContentCalendar.tsx:
// Wenn socialStatus === 'hochgeladen' → gelbes Badge "FB↑" / "IG↑" / "LI↑"
// Wenn socialStatus === 'veroeffentlicht' → grünes Badge "FB✓" / "IG✓" / "LI✓"
// Wenn socialStatus === 'fehler' → rotes Badge "FB✗" / "IG✗" / "LI✗"
```

### Acceptance Checklist

- [ ] SocialPostButton sichtbar bei Social-Texten in Ergebnisansicht
- [ ] Klick → Draft wird hochgeladen → Status-Update sichtbar
- [ ] Token expired → Button deaktiviert mit Hinweis
- [ ] Kalender zeigt Social-Status-Badge (analog WP-Badge)
- [ ] Loading-State sichtbar während Upload
- [ ] Fehler werden als Rot-Badge + Fehlermeldung angezeigt
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(social): Draft-Posting-UI + Kalender-Badge + Token-Status-Integration (Slice 18 Sub-B)
```

---

## Sub-Slice C — SocialTokenStatusSection bereinigen

**Aufwand:** ~1–2 Stunden  
**Scope:** OpenActions Punkt 3 — Komponente auf echte OAuth-Modelle umstellen.

### IN

```
app/(dashboard)/settings/api-keys/SocialTokenStatusSection.tsx   MOD
```

### OUT

```
lib/social/                                    NICHT anfassen
lib/canva/                                     NICHT anfassen
```

### C1 — SocialTokenStatusSection umstellen

```typescript
// VORHER: queryt /api/api-keys mit provider: 'CANVA' für expiresAt
// NACHHER:
// 1. Canva-Status: aus /api/tokens/status (Sprint P3-H) lesen
// 2. Meta/LinkedIn: aus /api/tokens/status lesen
// 3. Alte ApiKey-Rows mit Provider CANVA → Hinweis "Ersetzt durch OAuth — /settings/canva nutzen"
// 4. Zeigt pro Provider: Verbindungsstatus + Ablaufdatum + "Erneuern"-Link
```

### Acceptance Checklist

- [ ] Canva-Status kommt aus Token-Status-API (nicht mehr aus ApiKey-Tabelle)
- [ ] Meta/LinkedIn-Status angezeigt (wenn Token vorhanden)
- [ ] Hinweis bei veralteten CANVA-ApiKey-Rows
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
refactor(settings): SocialTokenStatusSection auf OAuth-Token-Modelle umgestellt (Slice 18 Sub-C)
```

---

## Abschluss-Validation (nach allen Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Provider-Hack eliminiert
Select-String "provider.*WORDPRESS.*meta\|provider.*KLICKTIPP.*linkedin" lib/social -Recurse -i
# → Zero Treffer

# withRetry auf allen Social-Calls
Select-String "withRetry" lib/social/meta.ts
Select-String "withRetry" lib/social/linkedin.ts
# → Je mindestens 1 Treffer

# Kein stiller Catch
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" lib/social,app/api/projects -Recurse
# → Zero Treffer

# Kein access_token in Responses/Logs
Select-String "access_token" lib/social -Recurse -i |
  Where-Object { $_.Line -notmatch "body.*JSON\|request.*body" }
# → Zero Treffer ausserhalb des Request-Body

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Meta/LinkedIn OAuth-Flow (eigene Token-Tabelle) | Erfordert Meta-App-Review + LinkedIn-Partnerantrag — Phase 4 |
| Automatisches Veröffentlichen (nicht nur Draft) | Manuell freigeben erst — kein Auto-Publish |
| Instagram Stories / Reels | Nur Feed-Posts als MVP |
| Social-Kalender-Integration (Scheduling) | Phase 4 — erst manuelles Draft-Posting |
| Bild-Upload zu Instagram | Platzhalter-URL im Stub ausreichend bis Canva-Asset-Picker integriert |

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich seit 2026-05-15.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR ein Commit vorgeschlagen
> oder ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md`: Slice 18 auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint P2-F)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: Punkt 3 (SocialTokenStatusSection) als erledigt markieren |
| 3 | Sprint-Prompt archivieren | `Move-Item docs/dev-prompts/sprint-p2f-social-media.md docs/dev-prompts/archive/` |
| 4 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]` |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P2-F ABSCHLUSSBERICHT
==============================

Sprint: P2-F — Social Media Draft-Posting (Slice 18)

SUB-SLICES:
  A Provider-Bereinigung + Retry:              [ ] DONE — Commit: <hash>
  B Social-Drafts-UI + Status-Tracking:        [ ] DONE — Commit: <hash>
  C SocialTokenStatusSection bereinigen:       [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  Provider-Hacks eliminiert:       [ ]
  withRetry auf Social-Calls:      [ ]
  Status-Tracking vollständig:     [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P2-F ABGESCHLOSSEN — Phase-2-Backlog vollständig!
▶ Nächste Priorität: Sprint P4-A (SEO-Analyse — Slice 14)
▶ OpenActions.md: Punkt 3 (SocialTokenStatusSection) als erledigt entfernen
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p2f-social-media.md docs/dev-prompts/archive/
═══════════════════════════════════════════════

═══════════════════════════════════════════════
[OK] Phase 2 ABGESCHLOSSEN
▶ Nächste Priorität: Phase 4 starten
═══════════════════════════════════════════════
```
