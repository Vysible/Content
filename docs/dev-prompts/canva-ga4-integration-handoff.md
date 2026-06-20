# Handoff: Canva & GA4 Integration — Fehleranalyse, Fix-Anweisungen & Verifikation

**Projekt:** Vysible (`Vys_MarkMng`)  
**Erstellt:** 2026-06-20  
**Status:** Analyse abgeschlossen — **keine Fixes in diesem Dokument** (reine Übergabe an Implementierungs-Agent)  
**Zielgruppe:** Claude / KI-Agent mit Schreibrechten auf das Repo  
**Prod-URL:** `https://vysible.cloud`

---

## 0. Anweisungen an den Implementierungs-Agenten (Claude)

### 0.1 Auftrag

Behebe die in diesem Dokument beschriebenen Defekte in **Canva** (Connect API, OAuth, Asset-Abruf) und **Google Analytics 4** (Data API, Property-ID-Handling). Ziel: beide Integrationen sind auf `vysible.cloud` **nachweisbar funktionsfähig**.

### 0.2 Governance (verbindlich)

Lies vor dem ersten Commit:

- `AGENTS.md` — Sicherheit, Resilience, keine Secrets im Code
- `.cursor/rules/schicht-0/resilience.mdc` — kein stiller `catch`, `withRetry` auf externe IO
- `.cursor/rules/schicht-0/secrets-policy.mdc` — Credentials nur in `.env` / Coolify
- `.cursor/rules/schicht-0/git-commits-and-changelog.mdc` — `CHANGELOG.md` im selben Commit
- `docs/forge-web-deviations.md` — keine neuen stillen Catches in Client Components

**Hard rules für diese Aufgabe:**

1. **Keine echten Secrets** committen, loggen oder in Tests hardcoden. Canva/GA4-Credentials nur via `process.env` / Test-Mocks.
2. **Kein PII in Logs** — nur IDs (`userId`, `projectId`, `propertyId`).
3. **Jeder `catch`** muss `logger.warn/error` oder re-throw haben.
4. **Externe HTTP-Calls** (Canva, Google) über `withRetry` aus `lib/utils/retry.ts`.
5. **Vor neuen Helpers:** `grep` — keine Duplikation (z. B. PKCE-Helper zentral in `lib/canva/`).
6. **CHANGELOG.md** unter `[Unreleased]` mit user-facing Bullets aktualisieren.
7. **Commit nur auf explizite Anfrage** des Users — bis dahin Änderungen staged/lokal belassen oder User fragen.

### 0.3 Empfohlene Fix-Reihenfolge

| Phase | Scope | Begründung |
|-------|-------|------------|
| **P0** | GA4 Property-ID-Normalisierung + Validierung | Kleiner Diff, hoher Impact, keine externen Abhängigkeiten |
| **P0** | Canva Response-Parser (`listFolderAssets`) | Assets erscheinen sofort, wenn OAuth schon funktioniert |
| **P1** | Canva OAuth PKCE + Scopes + Token-Auth (Basic) | Blockiert gesamten OAuth-Flow bei neuer Canva-API |
| **P1** | Canva `listFolders` → `GET /folders/root/items` | Blockiert Ordner-Dropdown |
| **P2** | Pipeline: Canva-User = Session-User oder explizites Mapping | Multi-User-Betrieb |
| **P2** | GA4 `private_key`-Normalisierung, `runReport` mit Retry | Prod-Robustheit |
| **P3** | Doku: Benutzerhandbuch vs. Read-Only-Canva angleichen | Erwartungsmanagement |
| **P3** | Tests (siehe Abschnitt 8) | Regressionsschutz |

### 0.4 Definition of Done (Acceptance Criteria)

**Canva:**

- [ ] OAuth-Flow auf Dev **und** Prod: Settings → „Canva verbinden“ → Redirect → „Verbunden“ ohne `?error=`
- [ ] `GET /api/canva/folders` liefert `{ connected: true, folders: [...] }` mit mindestens einem Eintrag (wenn Canva-Account Ordner hat)
- [ ] Projekt mit `canvaFolderId` → `GET /api/projects/{id}/canva` liefert `assets` mit `id`, `name`, `type`, optional `thumbnailUrl`
- [ ] Generierung: SSE-Event `canva_loaded` mit `{ assetCount: N }`, `N > 0` wenn Ordner Designs enthält
- [ ] Results/Social-Tab: Canva-Templates sichtbar, „In Canva öffnen“ öffnet gültige URL
- [ ] Unit-Tests für Parser + PKCE + Property-ID-Normalisierung grün
- [ ] Keine Regression: `pnpm test --run` und `tsc --noEmit` grün

**GA4:**

- [ ] `GA4_SERVICE_ACCOUNT_JSON` gesetzt (Coolify) — App startet ohne Crash
- [ ] Property-ID `123456789` **und** Legacy-Eingabe `properties/123456789` werden normalisiert gespeichert
- [ ] `GET /api/projects/{id}/analytics?startDate=28daysAgo&endDate=today` → HTTP 200 mit `sessions`, `users`, `pageviews`
- [ ] Dashboard `/analytics` und `/projects/{id}/analytics` zeigen Metriken oder verständliche Fehlermeldung
- [ ] Unit-Tests für Property-ID + JWT/JSON-Parsing (mocked) grün

---

## 1. Executive Summary

| Integration | Implementierungsstand | Hauptursache „funktioniert nicht“ |
|-------------|----------------------|-----------------------------------|
| **Canva** | OAuth + Read-Only Assets ~35–60 % (vgl. `docs/dev-prompts/concept-vs-implementation.md` Slice 17) | **Code-Defekte** gegen aktuelle Canva Connect API: fehlendes PKCE, falscher List-Folders-Endpoint, falsches JSON-Parsing, fehlende Scopes |
| **GA4** | Dashboard + `lib/ga4/client.ts` vorhanden | **Property-ID-Format-Bug** in Code/UI + typische **Ops**-Fehler (Service Account, GCP API, JSON in Coolify) |

**Wichtig:** Im Repo ist **Canva** (Design-Plattform) integriert — nicht HTML-Canvas (`next.config.mjs` setzt `canvas: false` nur für pdfjs-dist).

