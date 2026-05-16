# Sprint FIX-05 — PDF/DOCX-Upload für Positionierungsdokument (FA-F-05a)

**Projekt:** Vysible  
**Sprint:** FIX-05  
**Format:** Tier 1  
**Abhängigkeit:** FIX-04 ✅  
**Anforderungen:** FA-F-05a (Audit 2026-05-16 Schwere 2)  
**Geschätzte Dauer:** ~1 Tag

> **Ziel:** `components/wizard/Step3Context.tsx` zeigt bereits ein Upload-UI, lässt aber nur `.txt`
> und `.md` zu. PDF und DOCX werden mit `alert('PDF/DOCX-Import kommt in einem späteren Update.')`
> abgeblockt. Der typische Agentur-Workflow verwendet Word-Dokumente als Positionierungs-Briefings.
> Dieser Sprint ergänzt serverseitige Text-Extraktion via `pdfjs-dist` und `mammoth`, bindet sie
> in die Upload-Komponente ein und entfernt den `alert()`-Stub vollständig.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies und führe `docs/dev-prompts/Pre_Slice_Validation.md` vollständig aus
(Phase 0 — PSR + Phase 1 — technische Gates).
Bei FAIL in einer Phase: SOFORT STOP. Kein weiterer Befehl.
Bei GO: Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# 1. Bestehende Upload-Komponente vollständig lesen
Get-Content components/wizard/Step3Context.tsx

# 2. Prüfen ob parse-document-Route bereits existiert
Get-ChildItem app/api/projects/parse-document -ErrorAction SilentlyContinue

# 3. alert()-Stub und accept-Attribut im Code prüfen
Select-String "alert\(|\.txt|\.md|accept=" components/wizard/Step3Context.tsx -ErrorAction SilentlyContinue

# 4. pdfjs-dist und mammoth bereits installiert?
Select-String "pdfjs-dist|mammoth" package.json

# 5. getServerSession-Muster aus bestehender Projekte-Route übernehmen
Select-String "getServerSession|requireAuth" app/api/projects -Recurse |
  Select-Object Path, LineNumber, Line | Select-Object -First 5

# 6. Forge-Abweichungen: stille Catches in Step3Context
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" components/wizard/Step3Context.tsx -ErrorAction SilentlyContinue

# 7. Bestehende parse/extract-Logik im Codebase?
Select-String "parse-document|extractRawText|pdfjs" lib,app -Recurse -i |
  Select-Object Path, LineNumber, Line | Select-Object -First 10

# 8. Wie wird positioningDocument in Step3Context aktuell befüllt?
Select-String "positioningDocument|onChange|FileReader" components/wizard/Step3Context.tsx
```

**Bekannte Lücken (Stand 2026-05-16, aus Audit + FA-F-05a):**

| Datei | Lücke | Priorität |
|---|---|---|
| `components/wizard/Step3Context.tsx` | `alert()` blockiert PDF/DOCX — kein API-Call | MUSS |
| `app/api/projects/parse-document/route.ts` | Datei existiert nicht | MUSS |
| `package.json` | `pdfjs-dist`, `mammoth` nicht installiert | MUSS (vor Sub-Slice A) |

---

## CRITICAL: Self-review Checklist

- [ ] `parse-document`-Route prüft Auth via `getServerSession` — kein 401-Bypass möglich
- [ ] Content-Type-Validierung: nur `application/pdf` und `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- [ ] File-Size-Prüfung **vor** Buffer-Allokation (max. 10 MB, DoS-Schutz)
- [ ] Kein Dateiinhalt / PII in Logs — nur Metadaten (Größe, Typ)
- [ ] Kein stiller Catch: jeder `catch`-Block loggt (`logger.error`) oder re-throwed (Forge §3a)
- [ ] Client-seitiger Catch in Step3Context: `console.warn('[Vysible] …', err)` — kein `catch(() => {})`
- [ ] TypeScript strict: keine `any`-Typen in neuer API-Route und angepasster Komponente
- [ ] `alert()`-Aufruf vollständig entfernt (Select-String-Validation am Ende bestätigt)
- [ ] TXT/MD-Upload: Regression geprüft — bestehende FileReader-Logik unverändert
- [ ] Truncation-Hinweis bei `truncated === true` in der UI implementiert
- [ ] CHANGELOG.md in diesem Commit aktualisiert

