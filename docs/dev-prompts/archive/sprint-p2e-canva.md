# Sprint P2-E — Canva Integration (Slice 17)

**Projekt:** Vysible  
**Sprint:** P2-E  
**Format:** Tier 2 (Stub vorhanden, Exploration zuerst)  
**Abhängigkeit:** Sprint P2-D ✅  
**Anforderungen:** plan.md Slice 17, ADR-003 (AES-256), NFA-06 (Retry)  
**Geschätzte Dauer:** ~1,5 Tage

> **Pre-Condition (extern, vor Sprint-Start):**  
> Canva Developer Account und OAuth 2.0 App-Registrierung müssen vorhanden sein.  
> `CANVA_CLIENT_ID` und `CANVA_CLIENT_SECRET` in `.env` eintragen.  
> Redirect-URI in der Canva App registrieren:  
> - Dev: `http://localhost:3000/api/canva/oauth/callback`  
> - Prod: `https://vysible.cloud/api/canva/oauth/callback`

> **Wichtiger Hinweis Roadmap:** Die `canva_loaded`-SSE-Event-Infrastruktur ist  
> bereits in der Pipeline verdrahtet (Sprint Phase-1-Restarbeiten, Commit 36461b3).  
> Dieser Sprint füllt den Canva-Kontext mit echten Daten.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap: Vorgänger P2-D abgeschlossen?
Select-String "P2-D.*✅|Sprint P2-D.*✅" docs/roadmap.md -i

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
# Ist-Stand Canva-Stub
Get-ChildItem lib/canva -Recurse -Name -ErrorAction SilentlyContinue
Get-Content lib/canva/client.ts -ErrorAction SilentlyContinue

# canva_loaded-Event und Context-Builder
Select-String "canva_loaded|canvaLoaded|canvaContext|canva.*inject" lib/generation,lib/ai -Recurse -i |
  Select-Object Path, LineNumber, Line

# Bestehende Canva-API-Routen
Get-ChildItem app/api/canva -Recurse -Name -ErrorAction SilentlyContinue

# Prisma-Schema: CanvaToken / OAuth-Token-Felder vorhanden?
Select-String "CanvaToken\|model Canva\|canvaToken" prisma/schema.prisma -A 12

# API-Key-Manager: Canva-Provider bereits vorhanden?
Select-String "canva" prisma/schema.prisma,lib -Recurse -i |
  Where-Object { $_.Line -match "provider|Provider" } |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# Wizard: CanvaFolderSelector schon vorhanden?
Get-ChildItem components/wizard -Recurse -Name | Select-String "canva" -i

# Wie werden AES-256 Keys aus dem ApiKey-Modell gelesen?
Select-String "decrypt\|encryptedKey" lib -Recurse | Select-Object Path, LineNumber, Line | Select-Object -First 10
```

**Bekannte Lücken (Stand Mai 2026, aus Roadmap + plan.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/canva/auth.ts` | Fehlend — OAuth-Flow, Token-Refresh | MUSS |
| `app/api/canva/oauth/route.ts` | Fehlend — Authorize-Redirect | MUSS |
| `app/api/canva/oauth/callback/route.ts` | Fehlend — Code-Exchange + Token-Speichern | MUSS |
| `app/(dashboard)/settings/canva/page.tsx` | Fehlend — Verbindungs-Status | MUSS |
| `lib/canva/client.ts` | Stub — kein echter API-Call | MUSS |
| `components/wizard/CanvaFolderSelector.tsx` | Fehlend — Ordner-Auswahl im Wizard | MUSS |
| `lib/ai/context-builder.ts` | canva_loaded verdrahtet ✅ — Ordner-Daten als Input fehlen | MOD |

---

## CRITICAL: Self-review Checklist