Beide Integrationen können **ohne harten Crash** scheitern:

- **Canva:** Pipeline fängt Fehler ab → leerer KI-Kontext, leere Template-Liste (HTTP 200 mit `[]`).
- **GA4:** Fehler werden als JSON an UI durchgereicht (502/503/422).

---

## 2. Canva — Detaillierte Analyse

### 2.1 Erwartetes vs. tatsächliches Verhalten

| Quelle | Versprochen | Implementiert |
|--------|-------------|---------------|
| `docs/user-manual/benutzerhandbuch.md` § Canva | „Grafik erstellen“, Vorlage in Canva, automatische Verknüpfung | **Nicht implementiert** — nur Read-Only |
| `app/(dashboard)/settings/canva/page.tsx` | OAuth Read-Only, Scopes `asset:read` / `design:content:read` | Stimmt mit Code überein |
| `docs/dev-prompts/plan-v6.1.md` Slice 17 | OAuth, Ordner-Mapping, Kontext-Injektion, kein Design-Rendering | Teilweise — Kontext-Injektion verdrahtet, API-Aufrufe fehlerhaft |

### 2.2 Architektur (Ist-Zustand)

```
┌─────────────────────────────────────────────────────────────────┐
│  UI                                                              │
│  /settings/canva          → OAuth starten / Status               │
│  Wizard + ProjectCanvaSettings → CanvaFolderSelector             │
│  ResultsTabs / ImageBriefCard → Template-Links                   │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│  API Routes                                                      │
│  GET  /api/canva/oauth              → Redirect zu Canva          │
│  GET  /api/canva/oauth/callback     → Code → Token → DB          │
│  GET  /api/canva/folders            → Ordnerliste (Wizard)       │
│  POST /api/canva/disconnect         → Token löschen              │
│  GET  /api/projects/[id]/canva      → Assets für Results-UI      │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│  lib/canva/                                                      │
│  auth.ts   → OAuth, Token refresh, AES persist                   │
│  client.ts → listFolders, listFolderAssets, buildCanvaContext    │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│  lib/generation/pipeline.ts → step 'canva_loaded'                  │
│  Nutzt project.canvaFolderId + project.createdById               │
└─────────────────────────────────────────────────────────────────┘
```

**Datenmodell (Prisma):**

- `CanvaToken` — pro **User** (`userId`), verschlüsselte Access/Refresh-Tokens
- `Project.canvaFolderId` — pro **Projekt**, manuell oder per Wizard gewählt

### 2.3 Betroffene Dateien

| Datei | Rolle |
|-------|-------|
| `lib/canva/auth.ts` | OAuth URL, Token exchange/refresh, Scopes |
| `lib/canva/client.ts` | REST-Calls, Response-Mapping, `buildCanvaContext` |
| `app/api/canva/oauth/route.ts` | OAuth-Start, CSRF-State-Cookie |
| `app/api/canva/oauth/callback/route.ts` | Callback, Persistenz |
| `app/api/canva/folders/route.ts` | Ordner für Wizard |
| `app/api/projects/[id]/canva/route.ts` | Assets für UI |
| `lib/generation/pipeline.ts` | `canva_loaded` Schritt |
| `components/wizard/CanvaFolderSelector.tsx` | Client-Dropdown |
| `components/project/ProjectCanvaSettings.tsx` | Projekt-Ordner speichern |
| `components/results/ResultsTabs.tsx` | Social Canva-Panel |
| `components/results/ImageBriefCard.tsx` | Bildbriefing + Templates |

### 2.4 Befund A — OAuth ohne PKCE (P1 — wahrscheinlicher OAuth-Blocker)

**Canva Connect API (Stand 2025/2026):** Authorization Code Flow **mit PKCE (SHA-256)** ist Pflicht.

Dokumentation: https://www.canva.dev/docs/connect/authentication/

**Ist-Code** (`lib/canva/auth.ts`):

```typescript
export const CANVA_AUTHORIZE_URL = 'https://www.canva.com/api/oauth/authorize'
export const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token'
export const CANVA_SCOPE = 'asset:read design:content:read'

export function buildAuthorizeUrl(state: string): string {
  const { clientId } = requireClientCredentials()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: CANVA_SCOPE,
    state,
  })
  return `${CANVA_AUTHORIZE_URL}?${params.toString()}`
}
```

**Fehlt:**

- `code_challenge` (SHA-256 Hash des Verifiers, Base64URL)
- `code_challenge_method=s256`
- Beim Token-Exchange: `code_verifier`
- Empfohlen: HTTP **Basic Auth** Header `Authorization: Basic base64(client_id:client_secret)` statt Credentials nur im Body

**Symptom:** Nach Canva-Freigabe Redirect zu `/settings/canva?error=token_exchange_failed` oder Canva zeigt Authorize-Fehler.

**Log (Coolify):**

```
Canva-Code-Exchange oder Token-Speichern fehlgeschlagen
Canva-Token-Exchange fehlgeschlagen: HTTP 400 ...
```

**Fix-Anweisung für Claude:**

1. Neues Modul z. B. `lib/canva/pkce.ts`:
   - `generateCodeVerifier(): string` (43–128 Zeichen, crypto-random)
   - `generateCodeChallenge(verifier: string): string` (SHA-256, base64url)
2. In `app/api/canva/oauth/route.ts`: `code_verifier` im **httpOnly Cookie** `canva_oauth_verifier` speichern (neben `canva_oauth_state`, gleiche TTL).
3. In `buildAuthorizeUrl`: `code_challenge` + `code_challenge_method=s256` anhängen.
4. In `exchangeCodeForToken(code, codeVerifier)`: `code_verifier` im Body; optional Basic Auth Header.
5. Callback: Verifier aus Cookie lesen, Cookie löschen (single-use), an Exchange übergeben.

---

### 2.5 Befund B — `listFolders()` ruft nicht existierenden Endpoint auf (P1)

**Ist-Code** (`lib/canva/client.ts`):

