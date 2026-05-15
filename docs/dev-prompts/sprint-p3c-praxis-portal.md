# Sprint P3-C — Praxis-Portal (Slice 21)

**Projekt:** Vysible  
**Sprint:** P3-C  
**Format:** Tier 1 (Anforderungen klar definiert, Exploration trotzdem zuerst)  
**Abhängigkeit:** Sprint P3-B ✅, Sprint P2-C ✅ (SMTP aktiv für Einladungs-E-Mails)  
**Anforderungen:** plan.md Slice 21, FA-B-11 (Audit-Log), ADR-002 (Mandantentrennung)  
**Geschätzte Dauer:** ~1,5 Tage

> **Architektur-Hinweis:**  
> Slice 10 (Kunden-Sharing) ist ein 7-tägiger, passwortgeschützter temporärer Freigabelink.  
> Das Praxis-Portal ist davon vollständig getrennt: permanenter Login,  
> eigene Auth-Route `/review/*`, JWT mit `projectId`-Claim.  
> Kein Code aus Slice 10 wiederverwenden — separate Implementierung.

> **PraxisUser-Modell:** Wurde in Sprint 3 (PII-Encryption) mit  
> `emailEncrypted`/`nameEncrypted`-Feldern versehen. Exploration prüft den aktuellen Stand.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap: Vorgänger P3-B abgeschlossen?
Select-String "P3-B.*✅|Sprint P3-B.*✅" docs/roadmap.md -i

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
# PraxisUser-Modell — vollständiges Schema lesen
Select-String "model PraxisUser" prisma/schema.prisma -A 20

# Bestehende Praxis-Modelle (Comment, ApprovalStatus, Invitation vorhanden?)
Select-String "model Comment\|model ApprovalStatus\|approvalStatus\|model Invitation\|invitationToken" prisma/schema.prisma -A 8

# Bestehende Praxis-Portal-Dateien
Get-ChildItem app/(praxis) -Recurse -Name -ErrorAction SilentlyContinue
Get-ChildItem components/praxis-portal -Recurse -Name -ErrorAction SilentlyContinue
Get-ChildItem app/api/praxis -Recurse -Name -ErrorAction SilentlyContinue

# Review-Auth-Route
Get-ChildItem app/(praxis)/review -Recurse -Name -ErrorAction SilentlyContinue

# Middleware: Ist /review/* bereits in Route-Schutz berücksichtigt?
Select-String "review\|praxis" middleware.ts -i

# Wie sieht die bestehende Einladungs-Route aus? (aus plan.md: app/api/praxis/invite)
Get-Content app/api/praxis/invite/route.ts -ErrorAction SilentlyContinue

# Bestehende Freigabe-Route
Get-Content app/api/praxis/approve/route.ts -ErrorAction SilentlyContinue

# Audit-Log-Tabelle vorhanden? (Sprint 1: Slice 28)
Select-String "model AuditLog\|model audit_log" prisma/schema.prisma -A 8

