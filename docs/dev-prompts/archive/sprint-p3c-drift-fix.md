# Sprint P3-C Drift-Fix — Praxis-Portal Architektur-Alignment

**Projekt:** Vysible  
**Sprint:** P3-C Drift-Fix  
**Format:** Tier 2 (Refactoring, keine neuen Features)  
**Abhängigkeit:** Sprint P3-C ✅ (Commit e0ee474)  
**Geschätzte Dauer:** ~1 Tag

> **Kontext:**  
> Sprint P3-C hat das Praxis-Portal funktional gehärtet (AuditLog, Notification, Badge,
> Touch-Targets, Token-Sicherheit). Vier strukturelle Abweichungen vom Sprint-Prompt
> wurden als DRIFT dokumentiert. Dieser Fix-Sprint behebt alle vier vollständig.

---

## EXECUTE FIRST — Pre-Fix Validation (Pflicht)

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Tests
pnpm test
```

Bei **Hard-FAIL (A, B oder C):** SOFORT STOP. Kein weiterer Befehl. Kein weiterer Check. Keine Parallelisierung.  
Ausgabe: `HARD-FAIL: Check [X] — [Grund]` + erforderliche Aktion für den User. Dann **await User-Freigabe**.  
Bei **3/3 PASS:** Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Aktuelles PraxisUser-Modell
Select-String "model PraxisUser" prisma/schema.prisma -Context 0,20

# 2. Existierende InvitationToken-Referenzen
Select-String "inviteToken|inviteExpires|InvitationToken" prisma/schema.prisma

# 3. Wo wird inviteToken heute benutzt?
Select-String "inviteToken" app/api/praxis -Recurse
Select-String "inviteToken" app/(praxis) -Recurse

# 4. blogStatus — wo gesetzt und gelesen?
Select-String "blogStatus" app/api/praxis -Recurse
Select-String "blogStatus" app/(praxis) -Recurse
Select-String "blogStatus" components/praxis -Recurse

# 5. Wie wird textResults.blogStatus im Auth-Response zurückgegeben?
Get-Content app/api/praxis/auth/route.ts

# 6. Bestehende Cookie-Implementierung im Projekt?
Select-String "cookies\(\)|cookie|setCookie|httpOnly" app lib middleware.ts -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 15

# 7. Bestehende JWT/jose-Abhängigkeit?
Select-String "jose|jsonwebtoken|jwt" package.json

# 8. Prisma-Migrationen: letzte Migration
Get-ChildItem prisma/migrations -Directory | Sort-Object Name | Select-Object -Last 3 -ExpandProperty Name
```

---

## Drift 1 — Separates InvitationToken-Modell

**Problem:** Einladungstoken ist direkt auf `PraxisUser` (`inviteToken`, `inviteExpires`).  
Sprint-Prompt spezifiziert ein separates `InvitationToken`-Modell mit `usedAt`, `expiresAt`, `email`.

**Warum beheben:** Saubere Trennung — ein PraxisUser kann mehrfach eingeladen werden,
jede Einladung hat einen eigenen Lifecycle (TTL, used-Tracking, Audit).

### D1.1 — Prisma-Schema

```prisma
model InvitationToken {
  id          String    @id @default(cuid())
  token       String    @unique
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  praxisUserId String?
  praxisUser  PraxisUser? @relation(fields: [praxisUserId], references: [id], onDelete: Cascade)
  email       String    // Klartext für Einladungs-E-Mail-Zustellung
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime  @default(now())

  @@index([token])
  @@index([projectId])
}
```

`PraxisUser` behält `inviteToken` und `inviteExpires` TEMPORÄR für Abwärtskompatibilität
(markiert als `@deprecated` im Kommentar). Entfernung in separatem Cleanup-Sprint.

> **Achtung:** Project braucht eine `invitationTokens InvitationToken[]`-Relation.
> PraxisUser braucht eine `invitations InvitationToken[]`-Relation.

### D1.2 — Invite-Route umstellen