- [ ] Canva `access_token` und `refresh_token` AES-256 verschlüsselt in DB (lib/crypto/aes.ts)
- [ ] `access_token` erscheint nie in API-Responses, Logs oder Client-Code
- [ ] Auto-Refresh wenn `expiresAt < now + 5min`
- [ ] OAuth-Scope auf Minimum: `asset:read design:content:read` — kein Schreib-Zugriff
- [ ] `withRetry` auf alle Canva API-Calls (Fetch-Aufrufe)
- [ ] Canva-API-Fehler sind non-fatal für die Pipeline: `logger.warn`, kein Rethrow
- [ ] CSRF-Schutz im OAuth-Flow: `state`-Parameter verifiziert
- [ ] Logger: `logger.*` in Server-Code, `console.warn/error('[Vysible] …')` in Client-Components
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — OAuth 2.0 Flow + Token-Storage

**Aufwand:** ~5–6 Stunden  
**Scope:** Authorize-Redirect, Code-Exchange, Token-Verschlüsselung, Auto-Refresh, Settings-Seite.

### IN

```
lib/canva/auth.ts                               NEU — OAuth-Helpers, getValidToken, Auto-Refresh
app/api/canva/oauth/route.ts                    NEU — GET: Authorize-Redirect initiieren
app/api/canva/oauth/callback/route.ts           NEU — GET: Code-Exchange + Token in DB
app/(dashboard)/settings/canva/page.tsx         NEU — Verbindungs-Status + Connect/Disconnect
prisma/schema.prisma                            MOD — CanvaToken-Modell (falls nicht vorhanden)
```

### OUT

```
lib/crypto/aes.ts                               NICHT anfassen
lib/canva/client.ts                             NICHT anfassen (Sub-Slice B)
lib/ai/context-builder.ts                       NICHT anfassen (Sub-Slice B)
```

### A1 — Prisma-Schema (nur wenn CanvaToken fehlt)

> Exploration zeigt, ob `CanvaToken` bereits existiert. Nur bei Fehlen hinzufügen.

```prisma
model CanvaToken {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  encryptedAccessToken  String
  encryptedRefreshToken String
  expiresAt             DateTime
  scope                 String
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

Nach Schema-Änderung: `pnpm prisma migrate dev --name add_canva_token`

### A2 — lib/canva/auth.ts

```typescript
// lib/canva/auth.ts
import { db } from '../db';
import { encrypt, decrypt } from '../crypto/aes';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';

const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';

export async function getValidCanvaToken(userId: string): Promise<string> {
  const token = await db.canvaToken.findUnique({ where: { userId } });
  if (!token) throw new Error('Canva nicht verbunden');

  const needsRefresh = token.expiresAt < new Date(Date.now() + 5 * 60 * 1000);
  if (!needsRefresh) {
    return decrypt(token.encryptedAccessToken);
  }

  return withRetry(async () => {
    const refreshToken = decrypt(token.encryptedRefreshToken);
    const response = await fetch(CANVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.CANVA_CLIENT_ID!,
        client_secret: process.env.CANVA_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      throw new Error(`Canva Token-Refresh fehlgeschlagen: HTTP ${response.status}`);
    }

    const data = await response.json() as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    await db.canvaToken.update({
      where: { userId },
      data: {
        encryptedAccessToken: encrypt(data.access_token),
        // Canva gibt ggf. neuen Refresh-Token zurück (Rotation)
        ...(data.refresh_token ? { encryptedRefreshToken: encrypt(data.refresh_token) } : {}),
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });

    return data.access_token;
  }, 'canva.token_refresh');
}

export async function isCanvaConnected(userId: string): Promise<boolean> {
  const token = await db.canvaToken.findUnique({ where: { userId } });
  return !!token;
}
```

### A3 — OAuth-Routen

```typescript
// app/api/canva/oauth/route.ts — Authorize-Redirect
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL('/login', req.url));

  const state = crypto.randomUUID();
  // state in Cookie für CSRF-Schutz speichern (httpOnly, 10min TTL)
  const cookieStore = cookies();
  cookieStore.set('canva_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.CANVA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/canva/oauth/callback`,
    scope: 'asset:read design:content:read',
    state,
  });

  return NextResponse.redirect(
    `https://www.canva.com/api/oauth/authorize?${params.toString()}`,
  );
}
```

```typescript
// app/api/canva/oauth/callback/route.ts — Code-Exchange
// GET: ?code=...&state=...
// 1. state aus Cookie verifizieren (CSRF)
// 2. POST https://api.canva.com/rest/v1/oauth/token → access_token, refresh_token, expires_in
// 3. encrypt(access_token) + encrypt(refresh_token) → db.canvaToken.upsert
// 4. Cookie löschen
// 5. Redirect zu /settings/canva?connected=1
```

### Acceptance Checklist

- [ ] "Canva verbinden" → OAuth-Flow → Redirect zu Canva → Callback → Token in DB (verschlüsselt)
- [ ] `access_token` und `refresh_token` in DB als verschlüsselte Strings (nie Klartext)
- [ ] Token `expiresAt < now + 5min` → Auto-Refresh beim nächsten `getValidCanvaToken`-Call
- [ ] `access_token` erscheint nicht in Logs, Responses oder Client-Code
- [ ] CSRF: State-Mismatch → 400-Fehler
- [ ] Settings-Seite `/settings/canva` zeigt:
  - Verbunden: "Verbunden (läuft ab: DD.MM.YYYY)" + Disconnect-Button
  - Nicht verbunden: "Nicht verbunden" + "Canva verbinden"-Button
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(canva): OAuth 2.0 Flow + Token-Refresh + Settings-Seite (Slice 17 Sub-A)
```