```typescript
const CANVA_API = 'https://api.canva.com/rest/v1'

export async function listFolders(userId: string): Promise<CanvaFolder[]> {
  return withRetry(async () => {
    const token = await getValidCanvaToken(userId)
    const res = await fetch(`${CANVA_API}/folders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    // ...
  }, 'canva.list_folders')
}
```

**Canva API (offizielle Referenz):** Es gibt **kein** `GET /v1/folders` zum Auflisten aller Ordner.

Verfügbare Folder-Endpoints:

| Method | Path | Zweck |
|--------|------|-------|
| POST | `/v1/folders` | Ordner erstellen |
| GET | `/v1/folders/{folderId}` | Metadaten eines Ordners |
| GET | `/v1/folders/{folderId}/items` | **Inhalt** (Designs, Bilder, Unterordner) |
| PATCH/DELETE | `/v1/folders/{folderId}` | Update/Löschen |

Dokumentation List Items: https://www.canva.dev/docs/connect/api-reference/folders/list-folder-items/

**Symptom:** `GET /api/canva/folders` → HTTP **502**, UI: „Canva-Ordner konnten nicht geladen werden“.

**Log:**

```
[Vysible] Canva-Ordner konnten nicht geladen werden
Canva Folders HTTP 404   (oder 405)
```

**Fix-Anweisung:**

```typescript
// Pseudocode — Zielimplementierung
const res = await fetch(`${CANVA_API}/folders/root/items?item_types=folder`, {
  headers: { Authorization: `Bearer ${token}` },
})
// Response items: { type: 'folder', folder: { id, name, ... } }
// Pagination: continuation-Token auswerten (while continuation)
```

- `folderId = 'root'` für Top-Level-Projektordner (Canva-Doku).
- `item_types=folder` filtert nur Unterordner.
- **Continuation:** Canva liefert `continuation` — alle Seiten laden (max. 100/Request).

---

### 2.6 Befund C — Falsches Response-Parsing in `listFolderAssets()` (P0 — stille Leere)

**Ist-Code** (`lib/canva/client.ts`):

```typescript
interface RawFolderItem {
  id?: string
  name?: string
  type?: string
  thumbnail?: { url?: string }
}

// ...
return (data.items ?? [])
  .filter((it): it is RawFolderItem & { id: string; name: string; type: string } =>
    typeof it.id === 'string' && typeof it.name === 'string' && typeof it.type === 'string',
  )
  .map((it) => ({
    id: it.id,
    name: it.name,
    type: it.type,
    thumbnailUrl: it.thumbnail?.url,
  }))
```

**Tatsächliche Canva-API-Response** (Beispiel aus Doku):

```json
{
  "items": [
    {
      "type": "design",
      "design": {
        "id": "DAFVztcvd9z",
        "title": "My summer holiday",
        "thumbnail": { "url": "https://..." }
      }
    },
    {
      "type": "image",
      "image": {
        "id": "Msd59349ff",
        "name": "My Awesome Upload",
        "thumbnail": { "url": "https://..." }
      }
    },
    {
      "type": "folder",
      "folder": { "id": "FAF2lZtloor", "name": "My folder" }
    }
  ],
  "continuation": "..."
}
```

**Konsequenz:** Der `filter` verwirft **alle** Items → `assets: []` bei HTTP 200.

**Symptom:**

- OAuth „Verbunden“, Ordner gewählt, aber **0 Templates** in Results
- Pipeline: `canva_loaded` mit `assetCount: 0` oder `skipped: true`
- KI bekommt keinen Canva-Kontext

**Fix-Anweisung:**

Neue Funktion `mapCanvaFolderItem(item: CanvaApiItem): CanvaAsset | null`:

| `item.type` | ID | Name | Thumbnail |
|-------------|-----|------|-----------|
| `design` | `item.design.id` | `item.design.title` | `item.design.thumbnail?.url` |
| `image` | `item.image.id` | `item.image.name` | `item.image.thumbnail?.url` |
| `brand_template` | `item.brand_template.id` | `item.brand_template.title` | `item.brand_template.thumbnail?.url` |
| `folder` | — | — | **überspringen** (oder separat für listFolders) |

Für „In Canva öffnen“-Links:

- Bevorzugt `design.urls.edit_url` aus API (temporär, 30 Tage gültig)
- Fallback: `https://www.canva.com/design/${id}/edit` (aktuell in `ImageBriefCard.tsx` / `ResultsTabs.tsx`)

**UI-Dateien mit hardcoded URL:**

- `components/results/ImageBriefCard.tsx` Zeile ~168
- `components/results/ResultsTabs.tsx` Zeile ~638

---

### 2.7 Befund D — Fehlende / falsche OAuth-Scopes (P1)

**Ist:**

```typescript
export const CANVA_SCOPE = 'asset:read design:content:read'
```

**Soll (laut Canva Scopes + genutzte Endpoints):**

