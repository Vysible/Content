# Sprint P3-D — WordPress REST API Connector (Slice 22)

**Projekt:** Vysible  
**Sprint:** P3-D  
**Format:** Tier 1 (Anforderungen klar definiert, Exploration trotzdem zuerst)  
**Abhängigkeit:** Sprint P3-C ✅  
**Anforderungen:** plan.md Slice 22, ADR-003 (AES-256 für Credentials)  
**Geschätzte Dauer:** ~1 Tag

> **Scope:** Blog-Artikel als WordPress-Draft veröffentlichen. Kein manuelles Copy-Paste.  
> Auth ausschliesslich via WordPress Application Passwords (WP 5.6+) — kein OAuth.  
> Kein automatisches Veröffentlichen — nur Draft.

> **Vorab-Validierung empfohlen:**  
> Eine WordPress-Testinstanz mit aktiviertem Application Password nutzen,  
> um die WP REST API (`/wp-json/wp/v2/posts`) vor Sprint-Start manuell zu testen.  
> Curl-Test: `curl -u "username:app_password" https://[wp-url]/wp-json/wp/v2/posts`

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap: Vorgänger P3-C abgeschlossen?
Select-String "P3-C.*✅|Sprint P3-C.*✅" docs/roadmap.md -i

# Check D — CHANGELOG
Select-String "\[Unreleased\]" CHANGELOG.md

# Check E — Tests
pnpm test --run
```

Bei **Hard-FAIL (A, B oder E):** SOFORT STOP. Kein weiterer Befehl. Kein weiterer Check. Keine Parallelisierung.  
Ausgabe: `HARD-FAIL: Check [X] — [Grund]` + erforderliche Aktion für den User. Dann **await User-Freigabe**.  
Bei **5/5 PASS:** Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# WordPress-Stub Stand
Get-ChildItem lib/wordpress -Recurse -Name -ErrorAction SilentlyContinue
Get-Content lib/wordpress/client.ts -ErrorAction SilentlyContinue
Get-Content lib/wordpress/formatter.ts -ErrorAction SilentlyContinue

# Bestehende WordPress-API-Routen (draft/route.ts war in OpenActions.md erwähnt)
Get-ChildItem app/api/wordpress -Recurse -Name -ErrorAction SilentlyContinue
Get-Content app/api/wordpress/draft/route.ts -ErrorAction SilentlyContinue

# WordPress-Settings-Seite vorhanden?
Get-ChildItem app/(dashboard)/settings/wordpress -Recurse -Name -ErrorAction SilentlyContinue

# WordPressDraftButton vorhanden?
Get-ChildItem components/results -Recurse -Name | Select-String "wordpress\|wp" -i

# Wie werden Credentials im API-Key-Manager gespeichert? (Provider-Struktur)
Select-String "provider.*wordpress\|wordpress.*provider" lib,prisma -Recurse -i -ErrorAction SilentlyContinue |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# Pro-Projekt-WP-URL — wo würde sie gespeichert? (Project-Modell prüfen)
Select-String "wpUrl\|wp_url\|wordpressUrl\|wordpress" prisma/schema.prisma -i

# Wie sieht der bestehende HTML-Export (Slice 9) für Blog aus?
Select-String "function.*html\|blogHtml\|toHtml" lib/export -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# Wo werden Blog-Artefakte mit Status gespeichert?
Select-String "wpDraftStatus\|in_wordpress\|wp.*status" prisma/schema.prisma,lib -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# sendNotification-Trigger-Liste (welche Trigger sind schon definiert?)
Select-String "EmailTrigger\|TRIGGER_SUBJECTS\|'generation_complete'\|'draft_created'" lib/email -Recurse |
  Select-Object Path, LineNumber, Line | Select-Object -First 15
```

