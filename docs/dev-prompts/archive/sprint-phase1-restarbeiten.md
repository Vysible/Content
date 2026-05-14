# Sprint Phase-1-Restarbeiten — 5 Unvollständige Slices

**Projekt:** Vysible
**Sprint:** Phase-1-Restarbeiten
**Format:** Tier 2 — Scope-Karte (kein vollständiger Code, Implementierung explorativ)
**Abhängigkeit:** Sprint 3 ✅ (PII-Encryption + Logger)
**Anforderungen:** FA-F-11a, FA-KI-04, NFA-02 (Dateinamen-Konvention)
**Geschätzte Dauer:** ~5–6 Tage gesamt

> **Warum Tier-2-Format?** Diese Slices sind halb implementiert. Der Agent muss
> zuerst den Ist-Stand erkunden, bevor er handeln kann. Präzise Code-Snippets
> wären jetzt falsche Präzision — sie setzen einen bekannten Ausgangszustand voraus.
> Der Agent erkundet, plant, implementiert, meldet Drift zurück.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die 4 Checks aus:

```powershell
git status --porcelain
node node_modules/typescript/bin/tsc --noEmit
Select-String "Sprint 3.*abgeschlossen|Sprint 3.*✅" docs/roadmap.md -i
Select-String "\[Unreleased\]" CHANGELOG.md
```

Bei **Hard-FAIL (A oder B):** STOP.
Bei **4/4 PASS:** Slices in der Reihenfolge unten abarbeiten. Jedes Slice einzeln committen.

---

## CRITICAL: Exploration zuerst

**Vor jedem Slice:** Dateistand erkunden, nicht blind implementieren.

```powershell
# Slice 16 (Auth) — was existiert?
Select-String "Passwort vergessen\|resetPassword\|forgot" app -Recurse -i
Select-String "AdminUsers\|user.*management\|UserTable" app -Recurse -i
Select-String "autoLogout\|sessionTimeout\|30.*min" app -Recurse -i

# Slice 4 (API-Key) — was existiert?
Select-String "pro.*projekt\|project.*key\|selectedKey\|FA-F-11a" app,lib -Recurse -i
Select-String "SocialToken\|token.*manager\|OAuthToken" app,lib -Recurse -i

# Slice 9 (Export) — was existiert?
Select-String "filename\|Dateiname\|PraxisKürzel" lib/export -Recurse -i

# Slice 13 (Blog-Gliederung) — was existiert?
Select-String "gliederung\|outline\|blog.*step\|FA-KI-04" lib/generation,prompts -Recurse -i

# Pipeline (canva_loaded) — was existiert?
Select-String "canva_loaded\|canvaContext\|canvaFolder" lib/generation -Recurse -i
```

**Drift-Report:** Nach der Exploration kurz zusammenfassen was tatsächlich vorhanden ist
vs. was in roadmap.md als fehlend steht. Maintainer bei Diskrepanzen informieren.

---

## CRITICAL: Self-review Checklist (sprint-übergreifend)

- [ ] Jedes Slice einzeln committed (kein Mega-Commit)
- [ ] `writeAuditLog()` aufgerufen wo neue Aktionen entstehen (Forge: alle User-Actions)
- [ ] Kein neues `console.*` — `logger.*` aus `lib/utils/logger.ts` nutzen
- [ ] Kein neues `catch {}` ohne Log — Forge `resilience.mdc §3a`
- [ ] TypeScript strict: 0 Fehler nach jedem Sub-Slice
- [ ] Tests: bestehende Vitest-Suite läuft durch — kein Regression
- [ ] CHANGELOG.md im jeweiligen Commit aktualisiert

---

## Slice A — Auth-Lücken (Slice 16)

**Aufwand:** ~1 Tag
**Anforderung:** Auth-Konzept v6.0, Auto-Logout 30 Min

### Was fehlt laut Roadmap

| Lücke | Beschreibung |
|---|---|
| Passwort-Vergessen-E-Mail | Link per SMTP, Token mit Ablaufzeit |
| Admin-User-Verwaltungs-UI | Liste aller User, aktivieren/deaktivieren, Rolle ändern |
| Auto-Logout 30 Min | Client-seitig: bei Inaktivität → `/login` |

### Scope

**IN:**
```
app/(dashboard)/settings/users/page.tsx         NEU — Admin-User-Verwaltung
app/(dashboard)/settings/users/                 ggf. weitere Dateien
app/api/auth/forgot-password/route.ts           NEU — Token generieren + SMTP
app/api/auth/reset-password/route.ts            NEU — Token validieren + Passwort setzen
app/(auth)/reset-password/page.tsx              NEU — Reset-Formular
lib/email/mailer.ts                             MOD — sendPasswordResetMail() ergänzen
components/auth/AutoLogoutProvider.tsx          NEU — Client-Komponente mit useEffect
app/(dashboard)/layout.tsx                      MOD — AutoLogoutProvider einbinden
```