`app/api/praxis/invite/route.ts`:
1. `InvitationToken` erstellen (token = `crypto.randomUUID()`, expiresAt = now + 24h)
2. `PraxisUser` upsert OHNE inviteToken-Feld (Feld bleibt für Legacy)
3. Link zeigt auf neuen Token: `/review/[invitationToken.token]`
4. AuditLog mit `entityId = invitationToken.id`

### D1.3 — Auth-Route umstellen

`app/api/praxis/auth/route.ts`:
1. Token in `InvitationToken`-Tabelle suchen (statt `PraxisUser.inviteToken`)
2. `expiresAt` prüfen → 410 wenn abgelaufen
3. `usedAt` setzen bei erstem Besuch (einmaliger Login-Initiator)
4. **Cookie setzen** (→ Drift 3)
5. PraxisUser aktivieren wenn noch nicht aktiv

---

## Drift 2 — approvalStatus als eigenes DB-Feld

**Problem:** `blogStatus` wird in `Project.textResults` (JSON-Blob) gespeichert.  
Sprint-Prompt spezifiziert `approvalStatus` als queryable DB-Feld.

**Warum beheben:** JSON-Felder sind nicht indexierbar, nicht filterbar für Dashboard-
Badge-Queries, und der Wert ist nicht typsicher.

### D2.1 — Schema-Erweiterung

Neues Modell oder Feld auf einem bestehenden Modell. Da `textResults` ein JSON-Array
ist (Index = contentIndex), ist die sauberste Lösung:

```prisma
model ContentApproval {
  id            String   @id @default(cuid())
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  contentIndex  Int
  status        String   @default("ausstehend") // 'ausstehend' | 'freigegeben' | 'veroeffentlicht'
  approvedAt    DateTime?
  approvedById  String?
  approvedBy    PraxisUser? @relation(fields: [approvedById], references: [id])
  createdAt     DateTime @default(now())

  @@unique([projectId, contentIndex])
  @@index([projectId, status])
}
```

> **Achtung:** Project braucht `contentApprovals ContentApproval[]`-Relation.
> PraxisUser braucht `approvals ContentApproval[]`-Relation.

### D2.2 — Approve-Route umstellen

`app/api/praxis/approve/route.ts`:
1. `ContentApproval` upsert statt JSON-Manipulation
2. Kein `project.textResults` mehr mutieren (JSON bleibt read-only)
3. Status-Werte: `'ausstehend'` → `'freigegeben'` (durch Praxis)

### D2.3 — Auth-Route / Frontend-Anpassung

- Auth-Route: `ContentApproval`-Status pro contentIndex mit-laden
- `page.tsx`: `blogStatus` aus `ContentApproval`-Query statt aus textResults
- `ApprovalButton`: `initialStatus` kommt aus ContentApproval-Status
- Dashboard-Badge: Query auf `ContentApproval` WHERE status = 'ausstehend' (indexiert!)

### D2.4 — Legacy-Feld `blogStatus` entfernen

- Approve-Route schreibt NICHT mehr in `textResults.blogStatus`
- Frontend liest NICHT mehr `current.blogStatus`
- Migration: bestehende `blogStatus`-Werte in `ContentApproval`-Tabelle überführen
  (einmaliges Script oder in der Migration selbst)

---

## Drift 3 — Cookie-basierte Session (statt Token-in-URL)

**Problem:** Token wird bei jedem Seitenaufruf erneut via `/api/praxis/auth` validiert.  
Sprint-Prompt spezifiziert: Token ist einmaliger Login-Initiator → danach httpOnly-Cookie.

**Warum beheben:** Sicherheit — URL mit Token kann geleakt werden (Browser-History,
Referer-Header, Screen-Sharing). Cookie ist httpOnly und nicht über URL sichtbar.

### D3.1 — Cookie-Format

Signierter JWT-Cookie (httpOnly, SameSite=Lax, 7 Tage):
```typescript
{
  praxisUserId: string
  projectId: string
  iat: number
  exp: number  // 7 Tage
}
```