---

## Sub-Slice A — API-Route `parse-document`

**Aufwand:** ~2 Stunden  
**Scope:** Neue POST-Route, die PDF/DOCX/TXT/MD als Multipart-Upload entgegennimmt und Text extrahiert.

### IN

```
package.json                                NEU — pdfjs-dist + mammoth (pnpm add)
app/api/projects/parse-document/route.ts   NEU — POST multipart/form-data
```

### OUT

```
components/                                NICHT anfassen (Sub-Slice B)
lib/ai/context-builder.ts                  NICHT anfassen
prisma/schema.prisma                       NICHT anfassen
```

### A1 — Abhängigkeiten installieren

```bash
pnpm add pdfjs-dist mammoth
```

### A2 — Route-Signatur + Auth

```typescript
// POST /api/projects/parse-document
// Content-Type: multipart/form-data { file: File }
// Response: { text: string, truncated: boolean, originalLength: number }

const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### A3 — Extraktion + Truncation

```typescript
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CHARS = 16_000;                 // ≈ 4.000 Token

// Content-Type prüfen vor Buffer-Allokation
// .pdf  → pdfjs-dist: alle Seiten extrahieren, concat mit \n\n
// .docx → mammoth.extractRawText({ buffer }) → .value
// .txt/.md → Buffer.toString('utf-8')

// Truncation:
// if (text.length > MAX_CHARS): text = text.slice(0, MAX_CHARS), truncated = true
```

### A4 — Error-Handling (kein stiller Catch)

```typescript
// Server-Code — logger aus lib/utils/logger nutzen:
} catch (err: unknown) {
  logger.error({ err }, '[Vysible] parse-document: Extraktion fehlgeschlagen')
  return NextResponse.json({ error: 'Extraktion fehlgeschlagen' }, { status: 500 })
}
```

### Acceptance Checklist

- [ ] `POST /api/projects/parse-document` gibt `{ text, truncated, originalLength }` zurück
- [ ] PDF-Extraktion: alle Seiten, Text korrekt verkettet
- [ ] DOCX-Extraktion: `mammoth.extractRawText` korrekt aufgerufen
- [ ] Datei > 10 MB → HTTP 413 oder Fehler-Response (kein Buffer-Überlauf)
- [ ] Falscher Content-Type → HTTP 400
- [ ] Kein Auth → HTTP 401
- [ ] TypeScript: 0 Fehler

### Commit-Message

```
feat(wizard): parse-document API-Route für PDF/DOCX-Extraktion (FIX-05 Sub-A)
```

---

## Sub-Slice B — `Step3Context.tsx` anpassen

**Aufwand:** ~1 Stunde  
**Scope:** Upload-Komponente um PDF/DOCX-Handling erweitern, `alert()` entfernen.

### IN

```
components/wizard/Step3Context.tsx         MOD — accept + handleFileUpload + alert() entfernen
```

### OUT

```
app/api/projects/parse-document/           NICHT anfassen (Sub-Slice A)
lib/                                        NICHT anfassen
```

### B1 — accept-Attribut + Hinweistext

```typescript
// VORHER: accept=".txt,.md" (oder ähnlich)
// NACHHER:
accept=".txt,.md,.pdf,.docx"