- `folder:read` — **Pflicht** für `GET /folders/{id}/items`
- `asset:read` — Assets/Bilder
- `design:meta:read` — Design-Metadaten (statt `design:content:read` prüfen in https://www.canva.dev/docs/connect/appendix/scopes/)

**Symptom:** HTTP **403** auf Folder-Items trotz „verbunden“.

**Fix:** Scope-String in `auth.ts` anpassen; **bestehende Tokens** erfordern Re-Connect (Disconnect → neu verbinden), da Scope bei Refresh nicht erweitert wird.

---

### 2.8 Befund E — User-Mismatch Pipeline vs. OAuth (P2)

**Pipeline** (`lib/generation/pipeline.ts`):

```typescript
case 'canva_loaded': {
  if (project.canvaFolderId) {
    try {
      const assets = await listFolderAssets(project.canvaFolderId, project.createdById)
      ctx.canvaContext = buildCanvaContext(assets)
      // ...
    } catch (err: unknown) {
      logger.warn({ err, projectId: project.id }, 'Canva-API nicht erreichbar — Kontext leer')
      ctx.canvaContext = ''
      await emitEvent(jobId, {
        type: 'canva_loaded',
        data: { skipped: true, reason: 'Canva-API nicht erreichbar' },
        // ...
      })
    }
  }
}
```

**Wizard/Folders** nutzen `session.user.id` — Pipeline nutzt `project.createdById`.

**Symptom:** User B verbindet Canva, User A hat Projekt erstellt → Generierung ohne Canva, **ohne sichtbaren Fehler in UI**.

**Fix-Optionen (eine wählen, in ADR/Commit begründen):**

1. **Einfach:** Pipeline nutzt `job.userId` / `job.startedById` falls im Job-Store vorhanden
2. **Explizit:** `Project.canvaConnectedUserId` speichern beim Ordner-Save
3. **Single-Tenant:** Dokumentieren, dass nur ein Agentur-User Canva verbinden soll (Workaround, nicht ideal)

---

### 2.9 Befund F — Non-fatal Error Handling (by design, aber verwirrend)

Canva-Fehler in der Pipeline sind **absichtlich non-fatal** — Generierung läuft weiter. Das ist fachlich OK, erschwert aber Debugging.

**Empfehlung:** SSE-Event `canva_loaded` bei Fehler um `errorCode` erweitern (z. B. `not_connected`, `api_error`, `parse_empty`) — nur wenn UI/SSE-Consumer angepasst wird.

---

### 2.10 Ops-Checkliste Canva

| Prüfpunkt | Wo | Typischer Fehler |
|-----------|-----|------------------|
| `CANVA_CLIENT_ID` | Coolify Env | Fehlt → `oauth_init_failed` |
| `CANVA_CLIENT_SECRET` | Coolify Env | Fehlt → `oauth_init_failed` |
| `NEXTAUTH_URL` | Coolify Env | Muss `https://vysible.cloud` sein (kein trailing slash in `getRedirectUri` wird gestrippt) |
| Redirect URI | Canva Developer Portal | Exakt `{NEXTAUTH_URL}/api/canva/oauth/callback` |
| Connect Integration | Canva Portal | „Connect“-Typ, nicht nur Apps SDK |
| `ENCRYPTION_SECRET_V1` | Coolify | Nach Rotation: `decrypt` auf alten Tokens schlägt fehl → Re-Connect |
| Canva-Account | User | Kostenloser Account reicht für OAuth |

**State-Mismatch** (`app/api/canva/oauth/callback/route.ts`):

```typescript
if (!stateFromCookie || stateFromCookie !== stateFromQuery) {
  logger.warn({ userId: session.user.id }, '[Vysible] Canva-OAuth State-Mismatch (CSRF-Verdacht)')
  return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
}
```

Symptom: Rohes JSON `{ "error": "Invalid state" }` statt Redirect — Cookie abgelaufen, anderer Browser, parallele Tabs.

---

## 3. Google Analytics 4 — Detaillierte Analyse

### 3.1 Architektur (Ist-Zustand)

```
┌─────────────────────────────────────────────────────────────────┐
│  Coolify: GA4_SERVICE_ACCOUNT_JSON (global, ein Service Account) │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│  lib/ga4/client.ts                                               │
│  getServiceAccount() → JSON.parse(env)                           │
│  buildJwt() → RS256 signieren                                    │
│  fetchAccessToken() → Google OAuth (mit Token-Cache)             │
│  fetchGA4Metrics() → 4× runReport parallel                       │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│  GET /api/projects/[id]/analytics                                │
│  Prüft: Auth, GA4_SERVICE_ACCOUNT_JSON, project.ga4PropertyId    │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│  UI: GA4Dashboard, AnalyticsTabView, ProjectGA4Settings          │
└─────────────────────────────────────────────────────────────────┘
```

**Wichtig:** Vysible installiert **kein** gtag/Measurement Protocol auf Praxis-Websites. Es liest nur Daten, die **bereits in GA4** existieren (Website muss separat getrackt sein).

### 3.2 Betroffene Dateien

| Datei | Rolle |
|-------|-------|
| `lib/ga4/client.ts` | JWT, Token, runReport, Metrik-Aggregation |
| `app/api/projects/[id]/analytics/route.ts` | HTTP-API für Dashboard |
| `app/api/projects/[id]/settings/ga4/route.ts` | Property-ID speichern |
| `components/analytics/GA4Dashboard.tsx` | Client-Fetch, Fehleranzeige |
| `components/analytics/GA4SetupGuide.tsx` | Einrichtungsanleitung |
| `components/analytics/AnalyticsTabView.tsx` | Global Analytics-Seite |
| `app/(dashboard)/projects/[id]/settings/ProjectGA4Settings.tsx` | Property-ID Input |

### 3.3 Befund A — Property-ID Doppel-Präfix (P0 — sehr wahrscheinlicher Bug)

**API-Aufruf** (`lib/ga4/client.ts`):

```typescript
const res = await fetch(
  `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
  { method: 'POST', /* ... */ }
)
```

Google erwartet: `propertyId` = **numerische ID**, z. B. `123456789`  
→ URL: `.../v1beta/properties/123456789:runReport`

**UI fordert fälschlich Präfix** (`ProjectGA4Settings.tsx`):

```tsx
placeholder="properties/123456789"
```

**Setup-Guide** (`GA4SetupGuide.tsx` Schritt 6):

> „… hier in das Feld `properties/123456789` eintragen …“

**Speichern ohne Validierung** (`app/api/projects/[id]/settings/ga4/route.ts`):

```typescript
const patchSchema = z.object({
  ga4PropertyId: z.string(),
})
// ...
data: { ga4PropertyId: parsed.data.ga4PropertyId || null },
```

**Ergebnis bei Befolgung der Anleitung:**

```
https://analyticsdata.googleapis.com/v1beta/properties/properties/123456789:runReport
→ HTTP 400 INVALID_ARGUMENT
```

**Fix-Anweisung:**

1. `lib/ga4/normalize-property-id.ts`:

```typescript
export function normalizeGa4PropertyId(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(?:properties\/)?(\d+)$/)
  if (!match) throw new Error('Ungültige GA4 Property-ID — nur Ziffern oder properties/123456789')
  return match[1]
}
```

2. In PATCH-Route und optional GET-Response anwenden.
3. UI Placeholder + `GA4SetupGuide` auf `123456789` ändern.
4. **Datenmigration:** Bestehende DB-Einträge mit `properties/` Prefix beim Laden normalisieren (idempotent).

---

### 3.4 Befund B — Service Account JSON in Coolify (Ops, häufig)

**Laden** (`lib/ga4/client.ts`):

```typescript
function getServiceAccount(): ServiceAccountKey {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON
  if (!raw) {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON nicht konfiguriert')
  }
  try {
    return JSON.parse(raw) as ServiceAccountKey
  } catch {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON ist kein valides JSON')
  }
}
```

**Typische Prod-Fehler:**

| Problem | Symptom | Log |
|---------|---------|-----|
| Variable nicht gesetzt | HTTP 503 „GA4 Service Account nicht konfiguriert“ | — |
| JSON einzeilig mit `\"` ok, aber `private_key` ohne `\n` | JWT sign fail / invalid_grant | `GA4 Token-Fehler` status 400 |
| Multi-line JSON in Coolify falsch escaped | `ist kein valides JSON` | — |
| Analytics Data API nicht aktiviert | 403 | `GA4 runReport fehlgeschlagen` |
| Service Account nicht in GA4 Property | 403 PERMISSION_DENIED | `GA4 runReport fehlgeschlagen` body enthält PERMISSION_DENIED |

