# Sprint P3-E — KlickTipp Newsletter Connector (Slice 23)

**Projekt:** Vysible  
**Sprint:** P3-E  
**Format:** Tier 2 (Stub vorhanden, Exploration zuerst)  
**Abhängigkeit:** Sprint P3-D ✅, Slice 9 HTML-Export ✅ (Newsletter-HTML bereits generiert)  
**Anforderungen:** plan.md Slice 23, ADR-003 (AES-256), NFA-06 (Retry)  
**Geschätzte Dauer:** ~1 Tag

> **Vorab-Validierung empfohlen:**  
> KlickTipp REST API manuell testen: `https://api.klicktipp.com`  
> Auth: `POST /account/login` mit `username` + `password` → Session-Token  
> Oder: Direkte API-Key-Auth (je nach KT-Tier prüfen).  
> Kritisch: KT-Kampagnen-Erstellung **schlägt ohne** `{{unsubscribe_link}}` im HTML fehl.  
> Diesen Merge-Tag vor Sprint-Start in einem Test-HTML verifizieren.

> **Forge-Hinweis:** `lib/klicktipp/client.ts` hat laut `docs/forge-web-deviations.md`  
> einen dokumentierten stillen Catch (Zeile 34, Status: Accepted, Sprint 0a).  
> Dieser Sprint schließt diese Lücke als Teil der Client-Implementierung.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap: Vorgänger P3-D abgeschlossen?
Select-String "P3-D.*✅|Sprint P3-D.*✅" docs/roadmap.md -i

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
# KlickTipp-Stub Stand (Catch-Lücke aus deviations.md)
Get-Content lib/klicktipp/client.ts

# Bestehende KT-API-Routen
Get-ChildItem app/api/klicktipp -Recurse -Name -ErrorAction SilentlyContinue
Get-Content app/api/klicktipp/campaign/route.ts -ErrorAction SilentlyContinue

# KlickTippButton vorhanden?
Get-ChildItem components/results -Recurse -Name | Select-String "klick|kt" -i

# Settings-Seite
Get-ChildItem app/(dashboard)/settings/klicktipp -Recurse -Name -ErrorAction SilentlyContinue

# Wie sieht der Newsletter-HTML-Export aus? (Slice 9)
Get-Content lib/export/html.ts | Select-String "newsletter\|inline\|tablenlayout" -i -A 5

# Was gibt der Newsletter-HTML-Export zurück? (unsubscribe_link vorhanden?)
Select-String "unsubscribe_link\|unsubscribe" lib/export -Recurse -i

# Wie wird die Empfänger-Listen-ID pro Projekt gespeichert?
Select-String "ktListId\|kt_list\|klicktipp.*list\|listId" prisma/schema.prisma -i

# Versanddatum/Redaktionsplan-Feld am Artefakt?
Select-String "scheduledAt\|publishDate\|sendDate\|redaktionsplan" prisma/schema.prisma -i |
  Select-Object Line | Select-Object -First 5

# Provider 'klicktipp' im API-Key-Manager?
Select-String "klicktipp\|klick_tipp" prisma/schema.prisma,lib -Recurse -i |
  Where-Object { $_.Line -match "provider" } | Select-Object Path, LineNumber, Line | Select-Object -First 5
```

**Bekannte Lücken (Stand Mai 2026, aus Roadmap + plan.md + deviations.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/klicktipp/client.ts` | Stub mit stillem Catch L34 — echter API-Call fehlt | MUSS |
| `lib/klicktipp/newsletter-formatter.ts` | Fehlend | MUSS |
| `app/api/klicktipp/campaign/route.ts` | Stub — fachliche Logik fehlt | MUSS |
| `app/(dashboard)/settings/klicktipp/page.tsx` | Fehlend | MUSS |
| `components/results/KlickTippButton.tsx` | Fehlend | MUSS |
| Project-Modell | `ktListId`-Feld pro Projekt fehlt ggf. | PRÜFEN |

---

## CRITICAL: Self-review Checklist

- [ ] KT-Username + Password AES-256 verschlüsselt — als zusammengesetzter String `user:password`
- [ ] `encryptedKey` nie in Response oder Log
- [ ] `{{unsubscribe_link}}` in **jedem** KT-HTML-Body — ohne diesen Merge-Tag lehnt KT ab
- [ ] Praxisname + Adresse im E-Mail-Footer (DSGVO-Pflicht)
- [ ] `withRetry` auf KT API-Calls
- [ ] Kein Versenden aus dem Tool — nur Kampagne anlegen (`status: 'draft'` / kein scheduled)
- [ ] Kein Zugriff auf KT-Kontakte oder andere Kampagnen als die soeben erstellte
- [ ] Stiller Catch in `lib/klicktipp/client.ts` L34 → `logger.warn` (schließt deviations.md-Eintrag)
- [ ] Alle weiteren Catches loggen — kein stiller Catch
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — KT-Client + Newsletter-Formatter + Settings + API-Route