**OUT:**
```
Auth.js-Konfiguration (auth.config.ts)          NICHT anfassen
middleware.ts                                   NICHT anfassen
Bestehende Login-Seite                          NICHT anfassen
```

### Acceptance Checklist

- [ ] Passwort-Vergessen: `/login` hat "Passwort vergessen"-Link
- [ ] Reset-Mail landet im SMTP-Postfach (Test via Nodemailer SMTP-Config)
- [ ] Reset-Token: 1h Ablaufzeit, Single-Use (nach Nutzung ungültig)
- [ ] Admin-UI: Liste aller User mit Rolle, Aktiv-Status, Deaktivieren-Button
- [ ] Nicht-Admin-User sieht `/settings/users` nicht (Middleware oder Server-Side-Check)
- [ ] Auto-Logout: nach 30 Min Inaktivität → `signOut()` + Redirect `/login`
- [ ] Auto-Logout: Timer-Reset bei jeder User-Interaktion (click, keypress, mousemove)
- [ ] Kein PII in Audit-Log-Meta — nur `userId`, nie E-Mail-Adresse

### Datenbankfeld für Reset-Token

Prisma-Migration nötig: `User`-Modell braucht `resetToken String?` und `resetTokenExpiry DateTime?`.

```powershell
npx prisma migrate dev --name auth_reset_token
```

### Commit-Message

```
feat(auth): Passwort-Vergessen-Flow, Admin-User-Verwaltung, Auto-Logout 30 Min (Slice 16)
```

---

## Slice B — API-Key-Manager Erweiterungen (Slice 4)

**Aufwand:** ~1 Tag
**Anforderung:** FA-F-11a (Pro-Projekt-Key-Auswahl), Social-Token-Manager-UI

### Was fehlt laut Roadmap

| Lücke | Beschreibung |
|---|---|
| Pro-Projekt-Key-Auswahl | Projekt kann spezifischen API-Key wählen statt globalen Default |
| Social-Token-Manager-UI | OAuth-Token für Meta/LinkedIn anzeigen, Status + Ablaufdatum |

### Scope

**IN:**
```
prisma/schema.prisma                            MOD — Project.apiKeyId (optional, FK zu ApiKey)
app/(dashboard)/projects/[id]/settings/         NEU oder MOD — Key-Auswahl
app/api/projects/[id]/settings/route.ts         NEU oder MOD — apiKeyId speichern
app/(dashboard)/settings/api-keys/page.tsx      MOD — Social-Token-Sektion ergänzen
lib/generation/pipeline.ts                      MOD — projektspezifischen Key laden
```

**OUT:**
```
AES-Verschlüsselung in lib/crypto/aes.ts        NICHT anfassen
Bestehende ApiKey-CRUD-Logik                    NICHT anfassen (nur ergänzen)
```

### Acceptance Checklist

- [ ] Projekt-Einstellungen: Dropdown zur Key-Auswahl pro Provider (Anthropic, OpenAI)
- [ ] Kein Key gewählt → globaler Default-Key wird verwendet (Fallback)
- [ ] Pipeline liest Key aus Projekt wenn gesetzt, sonst globaler Key
- [ ] Social-Token-Manager: zeigt Meta/LinkedIn-Token-Status (gültig/abgelaufen)
- [ ] Abgelaufener Token: Warnsymbol + "Bitte erneuern"-Hinweis
- [ ] Neue FK-Relation `Project.apiKeyId` nullable — kein Breaking Change

### Migration

```powershell
npx prisma migrate dev --name project_api_key_selection
```

### Commit-Message

```
feat(api-keys): Pro-Projekt-Key-Auswahl (FA-F-11a), Social-Token-Manager-UI (Slice 4)
```

---

## Slice C — Export-Dateinamen-Konvention (Slice 9)

**Aufwand:** ~0,5 Tage
**Anforderung:** Dateinamen-Konvention `[PraxisKürzel]_[Kanal]_[MonatJahr]_v[N]`

### Was fehlt laut Roadmap

Aktuell werden Dateien im ZIP ohne strukturierte Namensgebung exportiert.
Ziel-Format: `WAR_Blog_Apr2027_v1.docx`

### Scope