**Fix-Anweisung:**

```typescript
function normalizePrivateKey(key: string): string {
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key
}
```

Vor `sign.sign(sa.private_key, ...)` anwenden.

**Ops (manuell auf Prod):**

1. GCP → APIs & Dienste → **Google Analytics Data API** aktivieren
2. IAM → Service Account → JSON-Key erzeugen
3. GA4 → Verwaltung → Property-Zugriffsmanagement → `client_email` als **Betrachter**
4. Coolify → `GA4_SERVICE_ACCOUNT_JSON` = kompletter JSON-Inhalt → Container **neu starten**

---

### 3.5 Befund C — `runReport` ohne Retry (P2)

Nur `fetchAccessToken` nutzt `withRetry`. Die vier parallelen `runReport`-Calls in `fetchGA4Metrics` nicht.

**Fix:** `runReport` in `withRetry(..., 'ga4.runReport')` wrappen (Resilience-Regel §3c).

---

### 3.6 Befund D — Dashboard sendet ISO-Datum statt GA4-Makros

**GA4Dashboard** sendet:

```typescript
const params = new URLSearchParams({ startDate: r.startDate, endDate: r.endDate })
// z. B. startDate=2026-05-23, endDate=2026-06-20
```

GA4 Data API akzeptiert `YYYY-MM-DD` — **das ist korrekt**.

API-Route Defaults (`app/api/projects/[id]/analytics/route.ts`):

```typescript
const startDate = searchParams.get('startDate') ?? '28daysAgo'
const endDate = searchParams.get('endDate') ?? 'today'
```

Kein Bug — nur zur Klarstellung.

---

### 3.7 Befund E — `ga4Configured` prüft nur Existenz

`app/(dashboard)/analytics/page.tsx`:

```typescript
const ga4Configured = !!process.env.GA4_SERVICE_ACCOUNT_JSON
```

Tab „Zugangsdaten“ zeigt grün „✓ Gesetzt“, auch wenn JSON ungültig ist.

**Optional:** Health-Endpoint `GET /api/healthz/ga4` der nur Token-Anfrage testet (ohne Property).

---

### 3.8 Befund F — UX: Link zu Settings vs. Anbindungen

`GA4Dashboard` verlinkt bei Fehler auf `/projects/{id}/settings`. Property-ID liegt auch unter `/projects/{id}/connections` (Tab „Anbindungen“). Beides funktioniert — `ProjectGA4Settings` ist an beiden Orten eingebunden.

---

## 4. Fix-Anweisungen für Claude (Implementierungsdetails)

### 4.1 Canva — Konkrete Tasks

#### Task C1: PKCE implementieren

**Dateien:** `lib/canva/pkce.ts` (neu), `lib/canva/auth.ts`, `app/api/canva/oauth/route.ts`, `app/api/canva/oauth/callback/route.ts`

**Schritte:**

1. `generateCodeVerifier()` — 32 Bytes random, base64url
2. `generateCodeChallenge(verifier)` — SHA256, base64url
3. OAuth-Start: Cookie `canva_oauth_verifier` setzen (httpOnly, secure in prod, sameSite lax, 600s)
4. `buildAuthorizeUrl(state, codeChallenge)` erweitern
5. `exchangeCodeForToken(code, codeVerifier)` — `code_verifier` im POST body
6. Token-Endpoint: Header `Authorization: Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
7. Bestehende Tests + neue Unit-Tests für PKCE (deterministischer Testvektor)

#### Task C2: Scopes korrigieren

```typescript
export const CANVA_SCOPE = 'folder:read asset:read design:meta:read'
```

In Settings-UI Text anpassen (`settings/canva/page.tsx`).

#### Task C3: `listFolders` auf root/items umstellen

- Endpoint: `GET /v1/folders/root/items?item_types=folder`
- Pagination mit `continuation`
- Mapping: `item.folder.id`, `item.folder.name`

#### Task C4: `listFolderAssets` Response-Parser

- Neues Interface für Canva API Item union type
- `mapFolderItemsToAssets(items): CanvaAsset[]`
- Continuation für >50 Items
- Optional: `item_types=design,image,brand_template`

#### Task C5: Design-URLs

- `CanvaAsset` um `editUrl?: string` erweitern
- UI: `href={asset.editUrl ?? fallback}`

#### Task C6: Pipeline User-ID

- Prüfen ob `JobState` / `createJob` `userId` speichert
- `listFolderAssets(folderId, initiatingUserId)` statt `createdById`
- Falls nicht vorhanden: `createdById` beibehalten + Warning loggen

### 4.2 GA4 — Konkrete Tasks

#### Task G1: Property-ID normalisieren

- `lib/ga4/normalize-property-id.ts` (neu)
- In `settings/ga4/route.ts` PATCH + in `fetchGA4Metrics` defensive normalize
- UI Placeholder + GA4SetupGuide korrigieren

#### Task G2: private_key normalisieren

- In `getServiceAccount()` nach JSON.parse `sa.private_key = normalizePrivateKey(sa.private_key)`

#### Task G3: runReport mit Retry

- `withRetry(() => runReportOnce(...), 'ga4.runReport')`

#### Task G4 (optional): Health check

- `GET /api/healthz/ga4` — nur in Dev/Admin, Token holen, 200/503

---

## 5. Prod-Checkliste vysible.cloud

### 5.1 Vorbereitung

1. In Chrome/Edge eingeloggt auf `https://vysible.cloud`
2. DevTools → **Network** → „Preserve log“ aktivieren
3. Coolify → App-Logs streamen (oder nach Test Zeitraum filtern)
4. **Keine** Secrets in Screenshots/Tickets