Signing-Secret: `process.env.PRAXIS_SESSION_SECRET` (neuer .env-Eintrag).
Library: `jose` (bereits in Next.js/Auth.js-Ökosystem üblich) ODER natives `crypto`.

> Exploration zeigt ob `jose` oder `jsonwebtoken` bereits Dependency ist.

### D3.2 — Auth-Flow-Änderung

**Erster Aufruf** (`/review/[token]`):
1. Server Component prüft ob Praxis-Cookie existiert → wenn ja, direkt Portal rendern
2. Wenn kein Cookie: Token via `InvitationToken`-Tabelle validieren
3. Bei gültigem Token: Cookie setzen + `usedAt` markieren + redirect zu `/review/portal`
4. Bei ungültigem/abgelaufenem Token: Fehlerseite (410/404)

**Folgeaufrufe** (`/review/portal` oder API-Calls):
1. Cookie lesen + JWT verifizieren
2. `praxisUserId` + `projectId` aus Cookie → Mandantentrennung garantiert
3. Kein Token mehr in URL nötig

### D3.3 — Route-Struktur-Änderung

```
app/(praxis)/review/[token]/page.tsx  → Token-Validierung + Cookie-Set + Redirect
app/(praxis)/review/portal/page.tsx   → Server Component: Cookie lesen, Portal rendern
```

ODER (einfacher):
```
app/(praxis)/review/[token]/page.tsx  → Bleibt, aber wird Server Component
                                         Cookie setzen wenn Token gültig
                                         Danach Client-Portal rendern (mit Cookie-Auth)
```

> Exploration zeigt welche Variante weniger Breaking Changes hat.

### D3.4 — API-Routen auf Cookie umstellen

`app/api/praxis/comments/route.ts` und `app/api/praxis/approve/route.ts`:
- Token-Parameter aus Request-Body entfernen
- Stattdessen: Cookie lesen → JWT verifizieren → `praxisUserId` + `projectId` extrahieren
- Mandantentrennung: `projectId` kommt aus dem signierten Cookie, nicht vom Client

### D3.5 — Helper: `getPraxisSession()`

```typescript
// lib/praxis/session.ts
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'  // oder crypto-basiert

const PRAXIS_SECRET = new TextEncoder().encode(process.env.PRAXIS_SESSION_SECRET!)
const COOKIE_NAME = 'praxis_session'

export interface PraxisSession {
  praxisUserId: string
  projectId: string
}

export async function getPraxisSession(): Promise<PraxisSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, PRAXIS_SECRET)
    return { praxisUserId: payload.praxisUserId as string, projectId: payload.projectId as string }
  } catch {
    return null
  }
}

export async function setPraxisSession(praxisUserId: string, projectId: string): Promise<void> {
  // Implementation: JWT signieren + Cookie setzen
}
```

---

## Drift 4 — TTL 24h (statt 7 Tage)

**Problem:** Einladungslink ist 7 Tage gültig.  
Sprint-Prompt spezifiziert 24h.

**Warum jetzt möglich:** Nach Drift 3 (Cookie-Session) ist der Token nur noch
einmaliger Login-Initiator. 24h ist realistisch weil:
- Praxis klickt Link innerhalb von 24h → Cookie wird gesetzt (7 Tage gültig)
- Link danach irrelevant — Cookie ist die Session
- Bei Ablauf des Cookies: Agentur sendet neue Einladung

### D4.1 — TTL ändern

`app/api/praxis/invite/route.ts`:
```typescript
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h statt 7d
```

### D4.2 — .env.example

```bash
# Praxis-Portal Session (signierter httpOnly-Cookie)
PRAXIS_SESSION_SECRET="REPLACE_WITH_RANDOM_SECRET_MIN_32_CHARS"
```

---

## CRITICAL: Self-review Checklist

