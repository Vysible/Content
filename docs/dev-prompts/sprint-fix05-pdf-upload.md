# Sprint FIX-05 — PDF/DOCX-Upload für Positionierungsdokument (FA-F-05a)

## Kontext

`components/wizard/Step3Context.tsx` zeigt bereits ein Upload-UI, lässt aber nur `.txt` und `.md` zu.
PDF und DOCX werden mit `alert('PDF/DOCX-Import kommt in einem späteren Update.')` abgeblockt.
Der typische Agentur-Workflow verwendet Word-Dokumente als Positionierungs-Briefings.

## Ziel

Datei-Upload für `.pdf` und `.docx` mit serverseitiger Text-Extraktion.
Extrahierter Text wird in das bestehende `positioningDocument`-Textfeld übernommen.

## Neue Abhängigkeiten

```bash
pnpm add pdfjs-dist mammoth
```

`pdfjs-dist` → PDF-Text-Extraktion (Node.js-fähig)
`mammoth` → DOCX-Text-Extraktion

## Zu erstellende/ändernde Dateien

### NEU: `app/api/projects/parse-document/route.ts`

```
POST multipart/form-data { file: File }

Validierung:
- Content-Type muss application/pdf oder application/vnd.openxmlformats... sein
- Max 10 MB (Prüfung via Content-Length oder Buffer-Größe)
- requireAuth() am Anfang

Logik:
- .pdf  → pdfjs-dist: alle Seiten extrahieren, Text concat mit \n\n
- .docx → mammoth.extractRawText({ buffer }) → value
- .txt/.md → Buffer.toString('utf-8')

Response: { text: string, truncated: boolean, originalLength: number }

Truncation:
- MAX_CHARS = 16_000 (≈4.000 Token)
- Wenn text.length > MAX_CHARS: text = text.slice(0, MAX_CHARS), truncated = true
```

### ÄNDERN: `components/wizard/Step3Context.tsx`

```
1. Accept-Attribut: .txt .md .pdf .docx
2. handleFileUpload:
   - .txt und .md → bestehende FileReader-Logik (unverändert)
   - .pdf und .docx → FormData POST an /api/projects/parse-document
     → Ladezustand (Spinner) während Upload
     → Bei Erfolg: onChange({ positioningDocument: text })
     → Bei truncated === true: Toast/Hinweis "Dokument wurde auf ~4.000 Tokens gekürzt"
   - Fehler (>10MB, Netzwerk): Error-Toast, kein Upload
3. Upload-Hinweistext: "TXT, MD, PDF oder DOCX hochladen (max. 10 MB)"
```

## Akzeptanzkriterien

- [ ] PDF hochladen → extrahierter Text erscheint im Textarea
- [ ] DOCX hochladen → extrahierter Text erscheint im Textarea
- [ ] TXT/MD-Upload weiterhin funktional (Regression)
- [ ] Datei > 10 MB → Fehler-Toast, kein Upload, kein API-Call
- [ ] Text > 16.000 Zeichen → Truncation-Hinweis erscheint
- [ ] `alert()`-Aufruf im Code ist vollständig entfernt
- [ ] Route erfordert Auth (`requireAuth()`)
- [ ] TypeScript strict: keine `any`-Typen

## Stop-Conditions

- Keine Speicherung der Datei im Dateisystem oder DB — nur extrahierter Text
- Keine Änderungen an `lib/ai/context-builder.ts` oder Pipeline
- Keine Änderungen am `positioningDocument`-Datenbankfeld