---

## Sub-Slice B — Ordner-Abruf + Kontext-Injektion

**Aufwand:** ~4–5 Stunden  
**Scope:** Canva-Ordner listen, Asset-Namen abrufen, Kontext-Injektion im Pipeline-System-Prompt.

### IN

```
lib/canva/client.ts                             MOD — echte Ordner/Asset-API-Calls
app/api/canva/folders/route.ts                  NEU — Ordner-Liste für Wizard-Dropdown
components/wizard/CanvaFolderSelector.tsx       NEU — Client-Komponente für Wizard Step 3
lib/ai/context-builder.ts                       MOD — Canva-Asset-Namen in Kontext befüllen
```

### OUT

```
lib/canva/auth.ts                               NICHT anfassen (Sub-Slice A)
app/api/canva/oauth/                            NICHT anfassen (Sub-Slice A)
prisma/schema.prisma                            NICHT anfassen
```

### B1 — lib/canva/client.ts

```typescript
// lib/canva/client.ts
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { getValidCanvaToken } from './auth';

const CANVA_API = 'https://api.canva.com/rest/v1';

export interface CanvaFolder {
  id: string;
  name: string;
}

export interface CanvaAsset {
  id: string;
  name: string;
  type: string;
}

export async function listFolders(userId: string): Promise<CanvaFolder[]> {
  return withRetry(async () => {
    const token = await getValidCanvaToken(userId);
    const response = await fetch(`${CANVA_API}/folders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Canva Folders HTTP ${response.status}`);
    const data = await response.json() as { items?: CanvaFolder[] };
    return data.items ?? [];
  }, 'canva.list_folders');
}

export async function listFolderAssets(folderId: string, userId: string): Promise<CanvaAsset[]> {
  return withRetry(async () => {
    const token = await getValidCanvaToken(userId);
    const response = await fetch(`${CANVA_API}/folders/${folderId}/items`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Canva Assets HTTP ${response.status}`);
    const data = await response.json() as { items?: CanvaAsset[] };
    return data.items ?? [];
  }, 'canva.list_folder_assets');
}
```

> **Hinweis:** Die genauen Canva Connect API-Endpunkte (v1 vs. v2, exakte Pfade) aus der
> Canva-Entwicklerdokumentation verifizieren — API kann leicht abweichen.  
> URL-Pattern: `https://api.canva.com/rest/v1/` ist der aktuelle Base-Pfad (Stand Mai 2026).

### B2 — Kontext-Injektion in context-builder.ts

In `lib/ai/context-builder.ts` den bestehenden Canva-Kontext-Block (canva_loaded)
so ergänzen, dass echte Asset-Namen injiziert werden:

```typescript
// Canva-Asset-Kontext (non-fatal: bei Fehler weitermachen ohne Canva-Kontext)
if (canvaFolderId && userId) {
  try {
    const assets = await listFolderAssets(canvaFolderId, userId);
    if (assets.length > 0) {
      const assetList = assets.slice(0, 20).map(a => `- ${a.name} (${a.type})`).join('\n');
      canvaContext = `\n\nVerfügbare Canva-Assets (Ordner: ${canvaFolderName ?? canvaFolderId}):\n${assetList}`;
    }
  } catch (exc: unknown) {
    logger.warn({ err: exc }, '[Vysible] Canva-Asset-Abruf fehlgeschlagen — Pipeline läuft ohne Canva-Kontext');
  }
}
```

### B3 — CanvaFolderSelector (Client-Komponente, Wizard Step 3)

```typescript
// components/wizard/CanvaFolderSelector.tsx
'use client';
// Fetcht GET /api/canva/folders bei Mount
// Zeigt Dropdown mit Ordner-Namen
// Auswahl → gibt folderId + folderName an Wizard-State weiter
// Canva nicht verbunden → "Canva nicht verbunden" + Link zu /settings/canva
// Fehler beim Laden → "[WARN] Ordner konnten nicht geladen werden" (kein Hard-Fail)
```

### Acceptance Checklist

- [ ] Canva verbunden → Wizard Step 3 zeigt Ordner-Dropdown mit echten Ordner-Namen
- [ ] Ordner gewählt → Asset-Namen im KI-System-Prompt sichtbar (Logging prüfen)
- [ ] `canva_loaded`-SSE-Event korrekt ausgelöst (Pipeline-Log prüfen)
- [ ] Canva nicht verbunden → Ordner-Selector zeigt "Nicht verbunden"-Hinweis ohne Hard-Fail im Wizard
- [ ] Canva-API-Fehler (z.B. abgelaufener Token nach Refresh-Versuch) → `logger.warn`, Pipeline läuft weiter
- [ ] Scope: kein Design-Rendering, keine Upload-Funktionen
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(canva): Ordner-Abruf + Asset-Kontext-Injektion + Wizard-Selector (Slice 17 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# access_token nie in API-Responses oder Logs
Select-String "access_token" app/api/canva -Recurse |
  Where-Object { $_.Line -notmatch "encrypt|decrypt|Bearer|\.access_token\s*=" }
# → Zero direkte Leak-Treffer

# withRetry auf allen Canva-Fetch-Calls
Select-String "fetch.*canva\.com" lib/canva -Recurse
# → Alle innerhalb withRetry-Callbacks (manuell prüfen)

# Canva-Fehler non-fatal (kein Rethrow in context-builder)
Select-String "canvaContext\|listFolderAssets" lib/ai/context-builder.ts
# → In try-catch mit logger.warn, kein throw

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Design-Rendering / Vorschau | Canva Apps SDK — Phase 5 (Entscheidungslog plan.md) |
| Asset-Upload zu Canva | Scope laut plan.md: nur Lesen |
| Mehrere Canva-Accounts gleichzeitig | Single-Tenant — ein Account reicht |
| Canva-Designs direkt als Social-Post-Bild | Slice 18 (Social Media) + Phase 5 |
| Token-Ablauf-Banner im Dashboard | Slice 26 (Token-Ablauf-Warnsystem) |

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
SPRINT P2-E ABSCHLUSSBERICHT
==============================

Sprint: P2-E — Canva Integration (Slice 17)

SUB-SLICES:
  A OAuth-Flow + Token-Storage:    [ ] DONE — Commit: <hash>
  B Ordner-Abruf + Kontext:        [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  access_token nie in Logs:        [ ]
  withRetry auf allen Calls:       [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P2-E ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P3-A (Kosten-Tracking pro Kunde — Slice 27)
   Hinweis: Slice 18 (Social Media) benötigt Meta-Business-Verifizierung
   (Vorlaufzeit Wochen — sofort beantragen falls noch nicht geschehen).
   Falls Meta-Verifizierung ausstehend: direkt P3-A starten.
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p2e-canva.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