// Hinweistext: "TXT, MD, PDF oder DOCX hochladen (max. 10 MB)"
```

### B2 — handleFileUpload — PDF/DOCX-Zweig

```typescript
// .txt/.md → UNVERÄNDERT (bestehende FileReader-Logik)
// .pdf/.docx:
const formData = new FormData()
formData.append('file', file)
setIsUploading(true)
try {
  const res = await fetch('/api/projects/parse-document', { method: 'POST', body: formData })
  const data = await res.json()
  onChange({ positioningDocument: data.text })
  if (data.truncated) {
    // Toast/Hinweis: "Dokument wurde auf ~4.000 Tokens gekürzt"
  }
} catch (err: unknown) {
  console.warn('[Vysible] parse-document Fehler:', err)
  // Error-Toast anzeigen, kein State-Update
} finally {
  setIsUploading(false)
}
```

### B3 — alert() entfernen

```typescript
// VOLLSTÄNDIG ENTFERNEN:
// alert('PDF/DOCX-Import kommt in einem späteren Update.')
```

### Acceptance Checklist

- [ ] PDF hochladen → extrahierter Text erscheint im `positioningDocument`-Textfeld
- [ ] DOCX hochladen → extrahierter Text erscheint im `positioningDocument`-Textfeld
- [ ] TXT/MD-Upload weiterhin funktional (keine Regression)
- [ ] Datei > 10 MB → Fehler-Toast, kein API-Call
- [ ] `truncated === true` → Kürzungs-Hinweis sichtbar
- [ ] `alert()`-Aufruf ist nicht mehr im Code vorhanden
- [ ] Spinner während Upload sichtbar

### Commit-Message

```
feat(wizard): PDF/DOCX Upload in Step3Context + alert() entfernt (FIX-05 Sub-B)
```

---

## Abschluss-Validation (nach allen Sub-Slices)

```powershell
# 1. TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit
# → Keine Ausgabe

# 2. alert()-Stub vollständig entfernt
Select-String "alert\(" components/wizard/Step3Context.tsx
# → Zero Treffer

# 3. Neue Route existiert und hat Auth-Check
Select-String "getServerSession" app/api/projects/parse-document/route.ts
# → Mindestens 1 Treffer

# 4. accept-Attribut korrekt erweitert
Select-String "\.pdf|\.docx" components/wizard/Step3Context.tsx
# → Mindestens 1 Treffer

# 5. Kein stiller Catch in neuen / geänderten Dateien
Select-String "catch\s*\(\(\)\s*=>\s*\{\s*\}\)" app/api/projects/parse-document/route.ts, components/wizard/Step3Context.tsx -ErrorAction SilentlyContinue
# → Zero Treffer

# 6. Neue Abhängigkeiten in package.json
Select-String "pdfjs-dist|mammoth" package.json
# → 2 Treffer

# 7. Tests grün
pnpm test --run
```

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| Datei-Speicherung im Dateisystem oder DB | Nur Text-Extraktion — kein persistenter Upload |
| Änderungen an `lib/ai/context-builder.ts` oder Pipeline | Kein Einfluss auf KI-Logik |
| Änderungen am `positioningDocument`-Datenbankfeld | Schema bleibt unverändert |
| Image-Extraktion aus PDFs | Nur Text-Inhalt für Positionierungsdokument relevant |
| DOCX-Formatierung (Bold, Überschriften) | Nur Plaintext benötigt |

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR ein Commit vorgeschlagen
> oder ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md`: FIX-05 auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint FIX-05)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: FIX-05-Eintrag aus Audit-Schwere-2 schließen |
| 3 | Sprint-Prompt archivieren | `Move-Item docs/dev-prompts/sprint-fix05-pdf-upload.md docs/dev-prompts/archive/` |
| 4 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]` |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT FIX-05 ABSCHLUSSBERICHT
===============================

Sprint: FIX-05 — PDF/DOCX-Upload für Positionierungsdokument (FA-F-05a)

SUB-SLICES:
  A parse-document API-Route:          [ ] DONE — Commit: <hash>
  B Step3Context.tsx angepasst:        [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:        [ ]
  Alle Tests grün:            [ ] x/x PASS
  alert() entfernt:           [ ]
  Kein stiller Catch:         [ ]
  TXT/MD-Regression OK:       [ ]
  CHANGELOG aktuell:          [ ]

═══════════════════════════════════════════════
[OK] FIX-05 ABGESCHLOSSEN
▶ Nächste Priorität: Sprint FIX-06 (AES-256-GCM Versions-Präfix — ADR-003)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-fix05-pdf-upload.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
