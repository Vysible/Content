# Sprint P2-C — E-Mail vollständig (Slice 19)

**Projekt:** Vysible  
**Sprint:** P2-C  
**Format:** Tier 1 (Lücken präzise bekannt, Exploration trotzdem zuerst)  
**Abhängigkeit:** Sprint P2-B ✅, Sprint 0 SmtpConfig-Migration ✅  
**Anforderungen:** FA-F-29 (E-Mail-Benachrichtigungen), NFA-06 (Retry)  
**Geschätzte Dauer:** ~1 Tag

> **Pre-Condition:** `SmtpConfig`-Migration aus `docs/dev-prompts/OpenActions.md`
> muss manuell erledigt sein (prisma migrate deploy + HEDY-ApiKey → SmtpConfig).
> Ohne live SmtpConfig in DB können Tests nicht laufen.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die 4 Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap
Select-String "P2-B.*abgeschlossen|P2-B.*✅|Sprint P2-B.*✅" docs/roadmap.md -i

# Check D — CHANGELOG
Select-String "\[Unreleased\]" CHANGELOG.md
```

Bei **Hard-FAIL (A oder B):** STOP.  
Bei **4/4 PASS:** Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# Ist-Stand E-Mail
Get-Content lib/email/mailer.ts

# Wo wird sendNotification() aufgerufen? (alle Call-Sites)
Select-String "sendNotification" app,lib -Recurse -i | Select-Object Path, LineNumber, Line

# SMTP-Config-Schema
Select-String "SmtpConfig" prisma/schema.prisma -A 12

# Existiert ein SMTP-Settings-UI?
Get-ChildItem app/(dashboard)/settings -Recurse -Name

# Existiert bereits ein HTML-Mail-Template?
Select-String "html.*mail|mailHtml|htmlTemplate" lib/email -Recurse -i
```

**Bekannte Lücken (Stand Mai 2026, aus Code-Review):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/generation/pipeline.ts` L175 | `sendNotification(...).catch((err) => {})` — still | MUSS |
| `app/api/wordpress/draft/route.ts` L41 | `sendNotification(...).catch(() => {})` — still | MUSS |
| `lib/tokens/expiry-checker.ts` L20 | `sendNotification(...).catch(() => {})` — still | MUSS |
| `lib/costs/reporter.ts` L56 | `sendNotification(...).catch(() => {})` — still | MUSS |
| `app/api/praxis/invite/route.ts` L27 | `sendNotification(...).catch(() => {})` — still | MUSS |
| `app/api/klicktipp/campaign/route.ts` L32 | `sendNotification(...).catch(() => {})` — still | MUSS |
| `lib/email/mailer.ts` L56 | `console.log` statt `logger` | MUSS (nach Sprint 3) |
| `lib/email/mailer.ts` | Text-only E-Mails — kein HTML | SOLL |
| `app/(dashboard)/settings/` | SMTP-Einstellungs-UI fehlt komplett | MUSS |
| `SmtpConfig` | Globale `recipients[]` — kein Per-Projekt-Empfänger-Override | OPTIONAL |

---

## CRITICAL: Self-review Checklist

- [ ] Jedes Sub-Slice einzeln committed
- [ ] Kein `sendNotification(...).catch(() => {})` übrig — alle Catches loggen
- [ ] Logger: `logger.*` aus `lib/utils/logger.ts` in Server-Code (`lib/`, `app/api/`);
      `console.warn/error('[Vysible] …', err)` in Client-Components (`'use client'`).
      Hintergrund: pino-pretty ist server-only — siehe `docs/forge-web-deviations.md`
      "Client-Component-Logger" und `OpenActions.md` Backlog-Punkt 2.
      P2-C-Hinweis: Sub-Slice A (sendNotification-Catches) ist reiner Server-Code →
      `logger.*` Pflicht. Sub-Slice B/C (UI-Settings) sind Client-Code → `console.*`-Pattern.
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — Resilience: Alle `.catch(() => {})` auf sendNotification reparieren

**Aufwand:** ~2–3 Stunden  
**Scope:** Alle 6 stillen Catches an `sendNotification`-Aufrufen ersetzen.

### IN

```
lib/generation/pipeline.ts                MOD — catch loggen
app/api/wordpress/draft/route.ts          MOD — catch loggen
lib/tokens/expiry-checker.ts              MOD — catch loggen
lib/costs/reporter.ts                     MOD — catch loggen
app/api/praxis/invite/route.ts            MOD — catch loggen
app/api/klicktipp/campaign/route.ts       MOD — catch loggen
```

### Muster (für alle 6 Stellen)

```typescript
// VORHER (Beispiel pipeline.ts):
sendNotification('generation_complete', project.name).catch((err: unknown) => {})