**Bekannte Lücken (Stand Mai 2026, aus Roadmap + plan.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/wordpress/client.ts` | Stub oder fehlend — kein echter WP API-Call | MUSS |
| `lib/wordpress/formatter.ts` | Fehlend — Gutenberg-HTML-Konverter | MUSS |
| `app/api/wordpress/draft/route.ts` | Stub (OpenActions.md: sendNotification-Catch repariert in P2-C) — fachliche Logik fehlt | MUSS |
| `app/(dashboard)/settings/wordpress/page.tsx` | Fehlend | MUSS |
| `components/results/WordPressDraftButton.tsx` | Fehlend | MUSS |
| Project-Modell | `wpUrl`-Feld pro Projekt fehlt ggf. | PRÜFEN |
| `wpDraftStatus`-Tracking | Artefakt-Status für WP fehlt ggf. | PRÜFEN |

---

## CRITICAL: Self-review Checklist

- [ ] WP Application Password (`username:app_password`) AES-256 verschlüsselt —
  Format `user:password` als zusammengesetzter String, nie getrennt gespeichert
- [ ] `encryptedKey` nie in API-Response oder Log
- [ ] `withRetry` auf WP REST API-Call
- [ ] Kein automatisches Veröffentlichen — `status: 'draft'` fest gesetzt, nie überschreibbar
- [ ] Gutenberg-Blockstruktur: HWG-Disclaimer als eigener Block
- [ ] Fallback wenn WP nicht konfiguriert: "HTML kopieren"-Button aktiv
- [ ] `wpDraftStatus`-Update nach erfolgreichem Draft-Upload
- [ ] `sendNotification('draft_created', ...)` nach WP-Upload — non-fatal catch mit logger.warn
- [ ] Alle Catches loggen — kein stiller Catch
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — WP Client + Formatter + Settings + API-Route

**Aufwand:** ~5–6 Stunden  
**Scope:** WP-Credentials speichern, Gutenberg-HTML-Formatter, Draft-Upload-Route, Settings-UI.

### IN

```
lib/wordpress/client.ts                         MOD — echter WP REST API-Call mit Retry
lib/wordpress/formatter.ts                      NEU — Gutenberg-kompatibler HTML-Konverter
app/api/wordpress/draft/route.ts                MOD — fachliche Logik implementieren
app/(dashboard)/settings/wordpress/page.tsx     NEU — WP-Settings (URL + Application Password)
prisma/schema.prisma                            MOD — wpUrl auf Project-Modell (falls fehlt)
```

### OUT

```
lib/crypto/aes.ts                               NICHT anfassen
lib/export/html.ts                              NICHT anfassen (formatter nutzt eigene Logik)
components/                                     NICHT anfassen (Sub-Slice B)
```

### A1 — Prisma: wpUrl auf Project (falls fehlt)

```prisma
// Auf dem Project-Modell ergänzen:
wpUrl              String?    // z.B. "https://zahnarzt-mustermann.de"
wpDraftPostId      String?    // WP Post-ID nach Draft-Upload (für klickbaren Link)
```

Migration: `pnpm prisma migrate dev --name add_wp_fields_to_project`

### A2 — lib/wordpress/client.ts

```typescript
// lib/wordpress/client.ts
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';

export interface WpDraftResult {
  id: number;
  link: string;       // WP-Bearbeitungs-URL: https://[site]/wp-admin/post.php?post=[id]&action=edit
  status: string;     // sollte 'draft' sein
}

export async function createWpDraft(
  wpUrl: string,
  credentials: string,  // Format: "username:app_password" (AES-256-entschlüsselt)
  title: string,
  content: string,      // Gutenberg-kompatibles HTML aus formatter.ts
  excerpt?: string,
): Promise<WpDraftResult> {
  const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
  const apiUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;

  return withRetry(async () => {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        status: 'draft',    // FEST — nie 'publish'
        excerpt: excerpt ?? '',
        comment_status: 'closed',
      }),
    });

    if (response.status === 401) {
      throw new Error('WordPress Application Password ungültig oder abgelaufen');
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`WP REST API HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json() as WpDraftResult;
    logger.info({ wpPostId: data.id, wpUrl }, '[Vysible] WordPress Draft erstellt');
    return data;
  }, 'wordpress.create_draft');
}

export async function testWpConnection(
  wpUrl: string,
  credentials: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
    const response = await fetch(
      `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`,
      { headers: { Authorization: authHeader } },
    );
    return response.ok
      ? { ok: true }
      : { ok: false, error: `HTTP ${response.status}` };
  } catch (exc: unknown) {
    return { ok: false, error: exc instanceof Error ? exc.message : String(exc) };
  }
}
```

### A3 — lib/wordpress/formatter.ts

```typescript
// lib/wordpress/formatter.ts
// Konvertiert Markdown-Blog-Text → Gutenberg-kompatibles HTML-Block-Format.
// WP speichert Inhalte als "Block Grammar" — <!-- wp:TYPE --> Kommentare.

export function blogToGutenbergHtml(blogMarkdown: string, hwgDisclaimer: string): string {
  const blocks: string[] = [];

  // Markdown-Zeilen in Gutenberg-Blöcke konvertieren
  const lines = blogMarkdown.split('\n');
  let buffer = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      // H1 → wird als Post-Title verwendet, NICHT im Content-Body
      continue;
    } else if (trimmed.startsWith('## ')) {
      if (buffer) { blocks.push(paragraphBlock(buffer.trim())); buffer = ''; }
      blocks.push(headingBlock(trimmed.slice(3), 2));
    } else if (trimmed.startsWith('### ')) {
      if (buffer) { blocks.push(paragraphBlock(buffer.trim())); buffer = ''; }
      blocks.push(headingBlock(trimmed.slice(4), 3));
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (buffer) { blocks.push(paragraphBlock(buffer.trim())); buffer = ''; }
      blocks.push(listItemBlock(trimmed.slice(2)));
    } else if (trimmed === '') {
      if (buffer.trim()) { blocks.push(paragraphBlock(buffer.trim())); buffer = ''; }
    } else {
      buffer += (buffer ? ' ' : '') + trimmed;
    }
  }
  if (buffer.trim()) blocks.push(paragraphBlock(buffer.trim()));

  // HWG-Disclaimer als eigener Block am Ende
  if (hwgDisclaimer) {
    blocks.push(disclaimerBlock(hwgDisclaimer));
  }

  return blocks.join('\n\n');
}

function paragraphBlock(text: string): string {
  return `<!-- wp:paragraph -->\n<p>${escapeHtml(text)}</p>\n<!-- /wp:paragraph -->`;
}

function headingBlock(text: string, level: 2 | 3): string {
  return `<!-- wp:heading {"level":${level}} -->\n<h${level}>${escapeHtml(text)}</h${level}>\n<!-- /wp:heading -->`;
}

function listItemBlock(text: string): string {
  return `<!-- wp:list -->\n<ul><li>${escapeHtml(text)}</li></ul>\n<!-- /wp:list -->`;
}

function disclaimerBlock(text: string): string {
  return `<!-- wp:paragraph {"className":"disclaimer"} -->\n<p class="disclaimer">${escapeHtml(text)}</p>\n<!-- /wp:paragraph -->`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// H1-Extraktion für WP Post-Title
export function extractH1Title(blogMarkdown: string): string {
  const match = /^# (.+)$/m.exec(blogMarkdown);
  return match?.[1]?.trim() ?? '';
}
```

### A4 — app/api/wordpress/draft/route.ts

```typescript
// app/api/wordpress/draft/route.ts
// POST: { projectId, artifactId, blogContent, blogMarkdown, hwgDisclaimer? }
// 1. Auth-Check (Agentur-Nutzer)
// 2. WP-Credentials aus ApiKey (Provider: 'wordpress') laden + decrypt
// 3. wpUrl aus Projekt-Einstellungen laden
// 4. blogToGutenbergHtml(blogMarkdown, hwgDisclaimer) + extractH1Title
// 5. createWpDraft(wpUrl, credentials, title, gutenbergHtml)
// 6. wpDraftStatus auf Artefakt setzen: 'in_wordpress'
// 7. wpDraftPostId auf Project speichern (für klickbaren Link)
// 8. sendNotification('draft_created', projectName).catch((err) => { logger.warn(...) })
// 9. AuditLog-Eintrag
// Response: { wpPostId, editUrl: "https://[site]/wp-admin/post.php?post=[id]&action=edit" }
```

### A5 — Settings-Seite

`/settings/wordpress` — Client-Komponente für Agentur-Nutzer.

**Felder:**
| Feld | Typ | Hinweis |
|---|---|---|
| WordPress-URL | `text` | z.B. `https://zahnarzt-mustermann.de` |
| Benutzername | `text` | WordPress-Benutzername |
| Application Password | `password` | Generiert in WP: Profil → Application Passwords |
| Test-Verbindung | Button | `testWpConnection` — zeigt "[OK] Verbunden als [user]" oder "[FAIL] Fehler" |

**Sicherheit:** Application Password `encryptedKey` als `user:password`-String —
nie als Klartext in GET-Response zurückgeben (`hasCredentials: boolean` stattdessen).

### Acceptance Checklist

- [ ] WP Application Password speichern → AES-256-verschlüsselt in DB
- [ ] Test-Verbindung → "[OK] Verbunden" oder "[FAIL] <Fehlermeldung>"
- [ ] `createWpDraft` gibt `WpDraftResult` mit `id` und `link` zurück
- [ ] Gutenberg-Blockstruktur: H2/H3/Paragraphen korrekt
- [ ] HWG-Disclaimer als `<!-- wp:paragraph {"className":"disclaimer"} -->`-Block
- [ ] `status: 'draft'` immer gesetzt — kein `publish`-Pfad möglich
- [ ] `encryptedKey` nie in API-Response
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(wordpress): WP Client + Gutenberg-Formatter + Draft-Route + Settings-Seite (Slice 22 Sub-A)
```

---

## Sub-Slice B — WordPressDraftButton + Status-Tracking + HTML-Fallback

**Aufwand:** ~3–4 Stunden  
**Scope:** Button in Ergebnisansicht, Status-Aktualisierung, Fallback-HTML-Copy.

### IN

```
components/results/WordPressDraftButton.tsx     NEU — Client-Komponente
```

### OUT

```
lib/wordpress/client.ts                         NICHT anfassen (Sub-Slice A)
lib/wordpress/formatter.ts                      NICHT anfassen (Sub-Slice A)
app/api/wordpress/draft/route.ts                NICHT anfassen (Sub-Slice A)
```

### B1 — WordPressDraftButton

```typescript
// components/results/WordPressDraftButton.tsx
'use client';
// Props: { projectId, artifactId, blogContent, blogMarkdown, hwgDisclaimer?,
//          wpConfigured: boolean, initialStatus: 'ausstehend' | 'in_wordpress' | 'veroeffentlicht' }
//
// Zustand "ausstehend" + WP konfiguriert:
//   → "Als WordPress-Draft anlegen"-Button (primär)
//   → Klick: POST /api/wordpress/draft
//   → Ladezustand: "[INFO] Draft wird erstellt..."
//   → Erfolg: Status wechselt zu "In WordPress" + klickbarer Link "[WP-Icon] In WordPress bearbeiten"
//   → Fehler: "[FAIL] <Fehlermeldung>" (kein Stack-Trace, max. 120 Zeichen)
//
// Zustand "in_wordpress":
//   → "[OK] In WordPress (Draft)" + klickbarer Link zur WP-Bearbeitungsseite
//   → Grauer "Erneut hochladen"-Button (überschreibt bestehenden Draft)
//
// WP nicht konfiguriert (wpConfigured = false):
//   → "HTML kopieren"-Button → navigator.clipboard.writeText(blogContent)
//   → Tooltip: "In WordPress → Neuer Beitrag → HTML-Modus einfügen"
//   → Nach Copy: "[OK] HTML kopiert" für 3s
//
// HWG-Pflicht: Wenn hwgFlag = 'rot' → Draft-Button deaktiviert, Tooltip:
//   "HWG-Compliance-Gate: Rote Markierung muss zuerst behoben werden"
```

> **HWG-Gate-Integration:** Das HWG-Compliance-Gate wurde in Sprint 1 (Slice 28) implementiert.
> `hwgFlag` aus dem Artefakt übergeben — bei `'rot'` ist der WP-Draft-Button inaktiv.

### B2 — Einbinden in Ergebnisansicht

```typescript
// In der Blog-Tab-Ansicht (Ergebnisansicht Slice 5):
// <WordPressDraftButton
//   projectId={project.id}
//   artifactId={article.id}
//   blogContent={article.htmlContent}     // aus Slice 9 HTML-Export
//   blogMarkdown={article.content}
//   hwgDisclaimer={project.hwgDisclaimer}
//   wpConfigured={!!project.wpUrl}
//   initialStatus={article.wpDraftStatus ?? 'ausstehend'}
// />
```

> **Hinweis:** `article.htmlContent` kommt aus dem bestehenden HTML-Export (Slice 9).
> Falls der Formatter in Sub-Slice A von `blogMarkdown` ausgeht, konsistent machen.

### Acceptance Checklist

- [ ] Blog-Artikel-Ansicht zeigt "Als WordPress-Draft anlegen"-Button (wenn WP konfiguriert)
- [ ] Klick → Draft in WordPress unter Entwürfe → Titel = SEO-Titel aus Tool
- [ ] Status wechselt zu "In WordPress" + klickbarer WP-Bearbeitungs-Link
- [ ] WP-Link öffnet tatsächlich die richtige WP-Bearbeitungsseite
- [ ] WP nicht konfiguriert → "HTML kopieren"-Button aktiv (Clipboard-Copy funktioniert)
- [ ] hwgFlag = 'rot' → Draft-Button deaktiviert + Tooltip sichtbar
- [ ] Kein automatisches Veröffentlichen (manuell in WordPress prüfen: status = draft)
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(wordpress): WordPressDraftButton + Status-Tracking + HTML-Fallback (Slice 22 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Kein 'publish' als WP-Status möglich
Select-String "status.*publish\|publish.*status" lib/wordpress,app/api/wordpress -Recurse
# → Zero Treffer (nur 'draft' erlaubt)

# Application Password nie als Klartext in Response
Select-String "encryptedKey\|app_password" app/api/wordpress -Recurse |
  Where-Object { $_.Line -notmatch "decrypt\|select.*false\|hasCredentials" }
# → Zero Leak-Treffer

# withRetry auf WP API-Call
Select-String "withRetry" lib/wordpress/client.ts
# → Treffer in createWpDraft

# HWG-Gate in Komponente berücksichtigt
Select-String "hwgFlag\|hwg.*rot\|disabled.*hwg" components/results/WordPressDraftButton.tsx -i
# → Treffer

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Automatisches Veröffentlichen | Stop-Condition plan.md — nur Draft |
| Bild-Upload zu WP Media Library | Komplexität hoch; Canva-Asset-Placeholder reicht |
| Jimdo / Wix Connector | plan.md: nur HTML-Export für Nicht-WP-Systeme |
| WP-Kategorien / Tags setzen | Nice-to-have, nicht im plan.md-Scope |
| WP-Post-Update (Überschreiben) | Erneutes Hochladen nur via manuellen Button in Sub-B |

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
SPRINT P3-D ABSCHLUSSBERICHT
==============================

Sprint: P3-D — WordPress REST API Connector (Slice 22)

SUB-SLICES:
  A Client + Formatter + Route + Settings:  [ ] DONE — Commit: <hash>
  B DraftButton + Status + Fallback:        [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>
  WP-Version getestet mit: <WP-Version dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  Kein 'publish'-Pfad:             [ ]
  HWG-Gate berücksichtigt:         [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P3-D ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P3-E (KlickTipp Newsletter Connector — Slice 23)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p3d-wordpress.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