**IN:**
```
lib/export/zip.ts                               MOD — Dateinamen-Logik
lib/export/docx.ts                              MOD — ggf. Dateiname-Parameter
lib/export/html.ts                              MOD — ggf. Dateiname-Parameter
app/api/projects/[id]/export/route.ts           MOD — PraxisKürzel ableiten + übergeben
```

**OUT:**
```
Inhalts-Logik der Exporte                       NICHT anfassen
lib/export/pdf.ts                               NICHT anfassen (PDF-Dateiname separat)
lib/export/xlsx.ts                              NICHT anfassen
```

### Dateiname-Logik

```
PraxisKürzel = erste 3 Großbuchstaben des Praxisnamens
               Beispiel: "Zahnzentrum Warendorf" → "WAR"
               Fallback: "PRX" wenn Praxisname fehlt

Kanal        = "Blog" | "Newsletter" | "Social" | "Kalender"

MonatJahr    = "Apr2027" (Monat auf Deutsch, 3 Buchstaben + Jahr 4-stellig)

Version      = "v1" (initial; inkrement bei Re-Export — spätere Implementierung)
```

### Acceptance Checklist

- [ ] ZIP enthält Dateien mit Format `[Kürzel]_[Kanal]_[MonatJahr]_v1.[ext]`
- [ ] Sonderzeichen im Praxisnamen werden entfernt (nur A–Z, keine Umlaute)
- [ ] Leerer Praxisname → Fallback "PRX"
- [ ] Unit-Test: `deriveFilePrefix('Zahnzentrum Warendorf')` → `'WAR'`

### Commit-Message

```
feat(export): Dateinamen-Konvention [Kürzel]_[Kanal]_[MonatJahr]_v[N] (Slice 9)
```

---

## Slice D — Blog-Gliederungsschritt (Slice 13)

**Aufwand:** ~1–2 Tage
**Anforderung:** FA-KI-04 — Blog-Gliederung als separater Schritt vor Volltext

### Was fehlt laut Roadmap

Aktuell generiert die Pipeline direkt den Blog-Volltext ohne Gliederungsschritt.
FA-KI-04 fordert: erst Gliederung (H1, H2-Struktur, ~200 Wörter), dann nach
impliziter Bestätigung den Volltext. Da kein Feedback-Loop eingebaut ist:
Gliederung wird automatisch als Zwischenschritt generiert und sofort weiterverwendet.

### Scope

**IN:**
```
lib/generation/pipeline.ts                      MOD — blog-outline Schritt vor blog-text
lib/generation/texts.ts                         MOD — generateBlogOutline() Funktion
prompts/blog-outline.yaml                       NEU — Gliederungs-Prompt
lib/generation/types.ts                         MOD — TextResults um blogOutline erweitern
```

**OUT:**
```
prompts/blog.yaml                               NICHT anfassen (Volltext-Prompt bleibt)
ThemenItem-Schema                               NICHT anfassen
Newsletter/Social-Generation                    NICHT anfassen
```

### Gliederungs-Prompt Anforderungen (`prompts/blog-outline.yaml`)

- Input: Praxisname, Fachgebiet, SEO-Titel, Keyword, PAA-Fragen, Positionierungsdokument
- Output: H1 + 3–5 H2-Überschriften + je 1 Satz Beschreibung
- Umfang: ~200 Wörter
- Kein Volltext — nur Struktur
- HWG-Check: keine unzulässigen Formulierungen in H-Tags

### Pipeline-Integration

```
Aktuell: themes → [blog-text] → newsletter → social
Neu:     themes → [blog-outline] → [blog-text (mit outline als Kontext)] → newsletter → social
```

`blog-text`-Prompt bekommt die Gliederung als zusätzlichen Kontext übergeben.
CostEntry für `blog-outline` separat loggen (Step: `'blog-outline'`).

### Acceptance Checklist

- [ ] `prompts/blog-outline.yaml` vorhanden, kein Prompt-String im TypeScript
- [ ] Pipeline hat `blog-outline` als eigenständigen Schritt in `completedSteps`
- [ ] Blog-Volltext nutzt Gliederung als Kontext
- [ ] CostEntry für outline-Step in DB
- [ ] Blog-Text-Qualität nicht schlechter als vorher (manuell prüfen mit Testpraxis)
- [ ] SSE-Stream zeigt `blog-outline` als Step-Event

### Commit-Message

```
feat(generation): Blog-Gliederungsschritt vor Volltext (FA-KI-04, Slice 13)
```

---

## Slice E — Pipeline: Canva-Context-Injektion

**Aufwand:** ~0,5 Tage
**Anforderung:** Canva-Ordner-Assets als Kontext in Generierung einbinden

### Was fehlt laut Roadmap