### 5.2 Canva — Symptom → DevTools → Logs

#### Symptom: „OAuth init failed“ beim Klick „Canva verbinden“

| Schritt | DevTools (Network) | Erwartung bei OK | Erwartung bei Fehler |
|---------|-------------------|------------------|----------------------|
| Klick Button | `GET /api/canva/oauth` | 302 → `canva.com/api/oauth/authorize?...` | 302 → `/settings/canva?error=oauth_init_failed` |

**Coolify-Log:**

```
Canva-OAuth-Authorize konnte nicht initialisiert werden
err: ... CANVA_CLIENT_ID / CANVA_CLIENT_SECRET fehlen ...
```

**Ops-Fix:** Env-Vars in Coolify setzen, Redeploy.

---

#### Symptom: Nach Canva-Freigabe „Token-Austausch fehlgeschlagen“

| Schritt | DevTools | Erwartung |
|---------|----------|-----------|
| Callback | `GET /api/canva/oauth/callback?code=...&state=...` | 302 → `/settings/canva?connected=1` |
| Fehler | gleicher Request | 302 → `/settings/canva?error=token_exchange_failed` |

**Coolify-Log:**

```
Canva-Code-Exchange oder Token-Speichern fehlgeschlagen
Canva-Token-Exchange fehlgeschlagen: HTTP 400 ...
```

**Ursachen:** PKCE fehlt (Code), Redirect-URI-Mismatch, falsche Client-Secret.

**Redirect-URI prüfen:** Muss exakt `https://vysible.cloud/api/canva/oauth/callback` in Canva Portal sein.

---

#### Symptom: „Invalid state“ (rohes JSON)

| DevTools | `GET /api/canva/oauth/callback` → **400** JSON `{ "error": "Invalid state" }` |
| Coolify | `[Vysible] Canva-OAuth State-Mismatch (CSRF-Verdacht)` |

**Fix:** Erneut verbinden, Same Browser, Cookies erlauben, nicht >10 Min zwischen Start und Callback.

---

#### Symptom: Verbunden, aber Wizard zeigt „Ordner konnten nicht geladen werden“

| DevTools | `GET /api/canva/folders` |
|----------|--------------------------|
| Fehler | **502**, Body: `{ "connected": true, "folders": [], "error": "..." }` |
| OK (nach Fix) | **200**, `{ "connected": true, "folders": [{ "id": "FA...", "name": "..." }] }` |

**Coolify:**

```
[Vysible] Canva-Ordner konnten nicht geladen werden
Canva Folders HTTP 404
```

---

#### Symptom: Ordner gespeichert, aber 0 Templates in Results

| DevTools | `GET /api/projects/{projectId}/canva` |
|----------|---------------------------------------|
| Aktuell (Bug) | **200** `{ "assets": [] }` |
| Nach Fix | **200** `{ "assets": [{ "id": "DAF...", "name": "...", "type": "design" }] }` |
| Nicht verbunden | **502** `{ "error": "Canva nicht verbunden ..." }` |

**Coolify:**

```
[Vysible] Canva-Asset-Abruf für Projekt fehlgeschlagen
Canva Assets HTTP 403   → Scope folder:read fehlt
```

---

#### Symptom: Generierung ohne Canva-Kontext

| DevTools | `GET /api/generate/stream/{jobId}` (SSE) |
|----------|------------------------------------------|
| OK | Event `canva_loaded` mit `data.assetCount > 0` |
| Fehler (still) | `canva_loaded` mit `data.skipped: true` |

**Coolify:**

```
Canva-API nicht erreichbar — Kontext leer
```

---

### 5.3 GA4 — Symptom → DevTools → Logs

#### Symptom: „GA4 Service Account nicht konfiguriert“

| DevTools | `GET /api/projects/{id}/analytics` → **503** |
| Body | `{ "error": "GA4 Service Account nicht konfiguriert" }` |

**Ops:** `GA4_SERVICE_ACCOUNT_JSON` in Coolify → Redeploy.

---

#### Symptom: „Keine GA4-Property-ID hinterlegt“

| DevTools | `GET /api/projects/{id}/analytics` → **422** |

**Fix:** Projekt → Anbindungen → GA4 Property-ID eintragen (nur Ziffern).

---

#### Symptom: „GA4 runReport fehlgeschlagen: 400“

| DevTools | Request URL enthält `startDate`/`endDate` |
| Response | `{ "error": "GA4 runReport fehlgeschlagen: 400 — ..." }` |

**Häufige Ursache:** Property-ID `properties/123456789` in DB → Doppel-Präfix.

**Prüfen:** `GET /api/projects/{id}/settings/ga4` → Wert der `ga4PropertyId`

**Coolify:**

```
GA4 runReport fehlgeschlagen
propertyId: "properties/123456789"
status: 400
```

---

#### Symptom: „GA4 Token-Anfrage fehlgeschlagen“

| DevTools | **502** |
| Coolify | `GA4 Token-Fehler` status 400, body `invalid_grant` |

**Ops:** JSON `private_key` prüfen, Analytics Data API aktivieren.

---

#### Symptom: „PERMISSION_DENIED“

| Coolify | `GA4 runReport fehlgeschlagen` status 403, body enthält `PERMISSION_DENIED` |

**Ops:** Service-Account-E-Mail in GA4 Property als Betrachter einladen.

---

#### Symptom: Dashboard lädt, alle Werte 0

| DevTools | **200**, `sessions: 0, users: 0, pageviews: 0` |

**Nicht zwingend Bug** — Praxis-Website hat ggf. kein GA4-Tracking oder Zeitraum leer. GA4-Web-UI zum Vergleich öffnen (gleicher Zeitraum).

---

### 5.4 Schnell-Test Matrix (Prod)

