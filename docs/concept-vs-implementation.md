# Konzept vs. Implementierung — Vysible (`Vys_MarkMng`)

> **Referenzdokument:** KI_Content_Plattform_Anforderungen_v6.0 (Mai 2026)
> **Analysedatum:** 2026-05-14
> **Reviewer:** KI-Architekt (Cursor Agent)
> **Status:** Nur Bericht — keine Änderungen vorgenommen

---

## Inhaltsverzeichnis

1. [Gesamtbewertung](#1-gesamtbewertung)
2. [Slice-für-Slice-Analyse](#2-slice-für-slice-analyse)
3. [NFA-Compliance](#3-nfa-compliance)
4. [Kritische Lücken nach Schwere](#4-kritische-lücken-nach-schwere)
5. [Qualitätsbewertung der umgesetzten Features](#5-qualitätsbewertung-der-umgesetzten-features)
6. [Entscheidungsempfehlung: Weitermachen oder Neustart?](#6-entscheidungsempfehlung)

---

## 1. Gesamtbewertung

Das Konzeptdokument v6.0 definiert **22 Slices über 4 Phasen**. Die aktuelle Codebasis setzt davon **keinen einzigen Slice vollständig um**, aber **15 Slices sind zu 40–85% implementiert**. Der Kern — die KI-Generation-Pipeline — funktioniert. Die Compliance-, Governance- und Infrastruktur-Schicht fehlt fast vollständig.

| Phase | Slices | Durchschnittl. Umsetzung |
|---|---|---|
| Phase 0 — Foundation | Slice 16 | ~55 % |
| Phase 1 — Core MVP | Slices 1–3b, 4, 5–9, 11–13 | ~68 % |
| Phase 2 — Collaboration & Integration | Slices 6–8, 10, 11a, 17–19 | ~47 % |
| Phase 3 — Quality & Scale | Slices 14–15, 20 | ~30 % |
| **Gesamt P1-Anforderungen** | | **~60 %** |
| **Gesamt P2-Anforderungen** | | **~38 %** |
| **Nicht-funktionale Anforderungen** | | **~40 %** |

**Interpretation:** Das Projekt befindet sich am Ende von Phase 1 / Beginn von Phase 2. Der fehlende Teil von Phase 1 betrifft primär Compliance und Infrastruktur-Härte (Slice 20, NFA-17, NFA-18), nicht fehlende Produktivfeatures.

---

## 2. Slice-für-Slice-Analyse

### Bewertungsskala

| Symbol | Bedeutung | Umsetzung |
|---|---|---|
| ✅ | Umgesetzt | ≥80 % der Anforderungen des Slices |
| ⚠️ | Teilweise | 40–79 % |
| ❌ | Fehlt | <40 % oder komplett fehlend |

---

### Slice 16 — Auth & Nutzermanagement (FA-F-28 bis FA-F-32) — ⚠️ 55 %

**Umgesetzt:**
- ✅ NextAuth.js v5 Credentials Provider — korrekte Implementierung gemäss NFA-07
- ✅ Login-Maske (app/(auth)/login/page.tsx)
- ✅ Session-Management (JWT)
- ✅ Rollen: ADMIN / STAFF in Schema + Session-Typ-Erweiterung
- ✅ Geschützte Routen via Middleware mit korrektem Matcher
- ✅ Passwort ändern (Settings → Password)

**Fehlt:**
- ❌ **FA-F-28:** Passwort-Vergessen-Link mit E-Mail-Reset — nicht implementiert
- ❌ **FA-F-28:** 'Angemeldet bleiben' (30-Tage-Option) — fehlt
- ❌ **FA-F-29:** Admin-UI für Nutzerverwaltung (Nutzer anlegen/deaktivieren/Passwort-Reset auslösen) — kein UI vorhanden
- ❌ **FA-F-30:** Automatischer Logout nach 30 Min. Inaktivität — nicht konfiguriert
- ❌ **FA-F-31:** Review-/Freigabe-Workflow-Modus (simple/complete) — **komplett fehlend** im Schema und UI
- ❌ **FA-F-32:** Audit-Log UI (Aktivitäten-Tab pro Projekt) — **komplett fehlend**
- ❌ **FA-B-11:** Audit-Log Backend (`audit_log`-Tabelle) — **nicht im Prisma-Schema**

> **Kritische Lücke:** FA-F-31 und FA-B-11 fehlen vollständig. Der Review-Workflow ist für den Betrieb im medizinischen Marketing-Umfeld eine P1-Anforderung — ohne ihn ist kein geregelter Freigabeprozess möglich.

---

### Slice 1 — Projekt-Dashboard (FA-F-01 bis FA-F-04) — ⚠️ 70 %

**Umgesetzt:**
- ✅ Dashboard mit Projektliste, Erstelldatum, Status, Kanäle
- ✅ 3-Schritt-Wizard (NewProjectWizard mit Steps)
- ✅ URL-Validierung (/api/projects/validate-url)
- ✅ Grundlegendes CRUD (erstellen, archivieren)

**Fehlt:**
- ❌ **FA-F-01:** Stat-Kacheln (Artikel generiert, Newsletter, Social Posts) — unklar ob implementiert
- ❌ **FA-F-01:** Canva-Verbindung: Ja/Nein im Dashboard
- ❌ **FA-F-04:** 30-Tage-Papierkorb mit Cleanup-Job — nur direktes Löschen

---

### Slice 2 — URL + alle Inputs (FA-F-05a–05c, FA-KI-00–00d) — ⚠️ 65 %

**Umgesetzt:**
- ✅ robots.txt-Check (checkRobotsRemote)
- ✅ Positionierungsdokument als Feld im Schema + Pipeline-Integration
- ✅ Themen-Pool-Feld
- ✅ Keyword-Array, Keywords als Kontext injiziert
- ✅ Context-Builder mit Truncation-Logik (4.000-Token-Grenze)

**Fehlt:**
- ❌ **FA-F-05a:** File-Upload (PDF/DOCX/TXT) für Positionierungsdokument — derzeit nur Textfeld, kein echter Datei-Upload mit Extraktion
- ❌ **FA-F-05b:** Themen-Pool als Upload-Datei (DOCX/CSV) — nur Textfeld
- ❌ **FA-KI-00b:** UI-Indikator bei Truncation ('Dokument wurde gekürzt') — Logik ist da, aber kein UI-Signal
- ❌ **FA-F-06:** Praxis-Kategorie als strukturiertes Dropdown (Zahnarzt/KFO/Gynäkologie/…) — nur freier Textstring

---

### Slice 3a — SSE-Infrastruktur (FA-F-08–10, NFA-06) — ⚠️ 65 %

**Umgesetzt:**
- ✅ SSE-Endpoint (/api/generate/stream/[jobId])
- ✅ Alle 8 Event-Typen: scrape_done, positioning_injected, canva_loaded, pool_loaded, keywords_loaded, themes_done, plans_done, texts_done
- ✅ Retry ab fehlgeschlagenem Schritt (retryPipeline)
- ✅ useGenerationStream.ts Hook im Frontend

**Fehlt:**
- ❌ **NFA-06:** Exponentieller Backoff, max. 3 Retries auf externen Calls — fehlt auf allen externen IO-Calls
- ❌ **NFA-17:** Worker/Queue-Architektur (DB-basierter Job-Runner) — **in-memory** EventEmitter-Map, nicht DB-persistiert
- ❌ **NFA-18:** Pipeline-State-Persistenz in DB (`generation_jobs`-Tabelle) — bei Browser-Reload geht der Job-State verloren
- ⚠️ **FA-F-09:** Polling-Fallback alle 3 Sekunden — Hook existiert, Fallback-Verhalten unklar

> **Kritische Lücke:** NFA-17 + NFA-18 sind architektonische Anforderungen. Ein Browser-Reload während einer laufenden Generierung verliert den gesamten Job-Status — kein Recovery möglich.

---

### Slice 3b — Prozess-Orchestrierung (FA-F-07, NFA-14) — ⚠️ 70 %

**Umgesetzt:**
- ✅ Generate-Button mit Vorprüfung (API-Key vorhanden?)
- ✅ Rate-Limiting auf /api/generate/start
- ✅ Pipeline-Start mit Job-Erstellung

**Fehlt:**
- ❌ **NFA-14:** Max. 3 gleichzeitige Generierungsvorgänge + Warteschlangen-Anzeige — In-Memory-Counter, kein echter Queue-Mechanismus

---

### Slice 4 — API-Key-Manager (FA-F-11–11d, NFA-03, NFA-09) — ⚠️ 55 %

**Umgesetzt:**
- ✅ Named API Keys AES-256-GCM verschlüsselt
- ✅ Hinzufügen, Test-Call, Deaktivieren, Löschen
- ✅ Provider-Enum: ANTHROPIC, OPENAI, DATASEO, KLICKTIPP, WORDPRESS, HEDY, CANVA
- ✅ Model-Feld je Key (FA-F-11b)
- ⚠️ NFA-09: /api/generate/estimate existiert — ob im UI sichtbar ist unklar

**Fehlt:**
- ❌ **FA-F-11a:** Pro Projekt aktiver Key auswählbar — **nicht im Schema.** `findFirst({ where: { provider, active: true } })` nimmt immer den ersten aktiven Key; kein Project-to-Key-Mapping
- ❌ **FA-F-11c:** Globale Standard-Keys für neue Projekte separat konfigurierbar
- ❌ **FA-F-11d:** Social-Media-Token-Manager UI — Meta-Token liegt als WORDPRESS-Provider-Hack vor (kein UI), LinkedIn ähnlich

---

### Slice 5 — Ergebnisansicht (FA-F-12–15) — ⚠️ 60 %

**Umgesetzt:**
- ✅ Tab-Interface für Ergebnisse (ResultsTabs)
- ✅ Rich-Text-Editor via Tiptap (FA-F-14)
- ⚠️ Redaktionsplan-Tabellen vorhanden

**Fehlt:**
- ❌ **FA-F-13:** Artefakt-Status entsprechend Review-Workflow-Modus (FA-F-31) — nicht verbunden, da FA-F-31 fehlt
- ❌ **FA-F-13:** Draft-Status-Spalte in Social-Media-Tabelle
- ❌ **FA-F-13:** HWG-Flag sichtbar und mit Compliance-Gate verbunden
- ❌ **FA-F-15:** Server-Autosave nach 5 Sekunden mit Indikator — unklar implementiert

---

### Slice 6 — Text-Editor (FA-F-14, FA-F-15) — ⚠️ 65 %

**Umgesetzt:**
- ✅ Tiptap mit H2/H3, Fett, Kursiv, Listen
- ✅ EditorView-Komponente

**Fehlt:**
- ❌ Autosave-Indikator ('Gespeichert / Speichern... / Fehler')
- ❌ Blog-Gliederung als editierbarer Zwischenschritt (FA-KI-04)

---

### Slice 7 — Kalender-Ansicht (FA-F-16) — ⚠️ 50 %

**Umgesetzt:**
- ✅ Calendar-Page vorhanden (app/(dashboard)/projects/[id]/calendar/page.tsx)
- ✅ ContentCalendar-Komponente

**Fehlt:**
- ❌ **FA-F-16:** Drag & Drop — unklar/unbekannt
- ❌ Draft-Status-Farbe im Kalender

---

### Slice 8 — Chat + Versionen (FA-F-18–22) — ⚠️ 50 %

**Umgesetzt:**
- ✅ ChatPanel-Komponente
- ✅ /api/projects/[id]/chat API-Route

**Fehlt:**
- ❌ **FA-F-19:** Kontext-Binding (aktives Artefakt automatisch als Kontext-Header) — unklar
- ❌ **FA-F-20:** Max. 10 Versionen pro Artefakt — nicht im Schema
- ❌ **FA-F-21:** Feedback-Chips (Kürzer / Formaler / Lockerer / …) — unklar
- ❌ **FA-F-22:** Chat-History persistent serverseitig — unklar ob in DB gespeichert

---

### Slice 9 — Export (FA-F-23–27) — ⚠️ 70 %

**Umgesetzt:**
- ✅ ZIP-Export (lib/export/zip)
- ✅ DOCX-Export (lib/export/docx)
- ✅ PDF-Export (lib/export/pdf)
- ✅ XLSX-Export (lib/export/xlsx)
- ✅ HTML-Export
- ✅ Einzelexporte separat möglich

**Fehlt:**
- ❌ **FA-F-27:** Dateinamen-Konvention `[PraxisKürzel]_[Kanal]_[MonatJahr]_v[N].[ext]` — unklar ob implementiert
- ❌ **FA-F-25:** PDF-Timeline-Präsentationsformat

---

### Slice 10 — Kunden-Sharing (FA-F-26) — ✅ 80 %

**Umgesetzt:**
- ✅ ShareLink-Modell mit Token und passwordHash
- ✅ /api/projects/[id]/share zum Erstellen
- ✅ /share/[token] mit ShareAccess.tsx
- ✅ /api/praxis/* für Praxis-Portal, Kommentare, Freigabe

---

### Slice 11 — Scraper-Service — ✅ 85 %

**Umgesetzt:**
- ✅ Playwright-Microservice (services/playwright/)
- ✅ robots.txt-Check
- ✅ Tiefenbegrenzung (depth 0–2)
- ✅ Strukturierter JSON-Output (ScrapeResult)
- ✅ Timeouts (90s scrape, 10s robots)

**Fehlt:**
- ❌ **FA-B-00a:** Crawl-Rate-Limiting (2 Sekunden zwischen Requests) — unklar ob im Playwright-Service implementiert
- ❌ **FA-B-04:** Extrahierte Daten vor Generierung anzeigen und editierbar — UI fehlt

---

### Slice 11a — DataForSEO-Integration (FA-B-07–07b) — ⚠️ 40 %

**Umgesetzt:**
- ✅ DataForSEO-Client mit Autocomplete + PAA-Fragen (`lib/dataseo/client.ts`)
- ✅ Provider DATASEO im API-Key-Manager

**Fehlt:**
- ❌ Kein Frontend-UI für Keyword-Vorschläge (Review-Liste vor Generierung)
- ❌ **Resilience-Violation:** Beide `fetch`-Calls haben stille `catch {}`-Blöcke — Fehler werden verschluckt
- ❌ Keine Verbindung zur Generation-Pipeline

---

### Slice 12 — KI-Themenplanung (FA-KI-01–03) — ✅ 80 %

**Umgesetzt:**
- ✅ `generateThemes()` mit Zod-Schema-Validierung (ThemenItemSchema)
- ✅ HWG-Flag (`hwgFlag: z.enum(['gruen', 'gelb', 'rot'])`) im Schema
- ✅ Qualitätsprüfung (80% Praxisspezifität, 50% SEO-Fragen)
- ✅ themes.yaml als editierbarer Prompt
- ✅ Alle Kontext-Inputs (Positionierung, Keywords, ThemenPool, Scrape)

**Fehlt:**
- ❌ **FA-KI-01:** Max. 2 Retries bei JSON-Validierungsfehler — unklar ob implementiert

---

### Slice 13 — KI-Texte (FA-KI-04–07) — ⚠️ 70 %

**Umgesetzt:**
- ✅ Blog, Newsletter, Social Posts generiert
- ✅ YAML-Prompts (blog.yaml, newsletter.yaml, social.yaml)
- ✅ Disclaimer konfigurierbar (FA-KI-06)
- ✅ Plattform-Limits im Prompt: Instagram 200Z, Facebook 80Z, LinkedIn 700Z

**Fehlt:**
- ❌ **FA-KI-04:** Blog-Gliederung zuerst (PAA als H2) → Nutzer editiert → Volltext — Single-Pass-Generierung, kein Outline-Schritt
- ❌ **FA-KI-07:** Tonalität-Auswahl (Warm-empathisch / Sachlich-informativ / …) — nicht implementiert

---

### Slice 14 — SEO-Analyse (FA-KI-08) — ⚠️ 40 %

**Umgesetzt:**
- ✅ /api/seo/analyze Route
- ✅ lib/seo/ Modul
- ✅ SeoPanel-Komponente in Editor

**Unklar/Fehlt:**
- ❓ Keyword-Dichte-Berechnung, Meta-Description, Title-Tag — Tiefe der Implementierung unbekannt

---

### Slice 15 — Bildbriefing (FA-KI-09–11) — ⚠️ 60 %

**Umgesetzt:**
- ✅ `imageBrief` in TextResult
- ✅ image-brief.yaml Prompt
- ✅ /api/image/brief Route

**Fehlt:**
- ❌ **FA-KI-09:** HWG §11-Prüfung im Bildbriefing — unklar automatisiert
- ❌ **FA-KI-10:** DALL-E 3 Prompt-Generierung (P2)
- ❌ **FA-KI-11:** Unsplash-API-Links als Alternative (P2)

---

### Slice 17 — Canva-Integration (FA-B-08–08d) — ⚠️ 35 %

**Umgesetzt:**
- ✅ `lib/canva/client.ts`: Asset-Listing aus Canva-Ordner (`listFolderAssets`)
- ✅ `buildCanvaContext()` für KI-Prompt-Kontext
- ✅ `canvaFolderId` im Project-Schema

**Fehlt:**
- ❌ **FA-B-08:** Vollständiger OAuth 2.0-Flow — derzeit nur simple Token-Speicherung im API-Key-Manager, kein OAuth-Redirect-Flow
- ❌ **FA-B-08a:** Ordner-Such-UI (Canva-Ordner nach Praxisname durchsuchen)
- ❌ **FA-B-08c:** Canva-Asset-Kontext wird NICHT in die Generation-Pipeline injiziert (pipeline.ts ruft `buildCanvaContext()` nicht auf)
- ❌ **FA-F-11d:** Social-Media-Token-Manager-UI für Canva-Token

---

### Slice 18 — Social-Media-Drafts (FA-B-09–09c) — ⚠️ 40 %

**Umgesetzt:**
- ✅ `lib/social/meta.ts`: Facebook Draft, Instagram Media-Container
- ✅ `lib/social/linkedin.ts`: LinkedIn UGC Post
- ✅ /api/projects/[id]/social-post Route

**Fehlt:**
- ❌ Meta-Token liegt als WORDPRESS-Provider-Hack vor (Kommentar: "Platzhalter bis META-Provider ergänzt wird")
- ❌ **FA-B-09b:** 'Als Draft posten'-Button pro Eintrag im Redaktionsplan — UI-Integration unklar
- ❌ **FA-B-09c:** Status-Tracking (Ausstehend/Hochgeladen/Freigegeben) im UI
- ❌ **FA-B-13:** Compliance-Gate: HWG-Rot-Flag blockiert Post-Button — **nicht implementiert**

---

### Slice 19 — E-Mail-Benachrichtigungen (FA-B-10–10c) — ⚠️ 45 %

**Umgesetzt:**
- ✅ `lib/email/mailer.ts` mit nodemailer
- ✅ Trigger `generation_complete` implementiert
- ✅ SMTP-Passwort AES-256 verschlüsselt

**Fehlt:**
- ❌ SMTP-Config-Hack (HEDY-Provider-Abuse) — kein eigenes `SmtpConfig`-Modell im Schema
- ❌ **FA-B-10:** SMTP-Konfiguration-UI in Einstellungen — nur via API-Key-Tabelle erreichbar
- ❌ **FA-B-10a:** Pro Projekt bis zu 5 Empfänger mit UI — rudimentär via `model`-Feld
- ❌ Nur 1 von 4 Triggern implementiert (generation_complete; draft_uploaded, published, share_approved fehlen)
- ❌ **FA-B-10c:** HTML-E-Mail — nur plain text
- ❌ Einzelne Trigger aktivierbar/deaktivierbar — nicht implementiert

---

### Slice 20 — Audit-Log + Datenisolation + Compliance-Gate — ❌ 10 %

**Umgesetzt:**
- ⚠️ Auth-Check in API-Routes (rudimentäre Isolation durch Session-Prüfung)

**Fehlt:**
- ❌ **FA-B-11:** `audit_log`-Tabelle im Prisma-Schema — **existiert nicht**
- ❌ **FA-B-11:** Alle definierten Actions (generate_start, generate_complete, artefact_edit, status_change, export, …) erzeugen keinen Log-Eintrag
- ❌ **FA-B-12:** API-seitige Datenisolation mit HTTP 403 wenn project_id nicht zur Session gehört — `/api/projects` GET gibt **alle Projekte aller User** zurück (kein User-Filter)
- ❌ **FA-F-31:** Review-/Freigabe-Workflow-Modus — **kein Feld im Schema, kein UI**
- ❌ **FA-B-13:** Compliance-Gate — HWG-Rot-Flag blockiert weder Export noch Draft-Posting technisch

> **Kritischster fehlender Slice.** Slice 20 ist P1 und adressiert medizinisch-rechtliche Compliance (HWG) sowie Datenschutz-Isolation. Ohne diesen Slice ist das System für den Produktionsbetrieb im medizinischen Marketing-Umfeld unvollständig.

---

## 3. NFA-Compliance

| NFA | Prio | Anforderung | Status | Befund |
|---|---|---|---|---|
| NFA-01 | P1 | Performance max. 3 Min., Streaming | ✅ | SSE implementiert |
| NFA-02 | P1 | Datenschutz, Datenlöschung ≤24h | ⚠️ | Deletion bei Projekt-Löschung unklar |
| NFA-03 | P1 | Envelope Encryption für Secrets | ⚠️ | API-Keys ✓; positioningDocument im Klartext im DB-Feld |
| NFA-04 | P1 | HTTPS/TLS 1.3, kein HTTP | ⚠️ | Nur in Doku erwähnt, nicht im Code erzwungen |
| NFA-05 | P1 | Docker Compose, max. 5 Befehle | ✅ | README + compose gut |
| NFA-06 | P1 | Exponentieller Backoff, max. 3 Retries | ❌ | Kein Retry auf scrapeUrl, AI-Calls, sendMail |
| NFA-07 | P1 | NextAuth.js, bcrypt ≥10 Rounds | ✅ | Korrekt (Rounds 12) |
| NFA-08 | P1 | Prompts als /prompts/*.yaml | ✅ | 6 YAML-Prompts vorhanden |
| NFA-09 | P2 | Kostenvoranschlag vor Generierung | ⚠️ | estimate-Endpoint existiert, UI-Anbindung unklar |
| NFA-11 | P1 | Strukturiertes JSON-Logging | ❌ | Nur console.log |
| NFA-12 | P1 | Browser-Kompatibilität | ✅ | Next.js + Tailwind, keine Sonderkonstrukte |
| NFA-13 | P1 | PostgreSQL ab Phase 0 | ✅ | Prisma + PostgreSQL korrekt |
| NFA-14 | P2 | Max. 3 gleichzeitige Generierungen | ⚠️ | In-Memory-Counter, kein echter Queue |
| NFA-15 | P2 | Rate-Limiting Login (10 Versuche/IP/h) | ⚠️ | Generisches Rate-Limit existiert; IP-basiert + Login-spezifisch fehlt |
| NFA-16 | P1 | Tests (Vitest + Playwright E2E) | ❌ | **0 Tests vorhanden** |
| NFA-17 | P2 | Worker/Queue-Architektur (DB-Job-Runner) | ❌ | In-Memory-Map, kein DB-Backing |
| NFA-18 | P1 | Pipeline-State Persistenz in DB | ❌ | Kein `generation_jobs`-Tabellen-Eintrag |

---

## 4. Kritische Lücken nach Schwere

### Schwere 1 — Betriebsblockierend (muss vor Produktionsbetrieb mit echten Kunden behoben sein)

| ID | Gap | Konzept-Referenz | Aufwand |
|---|---|---|---|
| G-01 | `audit_log`-Tabelle + Logging-Middleware fehlt vollständig | FA-B-11, FA-F-32 | 1–2 Tage |
| G-02 | Compliance-Gate: HWG-Rot-Flag blockiert nicht Export/Posting | FA-B-13 | 0.5 Tage |
| G-03 | Mandanten-Datenisolation: `/api/projects` GET gibt alle Projekte | FA-B-12 | 2 h |
| G-04 | NFA-18: Job-State nicht in DB persistiert — Reload verliert laufende Generierung | NFA-17, NFA-18 | 2 Tage |
| G-05 | Sicherheit: `/api/debug` unauthentifiziert, `/api/setup` gibt Passwort zurück | — | 30 min |

### Schwere 2 — Feature-Blocker (wichtige Anforderungen für vollständigen Workflow)

| ID | Gap | Konzept-Referenz | Aufwand |
|---|---|---|---|
| G-06 | Review-/Freigabe-Workflow (simple/complete) fehlt komplett im Schema+UI | FA-F-31 | 2–3 Tage |
| G-07 | Canva-Context-Injektion nicht mit Pipeline verbunden | FA-B-08c, FA-KI-00e | 0.5 Tage |
| G-08 | Pro-Projekt-API-Key-Auswahl fehlt im Schema | FA-F-11a | 1 Tag |
| G-09 | Dateinamen-Konvention [PraxisKürzel]_[Kanal]_[MonatJahr]_v[N] | FA-F-27 | 0.5 Tage |
| G-10 | Blog-Gliederung als editierbarer Zwischenschritt vor Volltext | FA-KI-04 | 1–2 Tage |
| G-11 | Admin-Nutzerverwaltung-UI fehlt | FA-F-29 | 1 Tag |

### Schwere 3 — Qualitätsmangel (hat Einfluss auf Betriebsqualität)

| ID | Gap | Konzept-Referenz | Aufwand |
|---|---|---|---|
| G-12 | Kein strukturiertes JSON-Logging (NFA-11) | NFA-11 | 1 Tag |
| G-13 | Kein exponentieller Backoff auf externe IO-Calls | NFA-06 | 1 Tag |
| G-14 | DataForSEO-Client hat 2 stille Catch-Blöcke | — | 1 h |
| G-15 | SMTP-Config-Hack (HEDY-Provider) statt eigenem Modell | FA-B-10 | 1 Tag |
| G-16 | Null Tests (NFA-16) | NFA-16 | 3–5 Tage |
| G-17 | Positionierungsdokument als Klartext-DB-Feld statt verschlüsselte Datei | NFA-03 | 1 Tag |

---

## 5. Qualitätsbewertung der umgesetzten Features

### Was gut umgesetzt ist

**KI-Generation-Pipeline (Herzstück des Systems):**  
Die Pipeline ist architektonisch korrekt. Themes → Texts → Bildbriefing als sequenzielle Steps mit SSE-Events, Retry ab fehlgeschlagenem Schritt, Zod-Schema-Validierung der KI-Ausgabe inklusive HWG-Flag und Qualitätsschwellen (80/50 %-Checks). Das ist konzeptkonform und solide.

**Crypto:**  
AES-256-GCM mit zufälligem IV für alle API-Keys. Korrekte Implementierung gemäss NFA-03 (für API-Keys). Die Schlüsselverwaltung über ENCRYPTION_SECRET ist sauber.

**Scraper:**  
Playwright-Microservice als eigener Container mit robots.txt-Prüfung, Tiefenbegrenzung und Timeout. Entspricht FA-B-01 und dem Architekturprinzip aus dem Konzept exakt.

**Export:**  
Alle fünf Formate implementiert (DOCX, PDF, XLSX, HTML, ZIP). Entspricht FA-F-23–24.

**Sharing:**  
ShareLink mit bcrypt-Passwort-Hash und Ablaufdatum. Praxis-Portal mit Kommentar-Thread. Solide Implementierung von FA-F-26.

**Kosten-Tracking:**  
CostEntry-Tabelle mit Modell, Token, Kosten, Step. CostReport für monatliche Aggregation. Geht über die Mindestanforderung hinaus.

### Wo die Umsetzung unter Konzeptqualität bleibt

**SMTP als API-Key-Hack:**  
Das Konzept fordert eine dedizierte SMTP-Konfiguration. Die Implementierung missbraucht den HEDY-Provider mit kodierten Werten im `name`-Feld (`smtp:host:port:user`). Das ist nicht schema-konform und für Dritte nicht verständlich ohne interne Dokumentation.

**Meta/Social als Provider-Hacks:**  
`lib/social/meta.ts` hat einen Kommentar: _"WORDPRESS-Provider als Platzhalter bis META-Provider ergänzt wird"_. Das Konzept fordert einen eigenen Social-Media-Token-Manager (FA-F-11d). Das ist eine bekannte technische Schuld, die vor Produktion bereinigt werden muss.

**In-Memory Job-Store:**  
Das Konzept spezifiziert explizit in NFA-17 und NFA-18 einen DB-basierten Job-Runner mit Persistenz. Die aktuelle In-Memory-Implementierung verletzt diese Anforderungen direkt und bewusst — kein Reload-Recovery, kein horizontales Scaling möglich.

---

## 6. Entscheidungsempfehlung

### Frage: Weitermachen oder Neustart?

### Antwort: **Weitermachen — aber mit strukturiertem Cleanup-Sprint zuerst.**

---

### Argumente gegen einen Neustart

**1. Das Schwierigste ist fertig.**  
Die KI-Generation-Pipeline (Themes → Texts → Bildbriefings mit Zod-Validierung, YAML-Prompts, SSE-Streaming, Retry-Logik, Kosten-Tracking) ist das technisch anspruchsvollste Stück des Systems. Es funktioniert und ist konzeptkonform. Ein Neustart bedeutet: diesen Teil neu bauen. Der Gewinn wäre null.

**2. Alle Integrations-Stubs existieren.**  
DataForSEO, Canva, Meta, LinkedIn sind als funktionierende Clients implementiert. Sie müssen mit dem UI verbunden und fehlerbehandelt werden — nicht gebaut.

**3. Das Datenmodell ist zu ~80 % richtig.**  
Ein Neustart würde dasselbe Prisma-Schema produzieren, plus die fehlenden Tabellen (`audit_log`, `generation_jobs`, `smtp_config`). Das sind Erweiterungen, keine Neukonstruktion.

**4. Die Technologiewahl ist exakt konzeptkonform.**  
Next.js 14, Prisma/PostgreSQL, NextAuth.js v5, Anthropic SDK, Playwright-Microservice, nodemailer, Docker Compose — alles entspricht dem v6-Spec-Stack. Ein Neustart würde dieselben Entscheidungen treffen.

**5. Konzeptdokument v6 ist ein vollständiger Bauplan.**  
Die fehlenden Slices (16 → 20 vollständig, NFA-16/17/18) sind präzise spezifiziert. Es gibt keinen Planungs-Overhead mehr — nur Implementierung.

---

### Was ein Neustart tatsächlich lösen würde

- Die In-Memory Job-Store-Architektur (NFA-17/18) — aber das ist ein kontrollierter Austausch, kein Neustart
- Die Provider-Hacks für SMTP/Meta — aber das ist eine Datenmodell-Migration, kein Neustart
- Die fehlenden Tests — aber Tests kann man auch nachträglich schreiben (nicht ideal, aber machbar)

Keiner dieser Punkte rechtfertigt einen vollständigen Neustart. Sie sind alle lösbar durch gezielte Änderungen.

---

### Strukturierter Weitermachen-Plan

#### Sprint 0 — Cleanup (ca. 3 Tage, VOR allem anderen)

Diese Punkte müssen als erstes behoben werden, bevor neue Features gebaut werden:

| Aufgabe | Warum jetzt | Dauer |
|---|---|---|
| G-05: `/api/debug` + `/api/setup` sichern | Aktive Sicherheitslücke | 30 min |
| G-03: `/api/projects` GET User-Filter | DSGVO / Datenisolation | 1 h |
| G-04: `generation_jobs`-Tabelle in Prisma + Job-Store auf DB umstellen | NFA-18 Pflicht; jede neue Feature baut darauf auf | 2 Tage |
| SMTP-Config in eigenes Modell (`SmtpConfig`) migrieren | Technische Schuld, blockiert FA-B-10-UI | 1 Tag |

#### Sprint 1 — Slice 20 vollständig (ca. 3 Tage)

Slice 20 ist der fehlende P1-Block. Ohne ihn sind Compliance-Gate und Audit-Log nicht implementiert:

- `audit_log`-Tabelle + Logging-Middleware für alle definierten Actions (FA-B-11)
- Review-/Freigabe-Workflow-Modus per Projekt (FA-F-31): `reviewMode`-Feld in `Project`
- HWG-Compliance-Gate (FA-B-13): Export und Post-Button gesperrt bei hwgFlag='rot'
- Aktivitäten-Tab pro Projekt (FA-F-32)

#### Sprint 2 — Test-Fundament (ca. 3 Tage)

Ohne Tests ist jeder weitere Fortschritt riskant (NFA-16):

- Vitest aufsetzen
- Unit-Tests: Crypto, ThemenItemSchema-Validierung, HWG-Compliance-Gate
- Integration-Test: /api/generate/start (Mock-AI-Client)
- E2E-Grundgerüst: URL → ZIP

#### Sprint 3 — Feature-Gaps schliessen (ca. 2 Wochen)

Die identifizierten Schwere-2-Gaps aus Kapitel 4: Review-Workflow-UI, Canva-Context-Injektion, Pro-Projekt-API-Key, Admin-UI, Blog-Gliederungsschritt.

#### Sprint 4 — Forge-Web-Integration

Erst nach Sprint 0–2 ist die Codebasis bereit für `forge-web sync`. Die offenen Sicherheits- und Resilience-Befunde aus `forge-migration-audit.md` würden sonst sofort als Forge-Deviations markiert.

---

### Gesamtfazit

Das Konzeptdokument v6.0 ist ausgezeichnet — präzise, vollständig, mit akzeptabler Kriteriendefinition. Die Codebasis folgt diesem Konzept im Kern korrekt. Die Lücken sind reale, aber kalkulierbare Entwicklungsarbeit — kein Zeichen eines gescheiterten Ansatzes.

**Das Projekt ist etwa 60 % eines vollständigen Phase-1-MVP.** Der Weg zu einem produktionsfähigen System führt nicht über einen Neustart, sondern über drei gezielte Sprints: Cleanup → Slice-20-Compliance → Tests.

---

*Report generiert von Cursor Agent — keine Codeänderungen vorgenommen.*