`canva_loaded`-Schritt in der Pipeline ist verdrahtet aber der Canva-Kontext
wird nicht tatsächlich an die KI-Prompts übergeben.

### Scope

**IN:**
```
lib/generation/pipeline.ts                      MOD — canvaContext aus canva_loaded übergeben
lib/generation/texts.ts                         MOD — canvaContext als optionalen Parameter
lib/generation/themes.ts                        MOD — canvaContext als optionalen Parameter
lib/canva/client.ts                             MOD — getFolderAssets() Rückgabewert prüfen
```

**OUT:**
```
Canva OAuth-Flow (Slice 17)                     NICHT anfassen
prompts/*.yaml                                  NICHT anfassen (Kontext wird inline übergeben)
```

### Exploration zuerst

```powershell
# Was gibt getFolderAssets() zurück?
Get-Content lib/canva/client.ts

# Wie wird canva_loaded aktuell behandelt?
Select-String "canva_loaded\|canvaContext\|canvaFolder" lib/generation/pipeline.ts
```

### Acceptance Checklist

- [ ] Wenn `project.canvaFolderId` gesetzt: Asset-Liste wird aus Canva geladen
- [ ] Wenn Canva-API nicht erreichbar: Fallback auf leeren Kontext (kein Hard-Fail)
- [ ] Canva-Kontext wird an `generateThemes()` und `generateBlogText()` übergeben
- [ ] Kein Canva-API-Key im Frontend oder in Logs

### Commit-Message

```
feat(pipeline): Canva-Context-Injektion in Generierungspipeline verdrahtet
```

---

## Abschluss-Validation (nach allen 5 Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit     # → 0 Fehler

# Alle Tests grün
pnpm test                                         # → Alle PASS

# Keine neuen console.* in lib/
Select-String "console\.(log|warn|error)" lib -Recurse |
  Where-Object { $_.Path -notmatch "scripts/" }
# → Zero Treffer

# Keine neuen catch {} (stille Fehler)
Select-String "catch\s*\(\w+\)\s*\{\s*\}" lib,app/api -Recurse
# → Zero Treffer

# Roadmap aktualisiert
Select-String "Slice 16.*✅\|Slice 4.*✅\|Slice 9.*✅\|Slice 13.*✅" docs/roadmap.md
# → Treffer für jeden abgeschlossenen Slice

# CHANGELOG enthält alle 5 Slice-Einträge
Select-String "Slice 16\|Slice 4.*FA-F-11a\|Slice 9.*Dateiname\|FA-KI-04\|canva_loaded" CHANGELOG.md
# → 5 Treffer
```

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT PHASE-1-RESTARBEITEN ABSCHLUSSBERICHT
=============================================

Sprint: Phase-1-Restarbeiten — 5 Slices
Abgeschlossen: 2026-05-14

SLICES:
  A Slice 16 (Auth):             [x] DONE — Commit: 89d8185
  B Slice 4 (API-Keys):          [x] DONE — Commit: 4be7a65
  C Slice 9 (Export-Dateiname):  [x] DONE — Commit: 62f6c19
  D Slice 13 (Blog-Gliederung):  [x] DONE — Commit: b749a01
  E Pipeline (Canva-Context):    [x] DONE — Commit: 36461b3

DRIFT (Abweichungen vom Prompt):
  - canva/client.ts: Funktion heißt listFolderAssets() statt getFolderAssets() — direkt verwendet
  - praxisKuerzel(): Spec "erste 3 Großbuchstaben" als "erstes signifikantes Wort" implementiert;
    Titel (Dr, Prof) + Gattungsbegriffe (Praxis, Zahnarzt) werden übersprungen — 7 Unit-Tests bestätigt
  - AES-Test fix: pre-existing Regression aus Sprint 3 (Format-Änderung v1: nicht im Test reflektiert),
    im gleichen Zug behoben — Commit 09ef07a

CHECKS (nach allen Commits):
  TypeScript 0 Fehler:           [x]
  Alle Tests grün:               [x] 29/29 PASS (6 Test-Dateien)
  Keine neuen console.*:         [x]
  Keine neuen catch {}:          [x]
  Roadmap aktualisiert:          [x]
  CHANGELOG aktuell:             [x]

═══════════════════════════════════════════════
[OK] PHASE-1-RESTARBEITEN ABGESCHLOSSEN
▶ Nächste Priorität: Phase-2-Backlog (roadmap.md — Slices 6, 8, 7, 11a, 17, 18, 19)
  Nächster Sprint: sprint-p2a-editor-chat.md (Slice 6 + 8, Text-Editor + Chat)
═══════════════════════════════════════════════
```