| # | Aktion | Erfolgskriterium |
|---|--------|------------------|
| 1 | `/settings/canva` → Verbinden | Status „Verbunden“, Ablaufdatum sichtbar |
| 2 | Neues Projekt Wizard Schritt 3 | Canva-Dropdown zeigt Ordner |
| 3 | Projekt → Anbindungen → Canva-Ordner speichern | „Gespeichert“ |
| 4 | `GET /api/projects/{id}/canva` | `assets.length > 0` |
| 5 | Projekt → Analysen | Sessions/Nutzer/Seitenaufrufe ≠ Fehlerbanner |
| 6 | `/analytics` Tab GA4 | Dashboard für Projekt mit Property-ID |

---

## 6. Funktionsnachweis (für Claude nach Implementierung)

### 6.1 Lokal (Dev)

**Env (.env.local — nicht committen):**

```bash
CANVA_CLIENT_ID=...
CANVA_CLIENT_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GA4_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

**Canva:**

```powershell
$env:FORCE_COLOR=1
pnpm dev
# Browser: http://localhost:3000/settings/canva
# OAuth durchlaufen → folders → project canva → results
```

**GA4:**

```powershell
# Mit curl (nach Login Session-Cookie aus DevTools kopieren — nur lokal!)
curl -s "http://localhost:3000/api/projects/{PROJECT_ID}/analytics?startDate=28daysAgo&endDate=today" -H "Cookie: ..."
```

**Build-Gate:**

```powershell
node node_modules/typescript/bin/tsc --noEmit
pnpm test --run
pnpm build
```

### 6.2 Prod (vysible.cloud)

Nach Merge + Coolify-Deploy:

1. Canva OAuth einmal durchlaufen (Admin-User)
2. Ein Referenzprojekt mit bekanntem Canva-Ordner + GA4 Property-ID
3. Screenshot/Notiz: Network-Responses wie in Abschnitt 5
4. Optional: eine Mini-Generierung starten, SSE `canva_loaded` prüfen

### 6.3 Artefakte für PR-Beschreibung

- [ ] Vorher/Nachher Network-Screenshot `GET /api/canva/folders`
- [ ] Vorher/Nachher `GET /api/projects/.../canva` mit Asset-Count
- [ ] GA4 Dashboard Screenshot mit echten Zahlen (oder 0 mit Erklärung)
- [ ] `pnpm test --run` Output (alle grün)
- [ ] CHANGELOG `[Unreleased]` Einträge

---

## 7. Teststrategie

### 7.1 Ist-Stand Tests im Repo

| Typ | Pfad | Runner |
|-----|------|--------|
| Unit | `__tests__/unit/**/*.test.ts` | Vitest (`pnpm test`) |
| Integration | `__tests__/integration/*.test.ts` | Vitest |
| E2E | `__tests__/e2e/login.spec.ts` | Playwright (manuell, nicht in `pnpm test`) |

**Vitest-Config** (`vitest.config.ts`): E2E ausgeschlossen; Coverage-Threshold 60 % auf ausgewählte Module.

**Aktuell keine Tests** für `lib/canva/*` oder `lib/ga4/*`.

### 7.2 Unit Tests (neu anlegen)

#### `__tests__/unit/canva/pkce.test.ts`

- `generateCodeChallenge` mit RFC 7636 Appendix B Testvektor (wenn Länge passt) oder Snapshot mit festem Verifier
- Verifier-Länge 43–128

#### `__tests__/unit/canva/parse-folder-items.test.ts`

- Fixture: echte Canva-Response JSON aus Doku (Abschnitt 2.6)
- Assert: 3 API-Items → 2 Assets (design + image), folder übersprungen
- Assert: leeres `items` → `[]`
- Assert: fehlende Felder → graceful skip

#### `__tests__/unit/ga4/normalize-property-id.test.ts`

| Input | Output |
|-------|--------|
| `123456789` | `123456789` |
| `properties/123456789` | `123456789` |
| ` properties/123 ` | `123` |
| `abc` | throw |
| `` | throw oder null (je nach API-Design) |

#### `__tests__/unit/ga4/private-key.test.ts`

- Input `-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n` mit literal `\n` in string → echte Newlines

#### `__tests__/unit/canva/auth.test.ts` (mit Mocks)

- `buildAuthorizeUrl` enthält `code_challenge` und `code_challenge_method=s256`
- `exchangeCodeForToken` mock `fetch` — assert body enthält `code_verifier`

**Mocking-Muster:** siehe `__tests__/integration/generate-start.test.ts` (`vi.mock`, `vi.fn()`).

### 7.3 Integration Tests (neu)

#### `__tests__/integration/canva-folders-route.test.ts`

- Mock `auth`, `isCanvaConnected`, `listFolders`
- `GET /api/canva/folders` → 200 mit folders array
- Nicht verbunden → `{ connected: false }`

#### `__tests__/integration/ga4-analytics-route.test.ts`

- Mock `requireAuth`, `prisma.project.findUnique`, `fetchGA4Metrics`
- Property-ID gesetzt → 200
- Keine Property → 422
- Kein Service Account env → 503 (unset env in test)

### 7.4 E2E Tests (Playwright — optional P2)

**Datei:** `__tests__/e2e/canva-settings.spec.ts`

- Login (bestehendes Pattern aus `login.spec.ts`)
- Navigate `/settings/canva`
- Assert: Button „Canva verbinden“ oder Status „Verbunden“
- **OAuth nicht automatisieren** (externe Canva-UI) — nur UI smoke

**Datei:** `__tests__/e2e/analytics-ga4.spec.ts`

- Login → `/analytics`
- Wenn kein Projekt mit GA4: Empty-State Text
- Wenn Projekt mit GA4: keine rote Fehlerbox (oder skip mit `test.skip`)

**CI-Hinweis:** E2E braucht Credentials — nur mit GitHub Secrets oder manuell.

### 7.5 Property-Based / Hypothesis (optional, P3)

Falls `fast-check` oder `hypothesis` (Python) nicht im Repo: **Vitest + fast-check** als devDependency erwägen.

**Properties:**

- `normalizeGa4PropertyId` ist idempotent: `f(normalize(x)) === normalize(x)` für valide x
- `parseCanvaItems` verliert nie Items mit gültigem design.id (Roundtrip-Länge ≤ input)

Alternativ ohne neue Dep: Tabellen-Tests mit 20+ generierten Edge Cases.

### 7.6 Automatisierte Smoke Tests

**Vorschlag:** `scripts/smoke-integrations.ts` (nur Server-Side, in CI mit Secrets)

```typescript
// Pseudocode — nicht committen mit echten Keys
async function smokeGA4() {
  if (!process.env.GA4_SERVICE_ACCOUNT_JSON) { console.log('[SKIP] GA4'); return }
  const { fetchAccessToken } = await import('../lib/ga4/client-internal')
  await fetchAccessToken()
  console.log('[OK] GA4 token')
}

async function smokeCanva() {
  // Nur wenn SMOKE_CANVA_USER_ID + DB-Token — optional
}
```

**CI-Job** (GitHub Actions): nightly oder post-deploy webhook — ruft `GET https://vysible.cloud/api/healthz` + optional authentifizierten GA4-Check.

**Bestehend:** `GET /api/healthz` — für Integrations-Smoke erweitern oder separaten Admin-Endpoint nur mit `requireAdmin`.

### 7.7 Coverage-Erweiterung

`vitest.config.ts` coverage `include` erweitern um:

- `lib/canva/**/*.ts`
- `lib/ga4/**/*.ts`
- `app/api/canva/**/*.ts`
- `app/api/projects/[id]/analytics/route.ts`

---

## 8. Referenzen

| Ressource | URL |
|-----------|-----|
| Canva Authentication (PKCE) | https://www.canva.dev/docs/connect/authentication/ |
| Canva List Folder Items | https://www.canva.dev/docs/connect/api-reference/folders/list-folder-items/ |
| Canva Scopes | https://www.canva.dev/docs/connect/appendix/scopes/ |
| GA4 Data API runReport | https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport |
| Intern: Slice 17 Plan | `docs/dev-prompts/plan-v6.1.md` |
| Intern: Concept vs Impl | `docs/dev-prompts/concept-vs-implementation.md` |
| Intern: Sprint P2-E Canva | `docs/dev-prompts/archive/sprint-p2e-canva.md` |
| Intern: Env-Beispiel | `.env.example` Zeilen 27–34 (Canva), 89–94 (GA4) |

---

## 9. Anhang — Vollständige Code-Referenzen (Ist-Zustand)

### 9.1 Canva OAuth Callback

`app/api/canva/oauth/callback/route.ts` — relevante Fehlerpfade:

```typescript
if (oauthError) {
  return NextResponse.redirect(new URL(`/settings/canva?error=${encodeURIComponent(oauthError)}`, req.url))
}
if (!code || !stateFromQuery) {
  return NextResponse.redirect(new URL('/settings/canva?error=missing_code_or_state', req.url))
}
if (!stateFromCookie || stateFromCookie !== stateFromQuery) {
  return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
}
try {
  const token = await exchangeCodeForToken(code)
  await persistCanvaToken(session.user.id, token)
  return NextResponse.redirect(new URL('/settings/canva?connected=1', req.url))
} catch (err: unknown) {
  return NextResponse.redirect(new URL('/settings/canva?error=token_exchange_failed', req.url))
}
```

**Hinweis:** Nach PKCE-Fix muss `exchangeCodeForToken(code, verifier)` hier aufgerufen werden.

### 9.2 Canva Folders API Route

`app/api/canva/folders/route.ts`:

```typescript
try {
  const folders = await listFolders(session.user.id)
  return NextResponse.json({ connected: true, folders })
} catch (err: unknown) {
  return NextResponse.json(
    { connected: true, folders: [], error: 'Canva-Ordner konnten nicht geladen werden' },
    { status: 502 },
  )
}
```

### 9.3 GA4 Analytics Route

`app/api/projects/[id]/analytics/route.ts`:

```typescript
if (!process.env.GA4_SERVICE_ACCOUNT_JSON) {
  return NextResponse.json({ error: 'GA4 Service Account nicht konfiguriert' }, { status: 503 })
}
if (!project.ga4PropertyId) {
  return NextResponse.json({ error: 'Keine GA4-Property-ID hinterlegt' }, { status: 422 })
}
const metrics = await fetchGA4Metrics(project.ga4PropertyId, startDate, endDate)
```

### 9.4 GA4 JWT / Token

`lib/ga4/client.ts` — Scope und Audience:

```typescript
scope: 'https://www.googleapis.com/auth/analytics.readonly',
aud: 'https://oauth2.googleapis.com/token',
```

### 9.5 Pipeline Canva-Schritt (vollständig)

```typescript
case 'canva_loaded': {
  if (project.canvaFolderId) {
    try {
      const assets = await listFolderAssets(project.canvaFolderId, project.createdById)
      ctx.canvaContext = buildCanvaContext(assets)
      await emitEvent(jobId, {
        type: 'canva_loaded',
        data: { assetCount: assets.length },
        timestamp: now(),
      })
    } catch (err: unknown) {
      logger.warn({ err, projectId: project.id }, 'Canva-API nicht erreichbar — Kontext leer')
      ctx.canvaContext = ''
      await emitEvent(jobId, {
        type: 'canva_loaded',
        data: { skipped: true, reason: 'Canva-API nicht erreichbar' },
        timestamp: now(),
      })
    }
  } else {
    ctx.canvaContext = ''
    await emitEvent(jobId, { type: 'canva_loaded', data: { skipped: true }, timestamp: now() })
  }
  break
}
```

---

## 10. Changelog-Vorlage (für Implementierungs-PR)

```markdown
## [Unreleased]

### Fixed
- Canva: OAuth mit PKCE; Ordner-Abruf über Connect API `folders/root/items`; Asset-Parser für verschachtelte API-Responses.
- GA4: Property-ID-Normalisierung (`properties/123` → `123`); robustere Service-Account-JSON-Verarbeitung.

### Changed
- Canva OAuth-Scopes auf `folder:read` erweitert — bestehende Verbindungen einmal neu autorisieren.
```

---

*Ende des Handoff-Dokuments.*