**Aufwand:** ~5–6 Stunden  
**Scope:** KT-Verbindung herstellen, HTML-Formatter, Kampagne anlegen, Settings-UI.

### IN

```
lib/klicktipp/client.ts                         MOD — echter API-Call, stillen Catch schließen
lib/klicktipp/newsletter-formatter.ts           NEU — KT-kompatibles E-Mail-HTML
app/api/klicktipp/campaign/route.ts             MOD — fachliche Logik implementieren
app/(dashboard)/settings/klicktipp/page.tsx     NEU — KT-Settings (URL + Credentials)
prisma/schema.prisma                            MOD — ktListId auf Project-Modell (falls fehlt)
```

### OUT

```
lib/crypto/aes.ts                               NICHT anfassen
lib/export/html.ts                              NICHT anfassen (Formatter nutzt Slice-9-Output)
components/                                     NICHT anfassen (Sub-Slice B)
```

### A1 — Prisma: ktListId auf Project (falls fehlt)

```prisma
// Auf dem Project-Modell ergänzen (Exploration prüft ob bereits vorhanden):
ktListId           String?    // KlickTipp Empfänger-Listen-ID
ktCampaignId       String?    // KT-Kampagnen-ID nach Erstellung (für klickbaren Link)
```

Migration: `pnpm prisma migrate dev --name add_kt_fields_to_project`

### A2 — lib/klicktipp/client.ts

```typescript
// lib/klicktipp/client.ts
// Schließt forge-web-deviations.md Eintrag: "lib/klicktipp/client.ts:34 — stiller Catch"
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';

const KT_BASE = 'https://api.klicktipp.com';

export interface KtCampaignInput {
  name: string;          // Interner Kampagnenname im Tool
  subjectA: string;      // A/B-Test: Betreff A
  subjectB?: string;     // A/B-Test: Betreff B (optional)
  preheader?: string;    // E-Mail-Preheader (max. 100 Zeichen)
  htmlBody: string;      // KT-kompatibles HTML (MUSS {{unsubscribe_link}} enthalten)
  listId: string;        // Empfänger-Listen-ID
  scheduledAt?: string;  // ISO-8601-Datum für geplanten Versand
}

export interface KtCampaignResult {
  campaignId: string;
  editUrl: string;       // Link zur KT-Kampagnenbearbeitung
}

export async function createKtCampaign(
  credentials: string,   // Format: "username:password" (AES-256-entschlüsselt)
  input: KtCampaignInput,
): Promise<KtCampaignResult> {
  // Sicherheitscheck: {{unsubscribe_link}} muss im HTML vorhanden sein
  if (!input.htmlBody.includes('{{unsubscribe_link}}')) {
    throw new Error('KT-HTML muss {{unsubscribe_link}} enthalten — KT API lehnt sonst ab');
  }

  return withRetry(async () => {
    // KT Auth: POST /account/login → session cookie ODER Basic Auth
    // Nach Vorab-Validierung entscheiden welches Schema KT für diesen Account nutzt
    const [username, password] = credentials.split(':');
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const response = await fetch(`${KT_BASE}/campaigns`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: input.name,
        subject: input.subjectA,
        ...(input.subjectB ? { subject_b: input.subjectB } : {}),
        ...(input.preheader ? { preheader: input.preheader } : {}),
        message_html: input.htmlBody,
        list_id: input.listId,
        ...(input.scheduledAt ? { scheduled_at: input.scheduledAt } : {}),
        status: 'draft',
      }),
    });

    if (response.status === 401) {
      throw new Error('KlickTipp-Credentials ungültig');
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`KT API HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json() as { id?: string; campaign_id?: string };
    const campaignId = String(data.id ?? data.campaign_id ?? '');
    logger.info({ campaignId }, '[Vysible] KlickTipp-Kampagne erstellt');

    return {
      campaignId,
      editUrl: `https://app.klicktipp.com/campaigns/${campaignId}/edit`,
    };
  }, 'klicktipp.create_campaign');
}