- [ ] `InvitationToken`-Modell existiert in Schema + Migration
- [ ] `ContentApproval`-Modell existiert in Schema + Migration
- [ ] Keine Referenz mehr auf `PraxisUser.inviteToken` in aktiven Routen (nur Legacy-Kommentar)
- [ ] Keine JSON-Manipulation von `textResults.blogStatus` in approve-Route
- [ ] httpOnly-Cookie wird bei Token-Login gesetzt
- [ ] API-Routen lesen `projectId` aus Cookie, NICHT aus Request-Body
- [ ] Token-in-URL nur noch beim ersten Besuch verwendet
- [ ] `PRAXIS_SESSION_SECRET` in `.env.example` dokumentiert
- [ ] TTL InvitationToken = 24h
- [ ] TTL Cookie = 7 Tage
- [ ] Mandantentrennung: `projectId` aus signiertem Cookie (nicht Client-manipulierbar)
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün (bestehende + neue)
- [ ] Bestehende `blogStatus`-Daten migriert (Script oder Migration)
- [ ] CHANGELOG aktualisiert
- [ ] Keine Silent Catches

---

## Abschluss-Validation

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Kein blogStatus mehr in approve-Route (Legacy entfernt)
Select-String "blogStatus" app/api/praxis/approve/route.ts
# → Keine Treffer erwartet

# Kein Token-Parameter mehr in API-Body (Cookie stattdessen)
Select-String "token.*req\|req.*token" app/api/praxis/comments/route.ts, app/api/praxis/approve/route.ts
# → Keine Treffer erwartet

# Cookie-Name in Session-Helper
Select-String "praxis_session" lib/praxis/session.ts
# → Treffer erwartet

# InvitationToken-Modell
Select-String "model InvitationToken" prisma/schema.prisma
# → Treffer erwartet

# ContentApproval-Modell
Select-String "model ContentApproval" prisma/schema.prisma
# → Treffer erwartet

# Tests grün
pnpm test
```

---

## Migration-Strategie

1. `prisma migrate dev --name praxis_portal_drift_fix` — Neue Modelle erstellen
2. **Datenmigration:** Script das bestehende `PraxisUser.inviteToken`-Werte in
   `InvitationToken`-Tabelle überführt UND bestehende `textResults[].blogStatus`-Werte
   in `ContentApproval`-Tabelle schreibt
3. Erst DANACH alte Felder als `@deprecated` markieren (nicht löschen in diesem Sprint)

---

## Scope-Grenzen

| Was | Status |
|---|---|
| `PraxisUser.inviteToken`-Feld löschen | NICHT in diesem Sprint (deprecated-Marker reicht) |
| `textResults[].blogStatus` aus JSON entfernen | NICHT in diesem Sprint (wird nur nicht mehr geschrieben) |
| Multi-PraxisUser pro Projekt | NICHT in diesem Sprint |
| Praxis-Passwort-Login | NICHT in diesem Sprint |

---

## Commit-Message

```
refactor(praxis-portal): Drift-Fix — InvitationToken + ContentApproval + Cookie-Session + 24h-TTL

BREAKING: API-Routen /api/praxis/comments und /api/praxis/approve
erwarten keinen `token`-Parameter mehr — Auth via httpOnly-Cookie.
```

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> Lies `docs/dev-prompts/Sprint_Closeout.md` vollständig und führe die 4 Schritte aus.

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P3-C DRIFT-FIX ABSCHLUSSBERICHT
========================================

DRIFT-ITEMS:
  1 InvitationToken-Modell:      [ ] DONE
  2 ContentApproval DB-Feld:     [ ] DONE
  3 Cookie-Session:              [ ] DONE
  4 TTL 24h:                     [ ] DONE

CHECKS:
  TypeScript 0 Fehler:           [ ]
  Alle Tests grün:               [ ] x/x PASS
  Cookie httpOnly verifiziert:   [ ]
  Mandantentrennung geprüft:     [ ]
  CHANGELOG aktuell:             [ ]

═══════════════════════════════════════════════
[OK] P3-C DRIFT-FIX ABGESCHLOSSEN
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p3c-drift-fix.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