// NACHHER:
sendNotification('generation_complete', project.name).catch((err: unknown) => {
  logger.warn('[Vysible] E-Mail-Benachrichtigung fehlgeschlagen (generation_complete):', err)
})
```

**Wichtig:** `logger.warn` (nicht `logger.error`) — E-Mail-Fehler sind non-fatal.
Der Business-Flow läuft weiter. Nur loggen, nicht re-throwen.

**Hinweis Sprint 3:** Wenn Sprint 3 (Pino-Logger) noch nicht ausgeführt wurde,
`logger` durch den bisherigen Logger-Import ersetzen. Priorität: Lücke schließen,
Logger-Typ-Mismatch danach in Sprint 3 bereinigen.

### Acceptance Checklist

- [ ] `Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" app,lib -Recurse` → Zero Treffer für sendNotification-Calls
- [ ] TypeScript: 0 Fehler
- [ ] E-Mail schlägt fehl → `logger.warn` im Log sichtbar, kein HTTP-500 für den Nutzer

### Commit-Message

```
fix(email): sendNotification-Catches geloggt — keine stillen Fehler mehr (Slice 19)
```

---

## Sub-Slice B — HTML-E-Mails + SMTP-Settings-UI

**Aufwand:** ~4–5 Stunden  

### IN

```
lib/email/mailer.ts                           MOD — HTML-Templates, logger
lib/email/templates/                          NEU — HTML-Template-Hilfsfunktionen
app/(dashboard)/settings/smtp/page.tsx        NEU — SMTP-Einstellungs-Seite
app/api/settings/smtp/route.ts                NEU — CRUD für SmtpConfig
app/(dashboard)/settings/smtp/SmtpForm.tsx    NEU — Client-Komponente
```

### OUT

```
prisma/schema.prisma                          NICHT anfassen (SmtpConfig-Schema bleibt)
lib/crypto/aes.ts                             NICHT anfassen
Alle anderen Trigger-Call-Sites               NICHT anfassen (in Sub-Slice A erledigt)
```

### B1 — HTML-E-Mails

Aktuell sendet `sendNotification` nur `text: ...`. Nodemailer unterstützt `html:` parallel.

Ziel: Einfache, konsistente HTML-E-Mail für alle Trigger.

```typescript
// lib/email/templates/notification.ts  (NEU)
export function buildNotificationHtml(
  trigger: EmailTrigger,
  projectName: string,
  details?: string
): string {
  const subject = TRIGGER_SUBJECTS[trigger]
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family: sans-serif; color: #1a1a2e; background: #f5f4f0; margin: 0; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px;">
    <p style="font-size: 11px; color: #6b7280; margin: 0 0 8px;">VYSIBLE · KI-Content-Plattform</p>
    <h1 style="font-size: 18px; margin: 0 0 16px;">${subject}</h1>
    <p style="color: #374151; margin: 0 0 8px;"><strong>Projekt:</strong> ${projectName}</p>
    ${details ? `<p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">${details}</p>` : ''}
  </div>
</body>
</html>`
}
```

In `sendNotification`: `html: buildNotificationHtml(trigger, projectName, details)` ergänzen.
`text:` bleibt als Fallback erhalten (beide übergeben).

### B2 — SMTP-Settings-UI

`/settings/smtp` — Server-Komponente lädt aktive `SmtpConfig`, rendert `SmtpForm`.

**`SmtpForm.tsx`** (Client-Komponente) — Felder:

| Feld | Typ | Hinweis |
|---|---|---|
| SMTP-Host | `text` | z.B. smtp.gmail.com |
| Port | `number` | Default: 587 |
| TLS/SSL | `checkbox` (secure) | Default: false |
| Benutzername | `text` | Wird als `from:` verwendet |
| Passwort | `password` | AES-256 verschlüsselt gespeichert |
| Empfänger | `textarea` | Zeilengetrennte E-Mail-Adressen, max. 5 |
| Aktiv | `checkbox` | Nur eine SmtpConfig aktiv |

**Test-E-Mail-Button:** Sendet eine Test-Mail an ersten Empfänger.
Zeigt "[OK] Testmail versendet" oder "[FAIL] Fehler: <message>".

**API — `app/api/settings/smtp/route.ts`:**

```
GET  → aktive SmtpConfig zurückgeben (ohne encryptedPassword, stattdessen hasPassword: true/false)
POST → neue SmtpConfig anlegen (Passwort verschlüsseln mit lib/crypto/aes.ts)
PUT  → bestehende aktualisieren (Passwort nur aktualisieren wenn Feld nicht leer)
```

```typescript
// Sicherheits-Pflicht: Passwort NIEMALS im Klartext zurückgeben
// GET-Response: { id, host, port, secure, user, hasPassword: true, recipients, active }
```

**Empfänger-Validierung:**
- Max. 5 E-Mail-Adressen
- Jede Zeile als `trim()` behandeln
- Basis-Format-Validierung (contains '@')

**Navigation:** Link in Sidebar oder Settings-Seite ergänzen:
`/settings/smtp` → "E-Mail-Benachrichtigungen"

### Acceptance Checklist

- [ ] `/settings/smtp` erreichbar für ADMIN-User
- [ ] Nicht-Admin-User → 403 oder Redirect
- [ ] SMTP speichern → `encryptedPassword` in DB (Klartext-Passwort nie im Response)
- [ ] Passwort-Feld leer lassen beim Update → altes Passwort bleibt erhalten
- [ ] Test-E-Mail-Button → E-Mail im Postfach
- [ ] Test-E-Mail schlägt fehl → "[FAIL] Fehler: <message>" im UI (kein Stack-Trace)
- [ ] HTML-E-Mail: Generierung abgeschlossen → E-Mail mit HTML im Postfach
- [ ] Max. 5 Empfänger: 6. Eingabe → Validierungsfehler
- [ ] `encryptedPassword` wird in GET-Responses durch `hasPassword: boolean` ersetzt

### Commit-Message

```
feat(email): HTML-E-Mails, SMTP-Settings-UI, Test-E-Mail-Funktion (Slice 19)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Keine stillen sendNotification-Catches
Select-String "sendNotification.*\.catch\(\(\)\s*=>\s*\{\s*\}\)" app,lib -Recurse
# → Zero Treffer

# Kein encryptedPassword in API-Responses
Select-String "encryptedPassword" app/api/settings/smtp -Recurse
# → Nur in "select: { encryptedPassword: false }" oder ähnlichem erlaubt

# Tests grün
pnpm test
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Per-Projekt-Empfänger-Override | SmtpConfig hat globale recipients[] — Ausreichend für Agentur-intern-Nutzung bis Phase 3 |
| E-Mail-Template-Editor | Scope-Creep — statische Templates reichen für MVP |
| Unsubscribe-Link in Benachrichtigungen | Nur in Newsletter-HTML nötig (Slice 9), nicht in internen Benachrichtigungen |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P2-C ABSCHLUSSBERICHT
=============================

Sprint: P2-C — E-Mail vollständig

SUB-SLICES:
  A sendNotification-Catches:  [ ] DONE — Commit: <hash>
  B HTML-Mails + SMTP-UI:      [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:          [ ]
  Alle Tests grün:              [ ] x/x PASS
  Keine stillen send-Catches:   [ ]
  CHANGELOG aktuell:            [ ]

═══════════════════════════════════════════════
[OK] P2-C ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P2-D (DataForSEO Slice 11a — erst nach API-Vorab-Validierung)
   ODER: Phase-3-Backlog starten (Slice 27 Kosten-Tracking als erster Schritt)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p2c-email.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