# Wie wird approvalStatus im StoredTextResult/ThemenItem gespeichert?
Select-String "approvalStatus\|approval_status\|praxis_approved" prisma/schema.prisma,lib -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# Agentur-Dashboard: Existiert ein Badge/Freigabe-Zähler?
Select-String "pending.*approval\|ausstehend.*freigabe\|praxis_approved" app/(dashboard) -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10
```

**Bekannte Lücken (Stand Mai 2026, aus Roadmap + plan.md):**

| Datei | Lücke | Priorität |
|---|---|---|
| `prisma/schema.prisma` | `Comment`-Modell, `InvitationToken`-Modell fehlen wahrscheinlich | MUSS |
| `app/(praxis)/review/[token]/page.tsx` | Fehlend oder Stub | MUSS |
| `components/praxis-portal/ArticleView.tsx` | Fehlend | MUSS |
| `components/praxis-portal/CommentThread.tsx` | Fehlend | MUSS |
| `components/praxis-portal/ApprovalButton.tsx` | Fehlend | MUSS |
| `app/api/praxis/comments/route.ts` | Fehlend | MUSS |
| `app/api/praxis/approve/route.ts` | Fehlend oder Stub | MUSS |
| `app/api/praxis/invite/route.ts` | Stub mit stillem Catch (OpenActions.md — in P2-C Sub-A repariert) | PRÜFEN |
| Agentur-Dashboard-Badge | Fehlender Badge für ausstehende Praxis-Freigaben | MUSS |
| `middleware.ts` | `/review/*`-Route darf NICHT durch Agentur-Auth geschützt sein | MUSS |

---

## CRITICAL: Self-review Checklist

- [ ] Mandantentrennung: Praxis-User kann **ausschliesslich** eigenes Projekt sehen
  (Zugriff auf anderes `projectId` im Token → 403, kein Soft-Redirect)
- [ ] `emailEncrypted` aus `PraxisUser` — nie als Klartext in Response
- [ ] Invitation-Token: kryptographisch zufällig (crypto.randomUUID oder 32-Byte hex), 24h TTL
- [ ] Praxis kann nicht bearbeiten — kein PUT/PATCH auf Inhalte aus Portal heraus
- [ ] Mobile: alle interaktiven Elemente min. 44px Touch-Target (plan.md-Pflicht)
- [ ] `/review/*`-Route in `middleware.ts` von Agentur-Auth-Schutz ausgenommen
- [ ] Einladungslink nach 24h ungültig (Datenbankprüfung, nicht nur Client-Side)
- [ ] E-Mail bei Freigabe via bestehenden `sendNotification`-Mechanismus
- [ ] Alle Catches loggen — kein stiller Catch
- [ ] TypeScript strict: 0 Fehler
- [ ] Tests grün
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — Prisma-Schema + Invitation + Auth-Setup

**Aufwand:** ~5–6 Stunden  
**Scope:** DB-Modelle, Einladungs-Flow, Review-Auth-Route, middleware.ts-Anpassung.

### IN

```
prisma/schema.prisma                            MOD — Comment, InvitationToken, approvalStatus-Feld
app/api/praxis/invite/route.ts                  MOD — echte Implementierung (falls Stub)
app/(praxis)/review/[token]/page.tsx            NEU — Auth-Check + Portal-Einstiegspunkt
app/api/praxis/auth/route.ts                    NEU — Praxis-Login-Validierung (Token-Prüfung)
middleware.ts                                   MOD — /review/* von Agentur-Auth ausnehmen
```

### OUT

```
lib/crypto/aes.ts                               NICHT anfassen
lib/auth/session.ts                             NICHT anfassen
app/(auth)/                                     NICHT anfassen — Praxis hat eigene Auth-Route
```

### A1 — Prisma-Schema-Erweiterungen

> Exploration zeigt welche Modelle bereits existieren. Nur fehlende ergänzen.

```prisma
// Einladungstoken für Praxis-User (24h TTL)
model InvitationToken {
  id          String    @id @default(cuid())
  token       String    @unique @default(cuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  email       String    // Klartext nur für Einladungs-E-Mail — danach in PraxisUser als encrypted
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime  @default(now())
}

// Kommentar eines Praxis-Users zu einem generierten Artefakt
model Comment {
  id              String     @id @default(cuid())
  projectId       String
  project         Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  praxisUserId    String
  praxisUser      PraxisUser @relation(fields: [praxisUserId], references: [id], onDelete: Cascade)
  artifactId      String     // ID des zugehörigen Textentwurfs / ThemenItems
  artifactType    String     // 'blog' | 'newsletter' | 'social'
  content         String
  createdAt       DateTime   @default(now())
}
```

Auf `StoredTextResult` oder dem jeweiligen Artefakt-Modell:  
`approvalStatus   String?  @default("ausstehend")  // 'ausstehend' | 'praxis_approved' | 'agentur_freigegeben'`

> Exploration prüft ob `approvalStatus` bereits auf dem richtigen Modell existiert.

Nach Schema-Änderungen: `pnpm prisma migrate dev --name add_praxis_portal`

### A2 — Einladungs-Flow (app/api/praxis/invite/route.ts)

```typescript
// POST: { projectId, email, name } → Einladungstoken erstellen + E-Mail senden
// Logik:
// 1. Auth-Check (Agentur-Nutzer)
// 2. InvitationToken erstellen (expiresAt = now + 24h, token = crypto.randomUUID())
// 3. PraxisUser upsert mit encrypt(email) + encrypt(name)
// 4. sendNotification('praxis_invitation', ...) mit Einladungs-Link
//    Link-Format: https://vysible.cloud/review/[token]
// 5. AuditLog-Eintrag (FA-B-11 — bereits implementiert in Sprint 1)
```

> **Sicherheit:** `email` im Einladungs-Token als Klartext nur temporär für den
> E-Mail-Versand — danach als `emailEncrypted` in `PraxisUser` (Sprint 3 Standard).

### A3 — Review-Auth + middleware.ts

```typescript
// app/(praxis)/review/[token]/page.tsx
// Server-Komponente:
// 1. token aus params lesen
// 2. InvitationToken in DB suchen → nicht gefunden oder usedAt gesetzt oder expiresAt überschritten → 404-Seite
// 3. Token als "verwendet" markieren (usedAt = now)
// 4. PraxisUser laden (via projectId aus Token)
// 5. Projekt-Inhalte laden (nur eigenes projectId)
// 6. Portal-Layout rendern (ArticleView, CommentThread, ApprovalButton)
```

```typescript
// middleware.ts — /review/* von Agentur-Auth ausnehmen
// Pattern: matcher darf /review/:path* nicht einschliessen
// Exploration zeigt bestehende matcher-Konfiguration — entsprechend anpassen
// Bestehende public-Routen: /login, /api/auth/*, /share/*, /api/healthz
// Ergänzen: /review/:path*, /api/praxis/comments, /api/praxis/approve
```

> **Wichtig:** `/api/praxis/comments` und `/api/praxis/approve` werden vom Praxis-Portal
> aufgerufen und brauchen eigene Auth (Token-basiert), keine Agentur-Session.

### Acceptance Checklist

- [ ] Einladungslink erstellt → Token in DB (24h TTL)
- [ ] Token besucht → Portal öffnet sich, PraxisUser sieht nur eigenes Projekt
- [ ] Token erneut aufgerufen (usedAt gesetzt) → gilt als Login — Portal bleibt zugänglich
  (Token ist einmaliger Login-Initiator, nicht dauerhafter Auth-Mechanismus — Exploration zeigt was Plan-Intention ist)
- [ ] Token nach 24h abgelaufen → 404/Fehlerseite
- [ ] `/review/[anderer-token]` → kein Zugriff auf fremdes Projekt → 403
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(praxis-portal): Schema + Invitation-Flow + Review-Auth-Route + Middleware (Slice 21 Sub-A)
```

---

## Sub-Slice B — Portal-UI + Kommentare + Freigabe + Dashboard-Badge

**Aufwand:** ~5–6 Stunden  
**Scope:** Artikel-Ansicht, Kommentar-Thread, Freigabe-Button, Agentur-Dashboard-Badge.

### IN

```
components/praxis-portal/ArticleView.tsx        NEU — Artikel lesbar darstellen
components/praxis-portal/CommentThread.tsx      NEU — Kommentar-Thread pro Artefakt
components/praxis-portal/ApprovalButton.tsx     NEU — Freigabe-Button + Status
app/api/praxis/comments/route.ts                NEU — GET + POST Kommentare
app/api/praxis/approve/route.ts                 NEU/MOD — Freigabe-Action
app/(dashboard)/page.tsx                        MOD — Badge für ausstehende Freigaben
```

### OUT

```
prisma/schema.prisma                            NICHT anfassen (Sub-Slice A)
app/(praxis)/review/[token]/page.tsx            MOD nur für Layout-Integration
app/api/praxis/invite/route.ts                  NICHT anfassen (Sub-Slice A)
```

### B1 — ArticleView (Server-Komponente)

```typescript
// components/praxis-portal/ArticleView.tsx
// Zeigt: Titel, Artefakt-Typ (Blog / Newsletter / Social), Inhalt (Markdown → HTML)
// Keine Bearbeitungsmöglichkeit — read-only
// Mobile-optimiert: font-size min. 16px, line-height 1.6, max-width 680px
// Unten: CommentThread + ApprovalButton
```

### B2 — CommentThread (Client-Komponente)

```typescript
// components/praxis-portal/CommentThread.tsx
'use client';
// - GET /api/praxis/comments?artifactId=...&projectId=...
// - Kommentar-Liste chronologisch
// - Textarea + "Kommentar senden"-Button
// - POST /api/praxis/comments → neuer Kommentar
// - Optimistic Update: Kommentar erscheint sofort (Fehler → Rollback)
// - Mobile: Textarea min. 44px Höhe, Submit-Button voll-breit auf Mobile
```

### B3 — ApprovalButton (Client-Komponente)

```typescript
// components/praxis-portal/ApprovalButton.tsx
'use client';
// Status: 'ausstehend' (grau, "Freigeben"-Button aktiv)
//       | 'praxis_approved' (grün, "Freigegeben ✓", Button deaktiviert)
//       | 'agentur_freigegeben' (blau, "Veröffentlicht")
//
// Bei Klick auf "Freigeben":
// → POST /api/praxis/approve { artifactId, projectId }
// → approvalStatus = 'praxis_approved'
// → E-Mail an Agentur via sendNotification('praxis_approved', projectName)
// → Button-Text wechselt zu "Freigegeben ✓"
```

### B4 — API-Routen

```typescript
// app/api/praxis/comments/route.ts
// GET  ?artifactId=...&projectId=...
//   → Auth: projectId aus Query muss dem Token des anfragenden Praxis-Users entsprechen
//   → Gibt Comment[] zurück
// POST { artifactId, projectId, content }
//   → Auth wie GET
//   → db.comment.create
//   → AuditLog-Eintrag

// app/api/praxis/approve/route.ts
// POST { artifactId, artifactType, projectId }
//   → Auth: projectId-Check
//   → approvalStatus auf Artefakt setzen: 'praxis_approved'
//   → sendNotification('praxis_approved', ...).catch((err) => { logger.warn(...) })
//   → AuditLog-Eintrag (FA-B-11)
```

> **Auth in Praxis-API-Routen:** Kein `getServerSession` (Agentur-Auth) — stattdessen
> Token/Claim aus dem Portal-Kontext. Einfachste Variante: `projectId` als signierter
> Cookie beim Portal-Login setzen (httpOnly, 7 Tage) und in API-Routen verifizieren.
> Exploration zeigt ob hierfür schon eine Hilfsfunktion existiert.

### B5 — Agentur-Dashboard-Badge

```typescript
// app/(dashboard)/page.tsx — Server-Komponente
// Bestehender Dashboard-Code ergänzen:
// const pendingApprovals = await db.comment.count({ where: { project: { createdById: session.user.id }, ... } })
// → Besser: ausstehende Artefakte mit approvalStatus = 'ausstehend' die Kommentare haben
// → Badge: rote Zahl neben "Praxis-Freigaben" im Dashboard oder Sidebar
```

### Acceptance Checklist

- [ ] Praxis-Login → Artikel-Liste des eigenen Projekts vollständig sichtbar
- [ ] Direktzugriff `/review/[fremdes-token]` → 403 oder 404
- [ ] Kommentar absenden → erscheint sofort im Thread + im Agentur-Dashboard sichtbar
- [ ] "Freigeben" → `approvalStatus = 'praxis_approved'` in DB + E-Mail an Agentur
- [ ] Button nach Freigabe deaktiviert (kein doppeltes Freigeben)
- [ ] Agentur-Dashboard-Badge zeigt Anzahl ausstehender Praxis-Freigaben
- [ ] Mobile: Artikel vollständig lesbar, alle Buttons ≥44px Touch-Target
- [ ] Einladungslink nach 24h → Portal nicht mehr zugänglich (Fehlerseite)
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(praxis-portal): ArticleView + CommentThread + ApprovalButton + Dashboard-Badge (Slice 21 Sub-B)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Mandantentrennung: kein Praxis-API-Endpoint ohne projectId-Prüfung
Select-String "api/praxis" app/api/praxis -Recurse |
  Where-Object { $_.Line -notmatch "projectId\|project_id" }
# → Alle Praxis-Routen prüfen projectId

# emailEncrypted nie in API-Response (Klartext-Leak-Check)
Select-String "emailEncrypted\|email.*praxis" app/api/praxis -Recurse |
  Where-Object { $_.Line -notmatch "select.*false\|exclude\|NOT" }
# → Manuelle Prüfung: kein Klartext-Email in Response

# /review/* in middleware.ts NICHT in Auth-Matcher
Select-String "review" middleware.ts
# → Muss im matcher FEHLEN (oder explizit ausgenommen sein)

# Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Praxis kann Inhalte bearbeiten | Stop-Condition plan.md — nur lesen und kommentieren |
| Mehrere Praxis-Users pro Projekt | Single-User pro Projekt reicht für MVP |
| Kommentar-Benachrichtigung per E-Mail | Spätere Erweiterung — Freigabe-E-Mail reicht |
| Praxis-eigenes Dashboard mit Metriken | Phase 4 |
| Passwort-Login für Praxis (dauerhaft) | Token-basiert ausreichend; Passwort-Auth als Upgrade |

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
SPRINT P3-C ABSCHLUSSBERICHT
==============================

Sprint: P3-C — Praxis-Portal (Slice 21)

SUB-SLICES:
  A Schema + Invitation + Auth:    [ ] DONE — Commit: <hash>
  B Portal-UI + Kommentare + Badge:[ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>
  Auth-Schema Praxis-API-Routen: <Cookie / anderes — dokumentieren>

CHECKS:
  TypeScript 0 Fehler:             [ ]
  Alle Tests grün:                 [ ] x/x PASS
  Mandantentrennung geprüft:       [ ]
  Mobile-Test (44px Buttons):      [ ]
  CHANGELOG aktuell:               [ ]

═══════════════════════════════════════════════
[OK] P3-C ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P3-D (WordPress REST API Connector — Slice 22)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p3c-praxis-portal.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