export async function testKtConnection(
  credentials: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const [username, password] = credentials.split(':');
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    const response = await fetch(`${KT_BASE}/account`, {
      headers: { Authorization: authHeader },
    });
    return response.ok ? { ok: true } : { ok: false, error: `HTTP ${response.status}` };
  } catch (exc: unknown) {
    return { ok: false, error: exc instanceof Error ? exc.message : String(exc) };
  }
}
```

> **Hinweis:** KlickTipp-API-Endpunkte und Auth-Schema nach Vorab-Validierung anpassen.
> Der KT-Feldname für den Betreff (`subject` vs. `subject_a`) per Test-Request verifizieren.

### A3 — lib/klicktipp/newsletter-formatter.ts

```typescript
// lib/klicktipp/newsletter-formatter.ts
// Wandelt Newsletter-Text (Markdown oder bestehenden HTML-Export aus Slice 9)
// in KT-kompatibles E-Mail-HTML um.
// PFLICHT: Inline CSS, Tabellenlayout, {{unsubscribe_link}}, DSGVO-Footer

export interface NewsletterFormatInput {
  subject: string;
  preheader: string;
  bodyText: string;      // Markdown-Text des Newsletters
  ctaText: string;       // CTA-Button-Text
  ctaUrl: string;        // CTA-URL (Platzhalter falls noch nicht bekannt: "#")
  praxisName: string;
  praxisAddress: string; // Für DSGVO-Footer
}

export function formatForKlickTipp(input: NewsletterFormatInput): string {
  const body = markdownToEmailHtml(input.bodyText);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:sans-serif;">
  <!-- Preheader (versteckter Text) -->
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preheader)}</span>

  <!-- Haupt-Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f4f0;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:8px;max-width:600px;">

          <!-- Inhalt -->
          <tr>
            <td style="padding:32px 40px;color:#1a1a2e;font-size:16px;line-height:1.6;">
              ${body}
            </td>
          </tr>

          <!-- CTA-Button -->
          <tr>
            <td align="center" style="padding:0 40px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#2563eb;border-radius:6px;">
                    <a href="${input.ctaUrl}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;
                              font-weight:bold;text-decoration:none;font-size:16px;">
                      ${escapeHtml(input.ctaText)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DSGVO-Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e5e7eb;
                       font-size:12px;color:#6b7280;text-align:center;">
              <p style="margin:0 0 8px;">${escapeHtml(input.praxisName)}<br>
              ${escapeHtml(input.praxisAddress)}</p>
              <p style="margin:0;">
                <a href="{{unsubscribe_link}}" style="color:#6b7280;">
                  Newsletter abbestellen
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function markdownToEmailHtml(text: string): string {
  // Einfache Markdown → Inline-HTML Konvertierung für E-Mail-Kompatibilität
  return text
    .replace(/^## (.+)$/gm, '<h2 style="font-size:20px;margin:24px 0 8px;color:#1a1a2e;">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:17px;margin:20px 0 6px;color:#374151;">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px;">')
    .replace(/^/, '<p style="margin:0 0 16px;">')
    .replace(/$/, '</p>');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

### A4 — app/api/klicktipp/campaign/route.ts

```typescript
// app/api/klicktipp/campaign/route.ts
// POST: { projectId, artifactId, newsletterMarkdown, subjectA, subjectB?,
//          preheader?, scheduledAt?, ctaText?, ctaUrl? }
// 1. Auth-Check
// 2. KT-Credentials aus ApiKey (Provider: 'klicktipp') + decrypt
// 3. ktListId aus Projekt-Einstellungen laden
// 4. Praxisname + Adresse aus Projekt laden (für DSGVO-Footer)
// 5. formatForKlickTipp(input) → HTML (PRÜFEN: {{unsubscribe_link}} enthalten)
// 6. createKtCampaign(credentials, { subjectA, subjectB, htmlBody, listId, scheduledAt })
// 7. ktCampaignId + Status 'kt_campaign_created' auf Artefakt setzen
// 8. sendNotification(...).catch((err) => { logger.warn(...) })
// 9. AuditLog-Eintrag
// Response: { campaignId, editUrl }
```

### A5 — Settings-Seite `/settings/klicktipp`

**Felder:**
| Feld | Typ | Hinweis |
|---|---|---|
| KT-Benutzername | `text` | KlickTipp-Login |
| KT-Passwort | `password` | AES-256 verschlüsselt als `user:password` |
| Standard-Listen-ID | `text` | Pro Account — kann pro Projekt überschrieben werden |
| Test-Verbindung | Button | `testKtConnection` → "[OK] Verbunden" oder "[FAIL] <Fehler>" |

**Sicherheit:** `encryptedKey` nie in GET-Response — `hasCredentials: boolean` stattdessen.

### Acceptance Checklist

- [ ] `createKtCampaign` mit HTML **ohne** `{{unsubscribe_link}}` → wirft Fehler (nicht erst API-Fehler)
- [ ] Test-Verbindung → "[OK] Verbunden" oder "[FAIL] <Fehlermeldung>"
- [ ] KT-Credentials AES-256 verschlüsselt in DB
- [ ] `withRetry` auf `createKtCampaign`
- [ ] Stiller Catch in `client.ts` L34 durch `logger.warn` ersetzt
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(klicktipp): KT-Client + Newsletter-Formatter + Campaign-Route + Settings (Slice 23 Sub-A)
```

---

## Sub-Slice B — KlickTippButton + Status-Tracking

**Aufwand:** ~3 Stunden  
**Scope:** Button in Ergebnisansicht, Status-Aktualisierung, klickbarer KT-Link.

### IN

```
components/results/KlickTippButton.tsx          NEU — Client-Komponente
```

### OUT

```
lib/klicktipp/                                  NICHT anfassen (Sub-Slice A)
app/api/klicktipp/                              NICHT anfassen (Sub-Slice A)
```

### B1 — KlickTippButton

```typescript
// components/results/KlickTippButton.tsx
'use client';
// Props: { projectId, artifactId, newsletterMarkdown, subjectA, subjectB?,
//          preheader?, scheduledAt?, ktConfigured: boolean,
//          initialStatus: 'ausstehend' | 'kt_campaign_created' | 'versendet' }
//
// Zustand 'ausstehend' + KT konfiguriert:
//   → "Als KT-Kampagne anlegen"-Button
//   → Ladezustand: "[INFO] Kampagne wird erstellt..."
//   → Erfolg: Status 'kt_campaign_created' + klickbarer Link "[KT] Kampagne bearbeiten"
//   → Fehler: "[FAIL] <Fehlermeldung>" (max. 120 Zeichen, kein Stack-Trace)
//
// Zustand 'kt_campaign_created':
//   → "[OK] KT-Kampagne erstellt" + klickbarer Link zur KT-Bearbeitungsseite
//
// KT nicht konfiguriert (ktConfigured = false):
//   → Button ausgegraut + Tooltip: "KlickTipp nicht konfiguriert — /settings/klicktipp"
//
// HWG-Gate: hwgFlag = 'rot' → Button deaktiviert
//   Tooltip: "HWG-Compliance-Gate: Rote Markierung zuerst beheben"
```

### Acceptance Checklist

- [ ] Newsletter-Ansicht zeigt "Als KT-Kampagne anlegen"-Button (wenn KT konfiguriert)
- [ ] Klick → Kampagne in KT unter Entwürfe → A/B-Betreff korrekt übertragen
- [ ] `{{unsubscribe_link}}` in generiertem HTML vorhanden (in KT-Vorschau sichtbar)
- [ ] Status wechselt zu "KT-Kampagne erstellt" + klickbarer KT-Link
- [ ] KT nicht konfiguriert → Button ausgegraut + Tooltip
- [ ] Kein Versenden aus dem Tool (Status bleibt 'draft' in KT)
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(klicktipp): KlickTippButton + Status-Tracking (Slice 23 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# {{unsubscribe_link}}-Guard vorhanden
Select-String "unsubscribe_link" lib/klicktipp/client.ts
# → Treffer (Pflichtprüfung vor API-Call)

# Kein Versenden aus dem Tool (kein 'send' oder 'publish' in KT-Calls)
Select-String "status.*send\|send.*status\|published\|versenden" lib/klicktipp -Recurse -i
# → Zero Treffer

# Stiller Catch aus deviations.md geschlossen
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" lib/klicktipp/client.ts
# → Zero Treffer

# withRetry auf KT-Call
Select-String "withRetry" lib/klicktipp/client.ts
# → Treffer

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Newsletter versenden aus dem Tool | Stop-Condition plan.md — nur Kampagne anlegen |
| KT-Kontakte einsehen oder exportieren | Stop-Condition plan.md |
| Mehrere Listen-IDs pro Kampagne | KT-Architektur: eine Liste pro Kampagne |
| KT-Tagging-Strategie | plan.md offene Entscheidung — Vor Slice 23 fällen (Einzelliste vs. Tags) |

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
SPRINT P3-E ABSCHLUSSBERICHT
==============================

Sprint: P3-E — KlickTipp Newsletter Connector (Slice 23)

SUB-SLICES:
  A Client + Formatter + Route + Settings:  [ ] DONE — Commit: <hash>
  B KlickTippButton + Status:               [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>
  KT Auth-Schema: <Basic Auth / Session-Token / anderes — dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  unsubscribe_link-Guard:          [ ]
  Stiller Catch geschlossen:       [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P3-E ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P3-F (KPI-Dashboard + Monatsreport — Slice 24)
▶ deviations.md: lib/klicktipp/client.ts:34 als geschlossen markieren
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p3e-klicktipp.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
