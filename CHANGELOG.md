# Changelog

Alle relevanten Änderungen an Vysible werden hier dokumentiert.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

## [Unreleased]

### Added
- **Google Ads pro Projekt:**
  - `lib/google-ads/client.ts` NEU: OAuth 2.0 Refresh-Token-Flow, Token-Cache, 3 parallele GAQL-Queries (Kampagnen, Keywords, Daily-Spend). `withRetry` auf Token-Fetch.
  - `app/api/projects/[id]/google-ads/route.ts` NEU: GET — gibt Ads-Metriken zurück (503/422/502 Fehlercodes).
  - `app/api/projects/[id]/settings/google-ads/route.ts` NEU: GET/PATCH — Customer-ID pro Projekt (normalisiert, Bindestriche entfernt).
  - `app/(dashboard)/projects/[id]/google-ads/page.tsx` NEU: Ads-Seite pro Projekt.
  - `components/google-ads/GoogleAdsDashboard.tsx` NEU: Stat-Cards, Kampagnen-Tabelle, Top-Keywords, Daily-Spend-Balken.
  - `components/google-ads/GoogleAdsSetupGuide.tsx` NEU: 6-Schritt-Einrichtungsanleitung.
  - `app/(dashboard)/projects/[id]/settings/ProjectGoogleAdsSettings.tsx` NEU.
  - `prisma/schema.prisma`: `googleAdsCustomerId String?` auf Project-Modell.
  - `prisma/migrations/20260516_add_google_ads_customer_id/migration.sql`: Migration-SQL (ADD COLUMN).
  - `.env.example`: Google Ads Umgebungsvariablen dokumentiert.
- **GA4 pro Projekt (Web-Analytics):**
  - `lib/ga4/client.ts` NEU: GA4 Data API v1beta — Service-Account-Auth (RS256 JWT, kein npm-Paket), Token-Cache (1h), Metriken: Sessions, Nutzer, Seitenaufrufe, Top-Pages, Traffic-Quellen, Daily-Sessions (28 Tage). `withRetry` auf Token-Fetch.
  - `app/api/projects/[id]/analytics/route.ts` NEU: GET — gibt GA4-Metriken zurück (503 wenn Service Account fehlt, 422 wenn Property-ID nicht hinterlegt, 502 bei API-Fehler).
  - `app/api/projects/[id]/settings/ga4/route.ts` NEU: GET/PATCH — liest und speichert `ga4PropertyId` pro Projekt. Zod-Validierung.
  - `app/(dashboard)/projects/[id]/analytics/page.tsx` NEU: Analytics-Seite pro Projekt.
  - `components/analytics/GA4Dashboard.tsx` NEU: Client-Komponente — Stat-Cards, Top-Pages, Traffic-Quellen, Mini-Balkendiagramm (28 Tage). Lade- und Fehlerzustand mit Link zu Einstellungen.
  - `app/(dashboard)/projects/[id]/settings/ProjectGA4Settings.tsx` NEU: GA4-Property-ID pro Projekt speichern.
  - `app/(dashboard)/projects/[id]/settings/page.tsx`: `ProjectGA4Settings` eingebunden.
  - `app/(dashboard)/analytics/page.tsx`: Platzhalter ersetzt durch Projektliste mit GA4-Konfigurationsstatus und Links zu Analytics/Einrichten.
  - `prisma/schema.prisma`: `ga4PropertyId String?` auf Project-Modell.
  - `prisma/migrations/20260516_add_ga4_property_id/migration.sql`: Migration-SQL (ADD COLUMN).
  - `.env.example`: `GA4_SERVICE_ACCOUNT_JSON` dokumentiert.
- **Google Ads pro Projekt:**
  - `lib/google-ads/client.ts` NEU: OAuth 2.0 Refresh-Token-Flow, Token-Cache, 3 parallele GAQL-Queries (Kampagnen, Keywords, Tagesausgaben). `withRetry` auf Token-Fetch. `cost_micros` → EUR.
  - `app/api/projects/[id]/google-ads/route.ts` NEU: GET — gibt Ads-Metriken zurück (503/422/502).
  - `app/api/projects/[id]/settings/google-ads/route.ts` NEU: GET/PATCH — Customer-ID pro Projekt (Bindestriche normalisiert).
  - `app/(dashboard)/projects/[id]/google-ads/page.tsx` NEU: Ads-Seite pro Projekt.
  - `components/google-ads/GoogleAdsDashboard.tsx` NEU: Stat-Cards, Kampagnen-Tabelle mit Status-Badge, Top-Keywords, Tagesausgaben-Balken.
  - `components/google-ads/GoogleAdsSetupGuide.tsx` NEU: 6-Schritt-Einrichtungsanleitung.
  - `app/(dashboard)/projects/[id]/settings/ProjectGoogleAdsSettings.tsx` NEU.
  - `app/(dashboard)/projects/[id]/settings/page.tsx`: `ProjectGoogleAdsSettings` eingebunden.
  - `prisma/schema.prisma`: `googleAdsCustomerId String?` auf Project-Modell.
  - `prisma/migrations/20260516_add_google_ads_customer_id/migration.sql`: Migration-SQL.
  - `.env.example`: Google Ads Variablen dokumentiert.

### Fixed
- **Dockerfile Build-OOM:** `NODE_OPTIONS=--max-old-space-size=1536` im Builder-Stage gesetzt — verhindert OOM-Kill durch den Kernel bei `pnpm build` auf speicherbeschränkten VPS-Instanzen. `NEXT_TELEMETRY_DISABLED` vor beide Build-Schritte gezogen.
- **`pdfjs-dist` v5 Build-Fehler (DOMMatrix):** `next.config.mjs` Webpack-Alias `pdfjs-dist` → Legacy-Build (`pdfjs-dist/legacy/build/pdf.mjs`). pdfjs v5 nutzt `DOMMatrix` (Browser-API) beim Modulimport — der Legacy-Build ist der offizielle Node.js-kompatible Pfad. Fehler war Ursache des Docker-Build-Abbruchs.

### Security
- **FIX-06 AES-256-GCM Versions-Präfix (ADR-003):**
  - `lib/crypto/aes.ts`: `getKeyV1()` löst `ENCRYPTION_SECRET_V1 ?? ENCRYPTION_SECRET` auf — Legacy-Fallback für bestehende Deployments. `decrypt()` erkennt `v2:`-Präfix und wirft expliziten Error. Kein stiller Fehlschlag (Forge §3a).
  - `scripts/migrate-aes-prefix.ts` NEU: Dry-Run-Standard (`--apply` für echte DB-Änderungen). Idempotent: bereits migrierte `v1:`-Werte werden übersprungen. Script bricht bei erstem Fehler ab. Kein PII im Output — nur IDs + Zeichenlänge.
  - `.env.example`: `ENCRYPTION_SECRET_V1` als primäre Variable dokumentiert, `ENCRYPTION_SECRET` als auskommentierter Legacy-Fallback.
  - `__tests__/unit/crypto/aes.test.ts`: +2 Tests — Legacy-Rückwärtskompatibilität + `v2:`-Error. Gesamt: 8/8 PASS.
- **FIX-03 `/api/setup`:** Hardcodiertes Passwort `admin123` entfernt. Route erfordert nun `INITIAL_ADMIN_PASSWORD` ENV-Variable (503 wenn fehlt). Response gibt keine Credentials mehr zurück. `.env.example` ergänzt.
- **FIX-01 HWG-Gate Social Posting:** `app/api/projects/[id]/social-post/route.ts` prüft jetzt `hwgFlag` vor jedem Draft-Post (FA-B-13). Bei gesetztem Flag: HTTP 403 + AuditLog `social.draft_blocked`. Konsistent mit Export-, WordPress- und KlickTipp-Gate.

### Added
- **FIX-05 PDF/DOCX-Upload für Positionierungsdokument (FA-F-05a):**
  - `app/api/projects/parse-document/route.ts` NEU: POST multipart/form-data — extrahiert Text aus PDF (`pdfjs-dist`), DOCX (`mammoth`), TXT/MD (Buffer). Auth via `requireAuth()`. File-Size-Check (max. 10 MB) vor Buffer-Allokation. Content-Type-Validierung. Truncation auf 16.000 Zeichen. Response: `{ text, truncated, originalLength }`.
  - `components/wizard/Step3Context.tsx`: `accept`-Attribut auf `.txt,.md,.markdown,.pdf,.docx` erweitert. PDF/DOCX-Zweig ruft `/api/projects/parse-document` auf. `isUploading`-Spinner, `uploadError`-Anzeige, `truncatedHint` sichtbar. `alert()`-Stub vollständig entfernt.
  - `next.config.mjs`: `webpack: config.resolve.alias['canvas'] = false` — verhindert Canvas-Bundle-Fehler durch pdfjs-dist in Node.js.
  - `package.json`: `pdfjs-dist ^5.7.284` + `mammoth ^1.12.0` hinzugefügt.
- **FIX-08 Audit-Log-Retention:** `lib/cron/scheduler.ts` — täglicher Cron 03:00 löscht `AuditLog`-Einträge älter als 30 Tage (`AUDIT_LOG_RETENTION_DAYS` ENV, Standard 30). `.env.example` ergänzt.

### Changed
- `docs/roadmap.md`: Sektion "Audit-Fix-Sprints" NEU — FIX-01–FIX-10 mit Status; FIX-05 auf "✅ Abgeschlossen (2026-05-16, Sprint FIX-05)" gesetzt.
- `docs/dev-prompts/archive/sprint-fix05-pdf-upload.md`: Sprint-Prompt FIX-05 nach Abschluss archiviert.
- **FIX-04 retry.ts → pino (NFA-11):** `lib/utils/retry.ts` verwendet nun `logger.warn/error` statt `console`. Retry-Warnungen erscheinen als strukturiertes JSON in Produktions-Logs.
- **FIX-02 Chat-Prompt in YAML ausgelagert (NFA-08):** `prompts/chat.yaml` NEU. `app/api/projects/[id]/chat/route.ts`: Inline-System-Prompt entfernt, `loadPrompt('chat', {...})` verwendet.
- `lib/audit/logger.ts`: `AuditAction`-Union um `social.draft_blocked` und `social.draft_created` erweitert.

### Fixed
- `lib/audit/logger.ts`: `AuditAction`-Union um `klicktipp.credentials_saved` und `klicktipp.credentials_removed` erweitert (TypeScript-CI-Fehler).

### Added
- **KlickTipp: Per-Projekt-Credentials (Slice KT-1):**
  - `prisma/schema.prisma`: `ktApiKeyId` FK auf `Project` → eigener `ApiKey` pro Projekt (`ProjectKtApiKey`-Relation).
  - `prisma/migrations/20260515140000_project_kt_api_key/`: Migration SQL (ADD COLUMN + FK + Index).
  - `app/api/projects/[id]/klicktipp/route.ts` NEU: GET/POST/DELETE — speichert `username:password` AES-256-verschlüsselt als `ApiKey` mit `provider: KLICKTIPP`, verknüpft via `ktApiKeyId`.
  - `app/(dashboard)/projects/[id]/settings/ProjectKlickTippSettings.tsx` NEU: Client-Komponente mit Benutzername/Passwort/Listen-ID-Formular.
  - `app/(dashboard)/projects/[id]/settings/page.tsx`: `ProjectKlickTippSettings` eingebunden.
  - `lib/klicktipp/client.ts`: `loadKtCredentials(projectId?)` — projektspezifischer Key zuerst, globaler Fallback.
  - `app/api/klicktipp/campaign/route.ts`: `loadKtCredentials(projectId)` statt globalem Aufruf.
- **Sprint P4-D — Performance & Stabilität (Sub-Slice A — DB):**
  - `prisma/schema.prisma`: 4 neue composite Indexes — `Project[createdById, updatedAt]`, `CostEntry[projectId, timestamp]`, `AuditLog[projectId, createdAt]`, `GenerationJob[status, createdAt]`.
  - `.env.example`: `connection_limit=10&pool_timeout=30` in DATABASE_URL-Vorlage dokumentiert.
  - `app/api/projects/route.ts`: `orderBy` auf `updatedAt: 'desc'` umgestellt; `updatedAt` zum `select` ergänzt.
  - `app/(dashboard)/projects/[id]/page.tsx`: `include:` durch explizites `select:` ersetzt — lädt keine JSON-Blobs (textResults, themeResults, scrapedData) mehr auf der Projektübersicht.
  - `app/api/generate/stream/[jobId]/route.ts`: `logger` importiert; `abort`-Handler loggt Client-Disconnect via `logger.info`; bisherige silent catches mit `logger.warn` versehen.
- **Sprint P4-D — Performance & Stabilität (Sub-Slice B — Bundle/Docker):**
  - `docker-compose.prod.yml`: Memory-Limit für App-Container (`limits: memory: 1024m`, `reservations: 512m`).
  - `app/(dashboard)/projects/[id]/calendar/page.tsx`: `ContentCalendar` via `next/dynamic` lazy-loaded (`ssr: false`, Skeleton-Loading).
  - `components/editor/EditorView.tsx`: `RichTextEditor` (Tiptap) via `next/dynamic` lazy-loaded (`ssr: false`, Skeleton-Loading) — separater JS-Chunk, nicht im initialen Bundle.
- **Sprint P4-D — Closeout:**
  - `docs/roadmap.md`: Phase 4 auf "✅ Abgeschlossen" gesetzt; P4-D in Phase-4-Backlog eingetragen.
  - `docs/dev-prompts/archive/sprint-p4d-performance.md`: Sprint-Prompt archiviert.
  - `docs/dev-prompts/OpenActions.md`: Hinweis auf ausstehende `prisma migrate dev --name performance_indexes` ergänzt.

- **Sprint P4-C — NFA-Härtung: Rate-Limiting global (Sub-Slice A):**
  - `middleware.ts`: IP-basiertes Rate-Limiting (60 Req/Min) auf alle `/api/*`-Routen via `lib/ratelimit/index.ts`. SSE-Streams (`/api/generate/stream/*`) ausgeschlossen.
  - `next.config.mjs`: CSP + Security-Header auf allen Routen (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`).
- **Sprint P4-C — NFA-Härtung: DSGVO, Timeouts, Validierung (Sub-Slice B):**
  - `app/api/projects/[id]/route.ts` NEU: `DELETE`-Handler — Ownership-Check, Audit-Log vor Löschung, `prisma.project.delete` (Cascade für GenerationJob/ShareLink/PraxisUser etc., SetNull für CostEntry/AuditLog intentional).
  - `lib/generation/themes.ts`: `{ timeout: 120_000 }` auf `anthropic.messages.create` (generateThemes).
  - `lib/generation/texts.ts`: `{ timeout: 120_000 }` auf alle 5 `anthropic.messages.create` Aufrufe (generateBlogOutlines, generateBlogPost, generateNewsletter, generateSocialPosts, generateImageBrief).
  - `app/api/projects/[id]/social-post/route.ts`: Zod-Schema `postSchema` — ersetzt manuelle `typeof`-Checks für `index`, `kanal` (enum), `text`.
- **Sprint P4-C — Closeout:**
  - `docs/roadmap.md`: Sprint P4-C auf "✅ Abgeschlossen (2026-05-16)" gesetzt.
  - `docs/dev-prompts/archive/sprint-p4c-nfa-haertung.md`: Sprint-Prompt archiviert (aus `docs/dev-prompts/` entfernt).
  - `docs/dev-prompts/OpenActions.md`: Kein neuer Nachlaufblock für P4-C (kein offener Punkt entstanden).

### Fixed
- **Forge-Sync-Audit (2026-05-16):**
  - `lib/hooks/useGenerationStream.ts:53+97`: Zwei Silent-catches (`catch {}` mit nur Kommentar) durch `catch (err: unknown) { console.warn('[Vysible] ...', err) }` ersetzt — konform mit Client-Component-Logger-Deviation.
  - `lib/generation/themes.ts:135`: Silent-catch (`catch (_e) { /* ... */ }`) in `salvageTruncatedArray` durch `catch (e: unknown) { logger.warn(...) }` ersetzt.
  - `docs/forge-web-deviations.md`: V-03 (`web-sse-pattern §3` — named SSE events) als Accepted-Deviation dokumentiert; Audit-Log-Eintrag ergänzt.
- **Sidebar Logo:** `public/logo.png` (V-Symbol) auf 32×32 px verkleinert (war 120×40) und `Vysible`-Schriftzug als separater `<span>` wiederhergestellt (`components/layout/sidebar.tsx`).
- **KlickTipp optional in Ergebnisansicht:** `ktConfigured` prüft jetzt projektspezifischen `ktApiKeyId` sowie globalen KLICKTIPP-Key als Fallback — Button bleibt ohne jegliche Konfiguration deaktiviert (`app/(dashboard)/projects/[id]/results/page.tsx`). Meta- und LinkedIn-Keys aus Remote-Stand beibehalten.

### Changed
- **Sprint Fix-A — F-020: `JSON.parse(JSON.stringify)` Serialisierungs-Anti-Pattern entfernt:**
  - `lib/generation/pipeline.ts`: 3 Stellen (scrape_done L85, themes_done L170, texts_done L232) durch `as unknown as Prisma.InputJsonValue` ersetzt. `import { Prisma } from '@prisma/client'` ergänzt.
  - `lib/generation/job-store.ts`: 2 Stellen (emitEvent L117, resetForRetry L159) durch Prisma-Cast ersetzt. Prisma war bereits importiert.
- **Sprint Fix-B — Themen-Quality-Gate: Magic Numbers + istFrage deterministisch (Backlog #5):**
  - `lib/generation/config.ts` NEU: `THEMES_CONFIG` mit `minPraxisQuote` (Default 0.8) und `minSeoQuote` (Default 0.5), ENV-Override via `THEMES_MIN_PRAXIS_QUOTE` / `THEMES_MIN_SEO_QUOTE`.
  - `lib/generation/themes-schema.ts` MOD: Hardcoded `0.8` und `0.5` durch `THEMES_CONFIG`-Werte ersetzt — Schwellwerte ohne Deployment änderbar. `istFrage` von Pflichtfeld zu `optional().default(false)` — wird nicht mehr vom LLM befüllt.
  - `lib/generation/themes.ts` MOD: `computeIstFrage()` (export) — deterministisch `seoTitel.endsWith('?') || seoTitel.includes(keyword)`. Post-parse-Mapping setzt `istFrage` für alle Items, ersetzt LLM-Self-Assessment.
  - `prompts/themes.yaml` MOD: `"istFrage": true` aus JSON-Schema-Beispiel entfernt (LLM muss das Feld nicht mehr befüllen). Guideline-Regel bleibt als Output-Hinweis für seoTitel-Formatierung.
  - `.env.example` MOD: `THEMES_MIN_PRAXIS_QUOTE` und `THEMES_MIN_SEO_QUOTE` dokumentiert (auskommentiert).

### Added
- **Einstellungen → Parameter (neu):** Konfigurierbarer Bereich zwischen "Kosten & Abrechnung" und "Benutzer".
  - `prisma/schema.prisma`: `AppConfig`-Modell (Single-Row) mit Themen-Qualitätsschwellwerten + Modell-Auswahl pro Aufgabe.
  - `prisma/migrations/20260516_add_app_config/migration.sql`: Migration-SQL (manuell gegen Prod-DB anwenden).
  - `lib/generation/app-config.ts` NEU: `getAppConfig()` liest DB, fällt auf ENV-Defaults zurück.
  - `lib/generation/themes.ts` + `lib/generation/texts.ts`: Alle `DEFAULT_MODEL`-Stellen durch konfiguriertes Modell aus DB ersetzt.
  - `lib/generation/themes-schema.ts`: `validateThemenQuality()` akzeptiert optionalen `config`-Parameter.
  - `app/api/settings/parameters/route.ts` NEU: GET + PATCH, ADMIN-only.
  - `components/settings/ParameterSettingsForm.tsx` NEU: Client-Formular mit Slidern (Schwellwerte) + Dropdowns (Modelle).
  - `app/(dashboard)/settings/parameter/page.tsx` NEU: Server Component, lädt Config aus DB.
  - `app/(dashboard)/settings/layout.tsx`: "Parameter"-Tab hinzugefügt.
- **Impressum + Datenschutz:** Seiten (`/impressum`, `/datenschutz`) existieren bereits. `middleware.ts` hat sie bereits in der Public-Allowlist (`impressum|datenschutz`). ✅

### Fixed
- **Windsurf-Regelwerk (command-result-interpretation, Rule 5):** Pre-Slice/Pre-Sprint Validations werden in sequentiellen Batches (max 2–3 Commands) ausgeführt — strukturelle Maßnahme gegen Entscheidungsparalyse. Auch in forge-web upstream verankert (`windsurf`-only, `b3a73ad`).
- **Sprint Fix-A — Sub-Slice B:**
  - `app/(dashboard)/layout.tsx`: Footer mit Impressum/Datenschutz-Links ergänzt (`<a href="/impressum">` + `<a href="/datenschutz">`). Server Component bleibt Server Component (kein `'use client'` nötig). (Backlog #8 partial)
  - `lib/ai/client.ts`: `@forge-scan factory-only`-JSDoc-Kommentar ergänzt — verhindert CI-False-Positive beim Forge-§3c-Retry-Scan. (Backlog #10)
  - `docs/dev-prompts/OpenActions.md`: Einträge Backlog #1 (`TemplateSelector.tsx:23`), #9 (META/LINKEDIN-Schema) und #10 (forge-scan) als ✅ geschlossen markiert. Zähler "noch 2 offen" → "noch 0 offen".
- `app/datenschutz/page.tsx`: ASCII `"` und `'` durch typografische Unicode-Zeichen ersetzt — behebt `react/no-unescaped-entities` ESLint-Fehler (CI lint-and-typecheck FAIL).

### Added
- **Sprint P4-B — Bildbriefing erweitert (Slice 15):**
  - `lib/generation/texts-schema.ts` MOD: `ImageBriefSchema` um vier neue Felder erweitert — `stockSuchbegriffe` (3–5 englische Stock-Keywords), `dallePrompt` (DALL-E 3 Prompt-Text, nur bei HWG grün), `unsplashLinks` (Unsplash-Bild-URLs), `hwgParagraph11Check` (bool, §11-Prüfung durchgeführt). Alle neuen Felder abwärtskompatibel mit `.default([])` / `.optional()`.
  - `prompts/image-brief.yaml` MOD: Prompt erweitert um Stock-Suchbegriffe, DALL-E-Logik, HWG §11-Prüfung, `fachgebiet`- und `keywords`-Variablen.
  - `lib/unsplash/client.ts` NEU: Unsplash-API-Client mit `withRetry`, graceful degradation wenn `UNSPLASH_ACCESS_KEY` fehlt.
  - `lib/generation/texts.ts` MOD: `generateImageBrief()` — neue Prompt-Variablen (`fachgebiet`, `keywords`), HWG §11-Guard (`dallePrompt → undefined` bei `hwgFlag: 'rot'`), Unsplash-Call bei HWG rot/gelb, CostEntry-Step auf `image-brief-extended` umbenannt.
  - `lib/export/docx.ts` MOD: Bildbriefing-Kapitel im DOCX-Export — alle Felder als Bold-Label + Wert, DALL-E-Prompt als Monospace-Block, Unsplash-Links als klickbare `ExternalHyperlink`-Elemente.
  - `components/results/ImageBriefCard.tsx` NEU: Collapsible-Karte mit HWG §11-Badge, Stock-Suchbegriffe als Chips, DALL-E-Prompt mit Copy-Button, Unsplash-Links.
  - `components/results/ResultsTabs.tsx` MOD: `ImageBriefTab` nutzt jetzt `ImageBriefCard` statt der einfachen Inline-Anzeige.
  - `lib/image/brief-generator.ts` DELETED: Orphan-Implementierung (nicht integriert, no-duplication-Verletzung) im Rahmen von Option-A-Konsolidierung entfernt.
  - `app/api/image/brief/route.ts` DELETED: Orphan-API-Route die nur den gelöschten `brief-generator` importierte.
  - `.env.example` MOD: `UNSPLASH_ACCESS_KEY` mit Dokumentation und Rate-Limit-Hinweis ergänzt.

### Changed
- **Sprint P4-B Closeout (Slice 15):** `docs/roadmap.md` Slice 15 auf ✅ Abgeschlossen (2026-05-16, Sprint P4-B) gesetzt. Phase 4 auf ~60 % aktualisiert. Sprint-Prompt nach `docs/dev-prompts/archive/` archiviert.

### Added
- **Sprint Fix-A Prompt:** `docs/dev-prompts/sprint-fix-a-codecleanup.md` — Sprint-Prompt für Code-Cleanup: JSON.parse(JSON.stringify)-Muster in `lib/generation/`, Dashboard-Footer Impressum/Datenschutz, forge-scan Kommentar `lib/ai/client.ts`, OpenActions-Bereinigung (F-020, Backlog #8/#10).
- **Sprint Fix-B Prompt:** `docs/dev-prompts/sprint-fix-b-quality-gate.md` — Sprint-Prompt für Themen-Quality-Gate Refactor: `lib/generation/config.ts` mit ENV-Override, Magic Numbers aus `themes-schema.ts`, `istFrage` deterministisch in `themes.ts`, `prompts/themes.yaml` vereinfacht (Backlog #5).
- **Roadmap Phase-4-Backlog:** `docs/roadmap.md` um Abschnitt „Phase-4-Backlog" ergänzt — Slice 14 (SEO-Analyse, Sprint P4-A) und Slice 15 (Bildbriefing erweitert, Sprint P4-B) eingetragen.
- **Rechtliche Pflichtseiten (Rohtexte):** `docs/Impressum.txt` (§ 5 TMG) und `docs/dev-prompts/archive/Datenschutz.txt` (DSGVO Art. 13/14) als Quelltexte für spätere Web-Integration hinterlegt.

### Added
- **Sprint P4-A — SEO-Analyse (Slice 14):**
  - `prompts/seo-analysis.yaml` NEU: KI-Prompt für Meta-Description-Generierung (HWG-konform, DACH-medizinisch, 150–160 Zeichen, Call-to-Action).
  - `lib/seo/analyzer.ts` MOD: `SeoAnalysis`-Interface um `titleLength` und `titleLengthOk` (50–60 Zeichen Zielbereich) erweitert. Score-Abzug (-5) bei suboptimaler Titel-Länge ergänzt.
  - `lib/seo/meta-generator.ts` NEU: `generateMetaDescription()` — KI-basierter Meta-Description-Generator. `withRetry` auf Anthropic-Call, `CostEntry` mit `step='seo_analysis'`, HTML-Stripping vor KI-Übergabe.
  - `lib/generation/results-store.ts` MOD: `StoredSeoResult`-Interface (extends `SeoAnalysis` + `aiMetaDescription` + `analyzedAt`) + optionales `seo?`-Feld in `StoredTextResult`.
  - `app/api/projects/[id]/seo/route.ts` NEU: `POST /api/projects/[id]/seo` — Auth + Ownership-Check, deterministische Analyse + KI-Meta-Description parallel, Ergebnis in `textResults[index].seo` persistiert. 401/403/404/400-Guards.
  - `components/results/SeoScoreCard.tsx` NEU: Client-Komponente mit Ampel-Anzeige (grün/gelb/rot) für KW-Dichte, Keyword-im-Titel, Titel-Länge, Meta-Description-Länge; KI-Meta-Description mit Copy-Button; "Erneut analysieren"-Button; Fehler-Anzeige mit `console.warn('[Vysible]')`.
  - `components/results/ResultsTabs.tsx` MOD: `SeoPanel` durch `SeoScoreCard` ersetzt im BlogTab — persistierte KI-Analyse statt client-only Quick-Check.
  - `lib/export/docx.ts` MOD: Meta-Description-Abschnitt (KI-generiert) im DOCX-Export pro Blog-Artikel wenn `seo.aiMetaDescription` vorhanden.
  - `__tests__/unit/seo/analyzer.test.ts` NEU: 8 Unit-Tests für `analyzeSeo()` (pure function, Keyword-Dichte, Titel-Check, Title-Länge, Meta-Description, Score, Idempotenz, Wortzählung).

### Changed
- **Sprint P4-A Closeout (Slice 14):** `docs/roadmap.md` Slice 14 auf ✅ Abgeschlossen (2026-05-16, Sprint P4-A) gesetzt. Phase 4 auf ~50 % aktualisiert. Sprint-Prompt nach `docs/dev-prompts/archive/` verschoben.

### Added
- **Sprint P2-F — Social Media Draft-Posting (Slice 18):**
  - `prisma/schema.prisma`: Provider-Enum um `META` und `LINKEDIN` erweitert (additive Migration `20260515220000_add_meta_linkedin_providers`).
  - `lib/social/meta.ts`: `WORDPRESS`-Provider-Hack durch `META` ersetzt; `withRetry` auf alle Graph-API-Calls (`postFacebookDraft`, `postInstagramDraft`); stille Catches durch `logger.error` ersetzt.
  - `lib/social/linkedin.ts`: `KLICKTIPP`-Provider-Hack durch `LINKEDIN` ersetzt; `withRetry` auf `ugcPosts`-Call; stiller Catch durch `logger.error` ersetzt.
  - `lib/generation/results-store.ts`: `SocialStatus`-Typ auf 5 Zustände erweitert (`ausstehend`, `hochgeladen`, `freigegeben`, `veroeffentlicht`, `fehler`). `StoredTextResult` um `socialDraftId`, `socialPlatform`, `socialError` ergänzt.
  - `app/api/projects/[id]/social-post/route.ts`: Vollständiges Status-Tracking — Erfolg setzt `socialStatus: 'hochgeladen'` + `socialDraftId` + `socialPlatform`; Fehler setzt `socialStatus: 'fehler'` + `socialError`.
  - `components/results/SocialPostButton.tsx` NEU: Client-Komponente für Draft-Upload mit 4 Zuständen (idle/loading/success/error), Token-Expired-Deaktivierung, Retry-Button, "Erneut hochladen".
  - `components/results/ResultsTabs.tsx`: `SocialTab` überarbeitet — `SocialPostButton` pro Post, Token-Status-Check via `/api/tokens/status` (expired → Button deaktiviert), "Nicht konfiguriert"-Hinweis wenn kein META/LINKEDIN-Key, live `localTexts`-State vor Autosave; neue Props `metaConfigured`, `linkedInConfigured`.
  - `app/(dashboard)/projects/[id]/results/page.tsx`: META- und LINKEDIN-ApiKey-Lookup; `metaConfigured` + `linkedInConfigured` an `ResultsTabs` übergeben.
  - `components/calendar/ContentCalendar.tsx`: `veroeffentlicht` → blaues Badge, `fehler` → rotes Badge in Kalender-Ansicht.
  - `app/(dashboard)/settings/api-keys/SocialTokenStatusSection.tsx`: Von CANVA-ApiKey-Rows auf META/LINKEDIN-ApiKeys umgestellt; Canva-Deprecated-Hinweis mit Link zu `/settings/canva`; Leer-Zustand ("API-Key hinterlegen"); stiller Catch geschlossen (forge §3a).

### Fixed
- **Forge §3c + §3a — `lib/image/brief-generator.ts`:** `messages.create`-Call in `withRetry` gekapselt (Forge §3c). Comment-only `catch { // DALL-E fehler... }` durch `console.warn('[Vysible] DALL-E...', err)` ersetzt (Forge §3a).

### Removed
- **Sidebar „+ Neues Projekt"-Button entfernt:** Redundanter Nav-Eintrag aus `components/layout/sidebar.tsx` entfernt — Funktion ist unter „Projekte" direkt verfügbar.

### Changed
- **Sprint P2-F Closeout (Slice 18):** `docs/roadmap.md` Slice 18 auf ✅ gesetzt. `docs/forge-web-deviations.md` Restbestand-stiller-Catches-Kategorie vollständig geschlossen (`SocialTokenStatusSection.tsx:42` in Geschlossene aufgenommen). `docs/dev-prompts/OpenActions.md` Punkt 3 (`SocialTokenStatusSection`) als erledigt markiert; PSR-WARNs P2-F als Punkte 6 + 7 dokumentiert. Sprint-Prompt nach `docs/dev-prompts/archive/` verschoben.

### Added
- **Impressum & Datenschutzerklärung (§ 5 TMG / DSGVO):** Statische Seiten `/impressum` und `/datenschutz` angelegt (Server Components). Login-Seite zeigt Footer-Links „Impressum · Datenschutz". `middleware.ts` lässt beide Routen ohne Authentifizierung durch.
- **OpenActions: Rechtliche Pflichtseiten** — Backlog-Eintrag für Cookie-Disclaimer, Impressum (§ 5 TMG) und Datenschutzerklärung (DSGVO Art. 13/14) ergänzt, da Vysible öffentlich unter `https://vysible.cloud` erreichbar ist.

### Added
- **Urheber-Attribution:** `package.json` `author`-Feld auf „Prof. Dr.-Ing. Kai Daniel (U-Glow GmbH / prelytics)" gesetzt. Sidebar zeigt © Prof. Dr.-Ing. Kai Daniel über dem Abmelden-Button. Praxis-Portal-Footer: „Erstellt von U-Glow GmbH (prelytics) · Powered by Vysible".

### Added
- **Fachgebiet-Templates (Slice 25, Sprint P3-G):** 4 YAML-Vorlagen (`zahnarzt`, `kfo`, `gynaekologe`, `dermatologie`) im neuen `FachgebietTemplate`-Format mit `defaultKeywords`, `defaultCategories`, `seasonalTopics`, `hwgHighRiskCategories`. `lib/templates/loader.ts` auf `FachgebietTemplate`-Interface umgestellt.
- **Template-Vorbelegung im Wizard:** `TemplateSelector.tsx` überarbeitet — wählt Fachgebiet-Vorlage und belegt Keywords + Fachgebiet automatisch vor.
- **Klon-Funktion (Slice 25, Sprint P3-G):** `POST /api/projects/clone` korrigiert (kopiert kein `positioningDocument` mehr, setzt `clonedFrom` + `hedyImportHighlight`). `CloneProjectButton.tsx` in Projektliste.
- **Hedy-Import-Highlight-Banner:** `HedyImportHighlightBanner.tsx` — erscheint nach Klon auf Projektdetail-Seite, verweist auf Hedy-Transkript-Import für Positionierungsworkshop.
- **Prisma-Migration** `20260515210000_add_clone_fields_to_project`: `Project.clonedFrom` (String?) + `Project.hedyImportHighlight` (Boolean, default false).

### Fixed
- **`components/wizard/TemplateSelector.tsx:23` stiller Catch** (forge-web-deviations §3a) geschlossen: `.catch(() => {})` → `console.warn('[Vysible] …', err)`.
- **Klon-Route kopierte `positioningDocument`** (Bug): wird jetzt korrekt weggelassen.

### Added
- **Token-Ablauf-Warnsystem (Slice 26, Sprint P3-H):**
  - `lib/tokens/expiry-checker.ts`: `ExpiryLevel`-Typ + `TokenExpiryStatus`-Interface + `getExpiryLevel()`. `getAllTokenExpiryStatuses()` prüft jetzt sowohl `ApiKey.expiresAt` als auch `CanvaToken.expiresAt`. `checkTokenExpiry()` auf 4-stufige Eskalation umgestellt (E-Mail nur bei `urgent`/`critical`, nicht bei `warning`).
  - `app/api/tokens/status/route.ts`: NEU — `GET /api/tokens/status`, auth-geschützt, gibt alle `TokenExpiryStatus`-Einträge mit `level !== 'ok'` zurück.
  - `lib/email/mailer.ts` + `lib/email/templates/notification.ts`: `token_expiring` zu `EmailTrigger` und `TRIGGER_SUBJECTS` hinzugefügt.

### Fixed
- **`components/layout/TokenWarningBanner.tsx:21` stiller Catch** (forge-web-deviations §3a) geschlossen: `.catch(() => {})` → `console.warn('[Vysible] Token-Status konnte nicht geladen werden', err)`.
- **`TokenWarningBanner`**: Endpoint von `/api/api-keys/expiring` auf `/api/tokens/status` umgestellt. Farbcodierung nach Level (gelb/orange/rot/dunkelrot). One-Click-Reauth pro Token (CANVA → `/settings/canva`, andere → `/settings/api-keys`).

### Changed
- **Sprint P3-H Closeout (Slice 26):** `docs/roadmap.md` Slice 26 auf ✅ gesetzt. `docs/forge-web-deviations.md` `TokenWarningBanner.tsx:21` als geschlossen + `expiry-checker.ts:21` als staler Eintrag markiert. `docs/dev-prompts/OpenActions.md` Sprint-0a-Punkte aktualisiert. Sprint-Prompt nach `docs/dev-prompts/archive/` verschoben.
- **Sprint P3-G Closeout (Slice 25):** `docs/roadmap.md` Slice 25 auf ✅ gesetzt. `docs/forge-web-deviations.md` `TemplateSelector.tsx:23` als geschlossen markiert. Sprint-Prompt nach `docs/dev-prompts/archive/` verschoben.
- **Sprint P3-F Closeout (Slice 24):** `docs/roadmap.md` Slice 24 auf ✅ gesetzt. `docs/dev-prompts/OpenActions.md` `lib/costs/reporter.ts:56` als geschlossen markiert. Sprint-Prompt nach `docs/dev-prompts/archive/` verschoben.

### Added
- **Sprint P3-F — Sub-Slice B: Reporter + Cron + PDF-Download (Slice 24):**
  - `lib/costs/reporter.ts`: `generateMonthlyReport` → `Promise<string>` (pdfPath), pdfkit-PDF via `buildReportPdf`. Neue Funktion `sendMonthlyReport` (DB-Upsert, History ≤12, E-Mail). `checkCostThreshold` Trigger korrigiert (`cost_threshold_exceeded`). Encoding-Bugs behoben.
  - `lib/cron/scheduler.ts`: Cron-Job erweitert — `sendMonthlyReport` nach `generateMonthlyReport`, try/catch statt bare `.catch`.
  - `app/api/kpi/report/[period]/route.ts`: NEU — PDF-Download-Route für gespeicherte Monatsreports.
  - `lib/email/mailer.ts` + `lib/email/templates/notification.ts`: `monthly_report` zu `EmailTrigger` und `TRIGGER_SUBJECTS` hinzugefügt.
  - `docs/forge-web-deviations.md`: Eintrag `lib/costs/reporter.ts:56` formal geschlossen (Sprint P3-F).
- **Sprint P3-F — Sub-Slice A: KPI-Dashboard (Slice 24):**
  - `prisma/schema.prisma`: `MonthlyReport`-Modell für PDF-Report-History (`period`, `pdfPath`, `generatedAt`, `sentAt`). Migration: `20260515190000_add_monthly_report`.
  - `app/api/kpi/route.ts`: GET-Route um `monthlyReports`-Array und Error-Handling erweitert.
  - `components/kpi/MonthlyOverview.tsx`: Server-Komponente — 7 globale KPI-Karten aus `GlobalKpis`.
  - `components/kpi/ProjectKPICard.tsx`: Server-Komponente — Pro-Projekt-Kostenkarte mit Status-Badge und CostChart-Sparkline.
  - `components/kpi/CostChart.tsx`: Client-Komponente — SVG-Sparkline (6 Monate) mit Hover-Tooltip.
  - `app/(dashboard)/kpi/page.tsx`: MonthlyOverview + ProjectKPICard-Grid + Monatsreport-Archiv-Sektion ergänzt.
  - `.gitignore`: `reports/`-Verzeichnis ignoriert (generierte PDFs).

### Fixed
- **Themenplan-Generierung:** SEO-Titel-Qualitätsprüfung bricht Pipeline nicht mehr ab — Unterschreiten der 50%-Empfehlung wird als Warnung geloggt (`Themen-SEO-Qualitätshinweis`) statt als Fehler behandelt. Harte Kriterien (leeres Array, <80% praxisspezifisch) bleiben Fehler mit Retry.
- **CI:** `deploy.yml` Race Condition behoben — Deploy-Webhook feuerte parallel zu CI
  (nach ~7s), Coolify verwendete gecachtes Image statt neu zu bauen. Fix: `workflow_run`-
  Trigger statt `push` — Deploy startet erst nach erfolgreichem CI-Abschluss.
- **CI:** pnpm-Versionskonflikt behoben — redundante `version: 9` aus `ci.yml`
  entfernt (`package.json` `packageManager` ist Single Source of Truth).
- **CI:** Node.js 20 → 22 LTS in `ci.yml` und `forge-sync.yml` (GitHub Actions
  erzwingt Node 24 ab 2026-06-02, Node 20 wird 2026-09-16 entfernt).
- **CI:** `forge-sync.yml` `force_sync` default von String `'false'` auf Boolean
  `false` korrigiert (YAML-Lint-Fix aus Forge-Web Template-Update).

### Added
- **Sprint P3-E — KlickTipp Newsletter Connector (Slice 23):**
  - `lib/klicktipp/client.ts`: Vollständiger KT-Client mit Session-Auth, `withRetry`,
    `{{unsubscribe_link}}`-Guard vor API-Call, `loadKtCredentials()`, `testKtConnection()`.
    Stiller Catch L34 (`ktLogout`) durch `logger.warn` ersetzt (schließt `docs/forge-web-deviations.md`-Eintrag).
  - `lib/klicktipp/newsletter-formatter.ts`: Neues `formatForKlickTipp()` mit KT-kompatiblem
    Tabellenlayout, Inline-CSS, Preheader, optionalem CTA-Button, `{{unsubscribe_link}}`-Footer,
    DSGVO-Footer (Praxisname + Website), Markdown → E-Mail-HTML-Konvertierung.
  - `app/api/klicktipp/campaign/route.ts`: Vollständige Route mit HWG-Gate, AuditLog,
    Credentials laden + entschlüsseln, `formatForKlickTipp`, `ktCampaignId`-Tracking,
    sendNotification.
  - `app/api/klicktipp/settings/route.ts`: KT-Credentials speichern (AES-256, Format
    `username:password`). Standard-Listen-ID via `ApiKey.model`.
  - `app/api/klicktipp/test/route.ts`: Verbindungstest (Session-Login + Logout).
  - `app/(dashboard)/settings/klicktipp/page.tsx`: Settings-UI (Benutzername + Passwort +
    Standard-Listen-ID + Test-Button).
  - `components/results/KlickTippButton.tsx`: Vollständige Komponente mit `ktConfigured`-Guard,
    HWG-Gate-Block, Ladezustand, Erfolg mit KT-Edit-Link, Fehleranzeige.
  - `prisma/schema.prisma`: `ktCampaignId` auf Project-Modell.
  - Migration `20260515150000_add_kt_campaign_id_to_project`.
  - Settings-Tab "KlickTipp" in `/settings`-Navigation.
  - AuditAction-Typen: `klicktipp.campaign_created`, `klicktipp.campaign_blocked`.
  - `ResultsTabs`: `ktConfigured` + `hwgFlag` an `NewsletterTab` und `KlickTippButton` durchgereicht.
  - Results-Page (`/projects/[id]/results`): KLICKTIPP ApiKey-Check für `ktConfigured`.

- **Sprint P3-E — Sprint Closeout:**
  - Roadmap Slice 23 auf ✅ gesetzt.
  - `docs/forge-web-deviations.md`: `lib/klicktipp/client.ts:34` aus offenen Abweichungen entfernt.
  - `docs/dev-prompts/OpenActions.md`: Punkt `lib/klicktipp/client.ts:34` als geschlossen markiert.

### Changed
- **Sprint-Prompt-Bereinigung — EXECUTE FIRST Duplikations-Entfernung:**
  - 9 aktive Sprint-Prompts: Duplizierte 5-Gate-Inline-Commands (Checks A–E) durch
    4-Zeilen-Referenz auf `Pre_Slice_Validation.md` ersetzt.
  - PSR wird nun automatisch via PSV Phase 0 erzwungen — kein Shortcut mehr möglich.
  - Betrifft: `sprint-p2f`, `sprint-p3e`–`sprint-p3h`, `sprint-p4a`–`sprint-p4d`.
  - Archivierte Prompts nicht angefasst (historisch).

### Added
- **Sprint P3-D — WordPress REST API Connector (Slice 22):**
  - `lib/wordpress/client.ts`: Vollständiger WP REST API Client mit Basic Auth
    (Application Passwords), `withRetry`, Logger. `createWpDraft()` + `testWpConnection()`.
  - `lib/wordpress/formatter.ts`: Gutenberg-Block-Konverter (Markdown → wp:heading,
    wp:paragraph, wp:list, wp:paragraph.disclaimer). HTML-Freeform-Fallback.
  - `app/api/wordpress/draft/route.ts`: Draft-Upload mit HWG-Gate, AuditLog,
    wpDraftPostId-Tracking, sendNotification.
  - `app/api/wordpress/settings/route.ts`: WP-Credentials speichern (AES-256).
  - `app/api/wordpress/test/route.ts`: Verbindungstest (`/wp-json/wp/v2/users/me`).
  - `app/(dashboard)/settings/wordpress/page.tsx`: Settings-UI (URL + Username +
    Application Password + Test-Button).
  - `components/results/WordPressDraftButton.tsx`: Vollständige Komponente mit
    HWG-Gate-Block, WP-Draft-Status, HTML-Copy-Fallback, Fehleranzeige.
  - `prisma/schema.prisma`: `wpDraftPostId` auf Project-Modell.
  - Settings-Tab "WordPress" in `/settings`-Navigation.
  - AuditAction-Typen: `wordpress.draft_created`, `wordpress.draft_blocked`.

### Changed
- CI: `prisma generate` Schritt in GitHub Actions hinzugefügt (TypeScript-Types verfügbar)
- Deploy-Workflow: Veralteter Branch-Trigger entfernt
- Typographie-Fix: Deutsche Anführungszeichen als HTML-Entities in ApiKeyList + GenerationProgress
- ESLint-Konfiguration hinzugefügt (next/core-web-vitals)
- Sprint P3-C Prompt archiviert
- Sprint P3-D Prompt archiviert, Roadmap Slice 22 auf ✅ gesetzt

### Added
- Settings Hub-Seite (`/settings`) mit Tab-Navigation: API-Keys, Canva, E-Mail,
  Kosten & Abrechnung, Benutzer, Passwort. Sidebar zeigt nun einen einzelnen
  "Einstellungen"-Link statt 4 lose Unterlinks.
- `.env.example`: Dokumentationsblöcke für Hedy (Slice 20) und KlickTipp (Slice 23)
  ergänzt — beide nutzen DB-gespeicherte AES-256-Credentials, nicht `.env`-Variablen.

- Sprint P3-C Drift-Fix — Praxis-Portal Architektur-Alignment:
  - `InvitationToken`-Modell: Separates Modell mit eigenem Lifecycle (TTL, usedAt,
    Audit-Referenz). Einladungstoken 24h gültig (zuvor 7 Tage).
  - `ContentApproval`-Modell: Queryable DB-Feld statt JSON-Blob in `textResults`.
    Indexiert nach `[projectId, status]` für Dashboard-Badge-Queries.
  - Cookie-basierte Praxis-Session: Token ist nur noch einmaliger Login-Initiator.
    Danach signierter httpOnly-Cookie (jose JWT, 7 Tage, SameSite=Lax).
    API-Routen lesen `projectId` aus Cookie (Mandantentrennung gesichert).
  - `lib/praxis/session.ts` NEU: `getPraxisSession()` / `setPraxisSession()`.
  - `PRAXIS_SESSION_SECRET` als neuer `.env`-Eintrag dokumentiert.
  - Datenmigrations-Script: `scripts/migrate-praxis-drift.ts`.

### Breaking (Praxis-Portal API)
- `/api/praxis/comments` und `/api/praxis/approve`: `token`-Parameter entfernt.
  Auth erfolgt nun via httpOnly-Cookie (automatisch nach erstem Token-Login).

- Sprint P3-C (Slice 21) — Praxis-Portal Härting + Dashboard-Badge:
  - `app/api/praxis/invite/route.ts` MOD: Einladungstoken via `crypto.randomUUID()`
    statt `cuid()` (kryptographisch sicher); AuditLog-Eintrag (`praxis.invite`).
  - `app/api/praxis/approve/route.ts` MOD: AuditLog-Eintrag (`praxis.approve`) +
    E-Mail-Benachrichtigung an Agentur bei Praxis-Freigabe via `sendNotification`.
  - `app/api/praxis/comments/route.ts` MOD: AuditLog-Eintrag (`praxis.comment`)
    bei neuem Kommentar.
  - `app/(dashboard)/page.tsx` MOD: Neuer StatCard "Praxis-Kommentare" mit
    rotem Badge-Punkt wenn > 0. Zählt Praxis-Kommentare der eigenen Projekte.
  - `lib/audit/logger.ts` MOD: `AuditAction` um `praxis.approve`, `praxis.comment`,
    `praxis.invite` erweitert.

### Fixed
- Sprint P3-C: `app/(praxis)/review/[token]/page.tsx` — stiller Catch durch
  geloggte Variante ersetzt (`console.error('[Vysible] ...')`, resilience §3a).
- Sprint P3-C: Touch-Targets in `ApprovalButton.tsx` und `CommentThread.tsx`
  auf min. 44px (`min-h-[44px]`) angehoben (plan.md NFA-Pflicht).

### Changed
- `.windsurf/rules/schicht-0/command-result-interpretation.md` NEU: Regel für
  Post-Tool-Call-Response-Disziplin, PowerShell-Select-String-Semantik und
  Known-Long-Running-Commands (verhindert stille Agent-Stalls).
- Sprint P3-C Closeout: `docs/dev-prompts/archive/sprint-p3c-praxis-portal.md`
  archiviert; `docs/roadmap.md` Slice 21 auf "✅ Abgeschlossen (2026-05-15,
  Sprint P3-C)" gesetzt, Phase-3-Fortschritt von ~45 % auf ~55 % angehoben.

### Added
- Sprint P3-A (Slice 27) — Kosten-Tracking pro Kunde:
  - `prisma/schema.prisma`: `CostSettings`-Modell hinzugefügt (Schwellwert-Konfiguration).
    Migration `20260515110000_add_cost_settings` erstellt und auf Prod-DB applied
    (via SSH → psql direkt im DB-Container `s7q3ix0pj9ztc2n8koblu0dz` auf VPS 72.62.115.121).
  - `lib/costs/threshold-checker.ts` NEU: Prüft nach jedem `trackCost()`-Call ob
    monatliche Kosten den konfigurierten Schwellwert überschreiten; sendet E-Mail
    via `sendNotification('cost_threshold_exceeded', ...)` wenn Schwellwert erreicht.
    Non-fatal: Fehler werden geloggt, kein Rethrow.
  - `lib/costs/tracker.ts` MOD: `checkCostThreshold()` nach DB-Write aufgerufen
    (non-fatal, catch mit `logger.warn`).
  - `lib/email/mailer.ts` MOD: `EmailTrigger` um `'cost_threshold_exceeded'` erweitert.
  - `lib/email/templates/notification.ts` MOD: Subject für `cost_threshold_exceeded`
    hinzugefügt ("Vysible: Kosten-Schwellwert überschritten").
  - `app/api/settings/cost-threshold/route.ts` NEU: GET + PUT für Schwellwert-
    Konfiguration (nur ADMIN). Erstellt `CostSettings`-Eintrag wenn noch nicht vorhanden.
  - `app/(dashboard)/settings/billing/page.tsx` NEU: Billing-Dashboard mit globaler
    Übersicht (Gesamtkosten, laufender Monat, Ø pro Paket), Pro-Projekt-Tabelle,
    Marge-Kalkulation und Schwellwert-Konfiguration. Nur für ADMIN-User.
  - `components/kpi/CostBreakdownTable.tsx` NEU: Client-Komponente für Pro-Projekt-
    Kosten-Tabelle mit CSV-Download-Button pro Projekt.
  - `components/kpi/MarginCalculator.tsx` NEU: Client-Komponente für Marge-Kalkulation
    (Kundenpreis eingeben → Marge % + Gewinn/Monat berechnen).
  - `components/kpi/CostThresholdConfig.tsx` NEU: Client-Komponente für Schwellwert-
    Konfiguration (Schwellwert in €, Toggle für Warnungen aktiv/inaktiv, Speichern-Button).

### Added
- Sprint P3-B (Slice 20) — Hedy-Integration (Transkript → Positionierungsdokument):
  - `lib/hedy/client.ts` MOD: `listSessions()` + `fetchTranscript()` (Hedy API,
    Bearer-Token Auth); `generatePositioningFromTranscript()` mit `withRetry` +
    45s-AbortController; step=`positioning_generation`; `{{transcript}}`-Placeholder.
  - `lib/hedy/transcript-parser.ts` NEU: Normalisiert Hedy-Rohtranskrip
    (Speaker-Labels, 12.000-Zeichen-Kappung mit Mitte-Truncation).
  - `app/api/hedy/import/route.ts` MOD: GET `?action=sessions` + GET
    `?action=transcript&id=` + POST KI-Transform; Hedy-Key-Lookup via Prisma
    (Provider HEDY); 422 wenn kein Key; `logger.error` in catch-Blöcken.
  - `prompts/positioning.yaml` MOD: Markdown-Header-Format (8 strukturierte
    Felder); `{{transcript}}`-Placeholder.
  - `components/wizard/HedyImport.tsx` MOD: 5-Schritt-Flow (idle → select →
    transcript → generate → preview); editierbare Vorschau vor Speicherung;
    422-Handling mit Link-Hinweis; `console.error('[Vysible] …')` in allen catches.

- Sprint P3-B Closeout: `docs/dev-prompts/archive/sprint-p3b-hedy.md` archiviert;
  `docs/roadmap.md` Slice 20 auf "✅ Abgeschlossen (2026-05-15, Sprint P3-B)" gesetzt,
  Phase-3-Fortschritt von ~30 % auf ~45 % angehoben;
  `docs/dev-prompts/OpenActions.md` um Acceptance-Verifikations-Checkliste ergänzt
  (13 Punkte, offen bis Hedy-API-Key + Test-Session verfügbar).

### Changed
- Governance: HARD-FAIL-Verhalten in Pre-Slice Validation verschärft — alle 16 `sprint-*.md`
  erhalten explizites `SOFORT STOP. Kein weiterer Befehl. Kein weiterer Check. Keine Parallelisierung.
  Dann await User-Freigabe.` statt einfachem `STOP.`. Neue Schicht-0-Regel
  `.windsurf/rules/schicht-0/sprint-validation-hardfail.md` als absolutes Agent-Verhaltensverbot.
- Sprint 3 Abschluss (PII-Verschlüsselung): `scripts/migrate-pii.ts` via SSH-Tunnel gegen
  Prod-DB ausgeführt — 1 User (`emailEncrypted` + `nameEncrypted`) verschlüsselt.
  Coolify API Token in `.env` eingetragen (war Platzhalter). `COOLIFY_APP_UUID` auf neue
  Prod-App `nndzr03dlpcfony81kja6lb6` (vysible.cloud) hinzuweisen.
- Sprint P3-A Closeout (Slice 27): `docs/dev-prompts/archive/sprint-p3a-kosten-tracking.md`
  archiviert; `docs/roadmap.md` Slice 27 auf "✅ Abgeschlossen (2026-05-15, Sprint P3-A)"
  gesetzt, Phase-3-Fortschritt von ~15 % auf ~30 % angehoben; `docs/dev-prompts/OpenActions.md`
  um Sprint-P3-A-Abschnitt ergänzt (DB-Migration für CostSettings-Modell).
- `.env.example`: Canva-OAuth-2.0-Block ergaenzt (`CANVA_CLIENT_ID`,
  `CANVA_CLIENT_SECRET`) mit Hinweis auf Canva Developer Portal und
  Redirect-URIs fuer Dev + Prod.
- `docs/dev-prompts/OpenActions.md`: Neuer Abschnitt "Sprint P2-E" mit
  zwei Einmal-Aktionen (Canva Developer Portal + DB-Migration); Sprint-0-
  und P2-E-DB-Migrations-Punkte als erledigt markiert (alle 7 Migrationen
  auf Live-DB verifiziert via `_prisma_migrations`).
- Sprint P2-E Closeout (Slice 17): `docs/dev-prompts/archive/sprint-p2e-canva.md`
  archiviert (Sprint-Prompt aus aktivem Verzeichnis entfernt); `docs/roadmap.md`
  Slice 17 auf "✅ Abgeschlossen (2026-05-15, Sprint P2-E)" gesetzt, Phase-2-
  Fortschritt von ~45 % auf ~85 % angehoben; `docs/dev-prompts/OpenActions.md`
  um Backlog-Eintrag "SocialTokenStatusSection auf OAuth-Modelle umstellen"
  ergänzt (laut PSR Option A — Cleanup im Rahmen von Slice 18 / Sprint P2-F).
- Sprint P2-E (Slice 17, Sub-Slice B) — Canva-Ordner-Abruf + Wizard-Selector + Kontext-Injektion:
  - `lib/canva/client.ts` MOD: Stub durch echte OAuth-basierte API-Calls ersetzt.
    Neue Funktion `listFolders(userId)` für das Wizard-Dropdown; bestehende
    `listFolderAssets(folderId, userId)` hat jetzt eine zweite Parameter-Position
    `userId` und holt Bearer-Token via `getValidCanvaToken(userId)` (statt
    `ApiKey`-CANVA-Row). Beide Calls in `withRetry` (NFA-06, `resilience §3c`).
    `buildCanvaContext()` limitiert auf 20 Asset-Namen (Token-Budget).
    Neuer Helper `logCanvaError()` für non-fatales Logging.
  - `lib/generation/pipeline.ts` MOD: `canva_loaded`-Step ruft jetzt
    `listFolderAssets(project.canvaFolderId, project.createdById)` auf —
    OAuth-Token des Projekt-Erstellers wird verwendet. Catch-Block bleibt
    non-fatal (`logger.warn` + leerer Kontext).
  - `app/api/canva/folders/route.ts` NEU: `GET /api/canva/folders` liefert
    Ordner-Liste für Wizard-Dropdown. 401 wenn nicht eingeloggt, 200 mit
    `{ connected: false, folders: [] }` wenn keine Canva-Verbindung,
    502 bei Canva-API-Fehler (mit `logger.warn`, kein Token-Leak).
  - `app/api/projects/[id]/canva/route.ts` MOD: `listFolderAssets`-Aufruf
    auf neue Signatur umgestellt; `createdById` aus Projekt-Select; Fehler
    werden jetzt strukturiert geloggt (`logger.warn` mit `projectId`).
  - `app/api/projects/route.ts` MOD: `createSchema` akzeptiert optionalen
    `canvaFolderId` (1–200 Zeichen); wird in `prisma.project.create` als
    `canvaFolderId` persistiert.
  - `components/wizard/CanvaFolderSelector.tsx` NEU: Client-Komponente für
    Wizard-Step-3 mit vier Lade-Zuständen (loading / not_connected / load_error /
    ready). Nicht verbunden → Soft-Hinweis mit Link auf `/settings/canva`,
    kein Hard-Fail im Wizard. JSON-Parse-Fehler werden mit `console.warn`
    geloggt (Forge `resilience §3a` konform).
  - `components/wizard/NewProjectWizard.tsx` MOD: `WizardData` um
    `canvaFolderId` / `canvaFolderName` erweitert; POST-Body sendet
    `canvaFolderId`.
  - `components/wizard/Step3Context.tsx` MOD: `<CanvaFolderSelector>` unter
    "Themen-Pool" eingebaut; Wizard-State wird via `onChange` aktualisiert.

- Sprint P2-E (Slice 17, Sub-Slice A) — Canva OAuth 2.0 Flow + Token-Storage:
  - `prisma/schema.prisma` MOD: Neues `CanvaToken`-Modell mit
    `encryptedAccessToken`, `encryptedRefreshToken`, `expiresAt`, `scope`;
    1:1-Relation zu `User` mit `onDelete: Cascade`.
  - `prisma/migrations/20260515090000_canva_oauth_token/migration.sql`: SQL-Migration
    (CreateTable + Unique-Index + FK).
  - `lib/canva/auth.ts` NEU: OAuth-Helpers `buildAuthorizeUrl()`,
    `exchangeCodeForToken()`, `persistCanvaToken()`, `getValidCanvaToken()` mit
    Auto-Refresh (5-min-Puffer), `isCanvaConnected()`, `getCanvaConnectionStatus()`,
    `disconnectCanva()`. Alle Canva-Token-Endpoint-Calls über `withRetry`
    (NFA-06, `resilience.mdc §3c`). Access- und Refresh-Token AES-256-GCM
    verschlüsselt via `lib/crypto/aes.ts` (ADR-003).
  - `app/api/canva/oauth/route.ts` NEU: `GET /api/canva/oauth` initiiert den
    OAuth-Flow, setzt httpOnly-State-Cookie (`canva_oauth_state`, 10min TTL,
    SameSite=Lax) und redirected zur Canva-Authorize-URL mit Minimal-Scope
    `asset:read design:content:read`.
  - `app/api/canva/oauth/callback/route.ts` NEU: `GET .../callback` verifiziert
    State (CSRF), tauscht Code gegen Token, persistiert verschlüsselt,
    redirected zu `/settings/canva?connected=1`. State-Mismatch → 400,
    Token-Exchange-Fehler → Redirect mit Error-Parameter (kein Klartext-Token
    in Response oder Log).
  - `app/api/canva/disconnect/route.ts` NEU: `POST /api/canva/disconnect`
    entfernt die `CanvaToken`-Row des eingeloggten Users.
  - `app/(dashboard)/settings/canva/page.tsx` NEU: Server Component zeigt
    Verbindungsstatus (Verbunden + Ablaufdatum + Scope, oder Nicht verbunden +
    Connect-Button). Error-Banner für OAuth-Fehler.
  - `app/(dashboard)/settings/canva/CanvaDisconnectButton.tsx` NEU: Client
    Component für Disconnect mit Confirm-Dialog und `router.refresh()`.
  - `components/layout/sidebar.tsx` MOD: Neuer Navigationspunkt
    "Canva-Verbindung" zwischen "API-Keys" und "E-Mail-Benachrichtigungen".

- `docs/dev-prompts/Sprint_Closeout.md` (v1.0.0) — verbindlicher 4-Schritt-
  Abschluss-Workflow (Roadmap, OpenActions, Prompt-Archivierung, CHANGELOG),
  als Reaktion auf den übersehenen Archivierungs-Schritt in Sprint P2-C.
  Output-Format mit PASS/FAIL pro Schritt, Hard-STOP wenn Closeout
  unvollständig.
- `docs/dev-prompts/Pre_Slice_Validation.md` (v1.3.0) — Verweis auf
  `Sprint_Closeout.md` ergänzt; der Closeout ist ab sofort verbindlich
  vor jedem Commit-Vorschlag auszuführen.
- Sprint P2-D Closeout: `docs/dev-prompts/archive/sprint-p2d-dataseo.md`
  archiviert (Sprint-Prompt aus aktivem Verzeichnis entfernt);
  `docs/roadmap.md` Slice 11a auf
  `✅ Abgeschlossen (2026-05-15, Sprint P2-D · Commit 14906ad)` gesetzt.
  Erste vollständige Anwendung des 4-Schritt-Workflows aus `Sprint_Closeout.md`.
- `prisma/schema.prisma`: Neues Modell `CanvaToken` (verschlüsselte
  AccessToken/RefreshToken, `expiresAt`, `scope`, `userId`-Unique-Relation
  zu `User`) als Schema-Vorbereitung für Sprint P2-E (Canva OAuth 2.0,
  Slice 17).
- `prisma/migrations/20260515090000_canva_oauth_token/migration.sql`:
  Zugehörige SQL-Migration (CREATE TABLE `CanvaToken` + Unique-Index
  auf `userId` + FK `CanvaToken_userId_fkey ON DELETE CASCADE`).
  `prisma migrate deploy` gegen die Live-DB steht aus
  (siehe OpenActions.md Sprint 0).
- Sprint P2-E (Slice 17, Work-in-Progress): erste Bausteine für
  Canva OAuth 2.0 Flow:
  - `lib/canva/auth.ts`: `buildAuthorizeUrl`, `exchangeCodeForToken`,
    `persistCanvaToken`, `getValidCanvaToken` (mit 5-min-Refresh-Puffer),
    `isCanvaConnected`, `getCanvaConnectionStatus`, `disconnectCanva`.
    AES-256-GCM-Verschlüsselung für Access-/Refresh-Token,
    `withRetry`-Wrap auf allen Canva-API-Calls, strukturierte Logs
    ohne Token-Echo.
  - `app/api/canva/oauth/route.ts`: Initiiert OAuth-Flow mit
    httpOnly-State-Cookie (CSRF-Schutz, 10-min-TTL, single-use).
  - `app/api/canva/oauth/callback/route.ts`: State-Validierung,
    Code-gegen-Token-Tausch, Persistierung; sauberes Error-Handling.
  - Ergänzt das bereits committete `CanvaToken`-Schema.
  - Offen für Sprint P2-E (siehe `docs/dev-prompts/sprint-p2e-canva.md`):
    Settings-UI `/settings/canva`, Ordner-Such-UI, Asset-Listing-Endpunkt;
    `safeReadError` in `lib/canva/auth.ts` enthält noch einen bare
    `catch` ohne Logging (Forge-Regel `resilience §3a`-Verstoß),
    Fix im P2-E-Self-Review.
- `docs/dev-prompts/GENERATE-SPRINT-PROMPTS.md` (v1.0): Meta-Anleitung,
  wie aus `plan-v6.1.md` + `roadmap.md` + `decisions.md` +
  `forge-web-deviations.md` + `OpenActions.md` neue Sprint-Slice-Prompts
  im Vysible-Format generiert werden. Enthält Pflicht-Eingabedateien,
  Reihenfolge-Ableitung, Format-Vorlage, Tier-Klassifikation,
  Sub-Slice-Aufteilung, Resilience-/Sicherheits-Pflichtmuster,
  Qualitätsprüfungs-Checkliste und Beispiel-Aufruf.
- Alle offenen Sprint-Prompts (P2-E, P3-A, P3-B, P3-C, P3-D, P3-E, P3-F, P3-G)
  und `Example_Prompt.md` enthalten jetzt einen
  `## CRITICAL: Sprint Closeout (Pflicht vor Commit)`-Block direkt vor
  dem Abschlussbericht bzw. Auto-Commit-Block — verbindlicher Verweis
  auf den 4-Schritt-Workflow inkl. Hard-STOP-Regel bei FAIL. Schließt die
  P2-C-Lücke prozessual für alle künftigen Sprints.
- `docs/dev-prompts/archive/sprint-p2c-email.md`: Sprint-Prompt P2-C nach
  Abschluss archiviert; aktive Datei aus `docs/dev-prompts/` entfernt.
- Slice 19 (Sprint P2-C): SMTP-Settings unter `/settings/smtp` mit Admin-Schutz,
  Formular + Testmail-Flow (`[OK]/[FAIL]`) sowie neuen API-Routen
  `/api/settings/smtp` (GET/POST/PUT) und `/api/settings/smtp/test`.
- `lib/email/templates/notification.ts`: Einheitliches HTML-Mail-Template für
  Benachrichtigungen (`generation_complete`, `draft_uploaded`, `published`,
  `share_approved`) bei gleichzeitigem Text-Fallback im Mailversand.
- `lib/email/smtp-config.ts`: Geteilter Helper für Empfänger-Validierung
  (trim, max. 5, Basis-E-Mail-Format) zur Wiederverwendung in SMTP-APIs.
- `ShareAccess.tsx`: Newsletter-Abschnitt im Kunden-Freigabelink — Betreff A/B,
  Preheader und Body (HTML) werden read-only angezeigt, Abschnitt nur sichtbar
  wenn Daten vorhanden (Sprint P2-B, Sub-Slice B, Slice 10 — FA-F-26).
- `ShareAccess.tsx`: Social-Media-Abschnitt im Kunden-Freigabelink — Instagram,
  Facebook und LinkedIn Posts mit Text und Zeichenzahl-Anzeige (Limit-Überschreitung
  in Rot), pro Monat gruppiert, read-only (Sprint P2-B, Sub-Slice B, Slice 10).
- Sprint P2-D (Slice 11a): Neue API-Route `POST /api/dataseo/keywords`
  (`app/api/dataseo/keywords/route.ts`) für DataForSEO-Keyword-Recherche
  inkl. Session-Auth, DATASEO-Key-Lookup aus `ApiKey`, AES-Decrypt und
  kombinierter Antwort aus Keyword-Daten + PAA-Fragen.
- Wizard Schritt 3: Neue Client-Komponente `components/wizard/KeywordReview.tsx`
  mit editierbarer Keyword-Liste, optionalem DataForSEO-Abruf per Button,
  12s Timeout-Fallback und togglebaren PAA-Chips; in `Step3Context` integriert.
- DataForSEO-Client erweitert (`lib/dataseo/client.ts`) um echte Live-Calls:
  `fetchKeywordsForKeywords()` und `fetchPaaQuestions()` mit `withRetry`,
  Parsern für API-Responses und Cost-Tracking (`step: 'dataseo'`).

### Changed
- `lib/costs/tracker.ts`: `trackCost()` akzeptiert optional `costEur`, damit
  nicht tokenbasierte Provider-Kosten (z.B. DataForSEO) direkt aus API-Kosten
  in `CostEntry.costEur` persistiert werden koennen.
- `app/api/projects/[id]/keywords/route.ts`: DataForSEO-Suggestions laufen
  weiterhin ueber den bestehenden Endpunkt, jetzt user-spezifisch ueber `session.user.id`
  beim API-Key-Lookup.

### Fixed
- Sprint P2-E: Zwei stille Catches im aktiven Sprint-Scope geschlossen
  (`resilience §3a`):
  - `app/(dashboard)/settings/canva/CanvaDisconnectButton.tsx:21`:
    `res.json().catch(() => ({}))` → JSON-Parse-Fehler werden jetzt mit
    `console.warn('[Vysible] Canva-Disconnect JSON-Parse fehlgeschlagen', err)`
    geloggt (Client-Component-Pattern, konsistent mit der akzeptierten
    Forge-Abweichung).
  - `lib/canva/auth.ts` `safeReadError()`: bare `catch {}` durch
    `catch (err: unknown) { logger.warn(...) }` ersetzt — Body-Lese-Fehler
    sind jetzt sichtbar.
- Slice 19 (Sub-Slice A): Stille `sendNotification(...).catch(() => {})`-Stellen
  in `app/api/wordpress/draft/route.ts`, `lib/tokens/expiry-checker.ts`,
  `lib/costs/reporter.ts`, `app/api/praxis/invite/route.ts`,
  `app/api/klicktipp/campaign/route.ts` sowie `lib/generation/pipeline.ts`
  durch geloggte non-fatal Catches (`logger.warn`) ersetzt (`resilience §3a`).
- Sidebar: Neuer Navigationseintrag „E-Mail-Benachrichtigungen“ unter
  `/settings/smtp` ergänzt.
- `ShareAccess.tsx`: `verify()` hatte `try/finally` ohne `catch` — Netzwerkfehler
  wurden still geschluckt. Neu: `catch` zeigt "Verbindungsfehler"-Meldung und
  loggt via `console.error('[Vysible] …')` (Option A, Sprint P2-B — Forge `resilience §3a`).
- `ContentCalendar.tsx`: Stiller `try/finally`-Block in `handleDrop` durch
  `catch` mit UI-Rollback ersetzt — bei API-Fehler springt das Item zum
  Ursprungsmonat zurück und `console.error('[Vysible] …')` wird geloggt
  (Sprint P2-B, Sub-Slice A, Slice 7 — Forge `resilience §3a`).

### Added
- `docs/dev-prompts/Pre_Sprint_Review.md` (v2.1.0) — fachliche Sprint-Prompt-Prüfung
  mit 8 Checks (Scope, Abhängigkeiten, ADRs, Forge-Regeln, FA-/NFA-IDs, Code-Realität,
  Acceptance, Risiken). Wird automatisch als Phase 0 der Pre_Slice_Validation
  aufgerufen; manueller Aufruf via `PSR für <prompt-datei>` weiterhin möglich.
- `docs/dev-prompts/sprint-p2a-editor-chat.md` — Sprint-Prompt P2-A (Slice 6 + 8).
  Archiviert nach `docs/dev-prompts/archive/` nach Sprint-Abschluss am 2026-05-14.
- `docs/dev-prompts/sprint-p2b-kalender-sharing.md` — Sprint-Prompt P2-B (Slice 7 + 10).
- `docs/dev-prompts/sprint-p2c-email.md` — Sprint-Prompt P2-C (Slice 19).
- KI-Chat (`ChatPanel.tsx`): Sichtbarer Konversationsverlauf — jede Chip-Aktion und
  Freitext-Anweisung erzeugt ein User-Bubble + Assistant-Bubble (80-Zeichen-Plain-Text-
  Vorschau der Überarbeitung). Versionswiederherstellung erscheint als System-Marker
  ("Version X wiederhergestellt"). Thread scrollt automatisch zum neuesten Eintrag
  (Sprint P2-A, Sub-Slice B, Slice 8 — FA-F-23).
- KI-Chat: Header zeigt Artikel-Titel ("KI-Überarbeitung: <Titel>") via neuem
  `articleTitle`-Prop. Fallback auf Kanal-Bezeichnung wenn Titel fehlt
  (Slice-8-Kontext-Binding).

### Changed (Sprint P2-A Closeout)
- `docs/roadmap.md`: Slice 6 (Text-Editor) und Slice 8 (Chat + Versionen) im
  Phase-2-Backlog von "⚠️ Teilweise" auf "✅ Abgeschlossen (2026-05-14, Sprint
  P2-A)" mit Commit-Hashes (`bc6f205`, `581aaab`) aktualisiert.
- `docs/forge-web-deviations.md`: Drei in Sprint 0 (Commit `b5c80f2`)
  geschlossene Resilience-Abweichungen aus den offenen Einträgen in die
  geschlossene Tabelle verschoben (`pipeline.ts` `sendNotification`-Catch,
  `checkScraperHealth` bare catch, `withRetry`-Wrapper). Zwei neue offene
  Einträge ergänzt: Client-Component-Logger (Browser-tauglicher Logger fehlt)
  und Restbestand stiller Catches in Slices 23/25/26/27 (Sprint 0a geplant).
- `docs/dev-prompts/OpenActions.md`: Backlog um zwei Punkte erweitert —
  Sprint 0a (5 Restbestand-stille-Catches schließen) und Browser-tauglicher
  Logger (mit Optionsvergleich pino/browser, consola, eigener Wrapper).
- `docs/roadmap.md`: Slice 19 im Phase-2-Backlog auf
  "✅ Abgeschlossen (2026-05-15, Sprint P2-C)" gesetzt.
- `docs/dev-prompts/OpenActions.md`: temporären P2-C-Nachlaufblock nach
  Umsetzung entfernt; verbleibende offene Punkte bleiben in den
  sprintübergreifenden Abschnitten.

### Changed (Sprint-Prompt-Vorlagen Self-Review-Regel präzisiert)
- `docs/dev-prompts/sprint-p2b-kalender-sharing.md`: Self-Review-Bullet
  "`logger.*` statt `console.*`" auf präzise Server/Client-Trennung erweitert.
  Abschluss-Validation-Skript entsprechend differenziert (Server: keine
  `console.*`; Client: nur `console.warn/error('[Vysible] …', err)`).
  Acceptance- und Abschlussbericht-Bullets ebenfalls präzisiert.
- `docs/dev-prompts/sprint-p2c-email.md`: Self-Review-Bullet entsprechend
  präzisiert; Sprint-spezifischer Hinweis ergänzt (Sub-Slice A = Server,
  Sub-Slice B/C = Client).
- `docs/dev-prompts/Pre_Sprint_Review.md`: PSR Check 7 (Acceptance-Qualität)
  Forge-Compliance-Frage konkretisiert um Logger-Trennung und
  `[Vysible]`-Prefix-Regel.
- Hintergrund: Die alte Regel "`logger.*` statt `console.*`" war in Client-
  Components technisch unerfüllbar (pino-pretty server-only). Künftige
  Sprint-Prompts dokumentieren die Trennung sauber, ohne DRIFT-Eintrag pro
  Sprint zu produzieren. Wird obsolet, sobald Browser-Logger eingeführt ist
  (siehe `OpenActions.md` Backlog-Punkt 2).
- Folgekorrektur: `docs/dev-prompts/sprint-p2b-kalender-sharing.md` enthielt
  zwei verbleibende Inkonsistenzen — Code-Beispiel `handleDrop` und Acceptance-
  Bullet zum Drag-Fehler nutzten `logger.error` für eine Client-Component
  (`ContentCalendar.tsx`). Beide auf `console.error('[Vysible] …', err)` mit
  Inline-Kommentar zur Begründung umgestellt.

### Fixed
- Editor-Autosave: Stiller Catch in `EditorView.tsx` und `ResultsTabs.tsx`-Autosave durch
  geloggte Catch-Blöcke ersetzt. SaveIndicator wird jetzt aus `ResultsTabs` (per-Item-State)
  gesteuert statt aus `EditorView` — "Gespeichert" erscheint erst nach erfolgreicher
  API-Antwort, "Fehler beim Speichern" bei HTTP-Fehler. Doppel-Debouncing (5s+5s)
  beseitigt (Sprint P2-A, Sub-Slice A, Slice 6).
- `SharePanel.tsx`: Drei stille Catches (load/create/revoke) durch geloggte Catches
  ersetzt — `console.warn('[Vysible] …')` mit kontextuellem Fehlertext (Sprint P2-A,
  Forge-Regel `resilience §3a`).
- `ChatPanel.tsx`: Stiller catch im send()-Pfad (`setError` only) durch
  `console.error('[Vysible] Chat-Überarbeitung fehlgeschlagen', err)` + Error-Bubble
  im Thread ergänzt (Forge-Regel `resilience §3a`).

### Changed
- `docs/dev-prompts/Pre_Slice_Validation.md` (v1.2.0):
  - **Phase 0 (PSR) als automatischer Auto-Aufruf** zu Sprint-Beginn integriert.
    Maintainer muss PSR nicht mehr manuell triggern.
  - Override-Syntax `GO trotz WARN: <Begründung>` für Phase-0-WARN-Fälle (Variante B,
    pragmatisch).
  - **Whitelist für Check A (Working Tree):** Dirty Files unter `docs/dev-prompts/`,
    `docs/forge-migration-audit.md` und `docs/ERROR-Log.md` lösen kein STOP mehr aus —
    nur Hinweis im Bericht. Verhindert nervigen Hard-FAIL beim Anlegen neuer
    Sprint-Prompts oder Archiv-Verschiebungen.
  - Check E (Vitest) aktiviert (war seit v1.1.0).

### Added (Sprints)
- Pipeline — Canva-Context-Injektion (Phase-1-Restarbeiten):
  - `lib/generation/pipeline.ts` MOD: `canva_loaded`-Step ruft `listFolderAssets()` auf wenn `project.canvaFolderId` gesetzt; Fallback auf leeren Kontext wenn API nicht erreichbar (kein Hard-Fail); SSE-Event zeigt `assetCount` oder `skipped`
  - `lib/generation/themes.ts` MOD: `canvaContext` an Themes-Prompt übergeben
  - `lib/generation/texts.ts` (bereits aus Slice D): `canvaContext` im `TextsInput`-Interface vorbereitet, wird an `texts_done`-Step aus `PipelineCtx` weitergereicht
  - Kein Canva-API-Key im Frontend oder in Logs (nur ID)

- Slice 13 — Blog-Gliederungsschritt (Phase-1-Restarbeiten, FA-KI-04):
  - `prompts/blog-outline.yaml` NEU — Gliederungs-Prompt (H1 + 3–5 H2 + je 1 Satz, HWG-konform, ~150–200 Wörter)
  - `lib/generation/texts.ts` MOD: `generateBlogOutlines()` (exportiert) — Gliederung für alle Blog-Themen; Gliederung als Kontext an `generateBlogPost()` übergeben
  - `lib/generation/types.ts` MOD: `GENERATION_STEPS` um `blog_outline_done` erweitert (zwischen `plans_done` und `texts_done`); `STEP_LABELS` ergänzt
  - `lib/generation/pipeline.ts` MOD: `blog_outline_done`-Step ausgeführt, Outline in `PipelineCtx` gespeichert, SSE-Event `blog_outline_done` emittiert; `texts_done` erhält `blogOutlines` und `canvaContext` aus Context
  - CostEntry mit `step: 'blog-outline'` pro Blog-Thema in DB

- Slice 9 — Export-Dateinamen-Konvention (Phase-1-Restarbeiten):
  - `lib/export/zip.ts` MOD: `filename()` nutzt deutsches Monatsformat "Apr2027" statt numerischem "202704"
  - `lib/export/zip.ts` MOD: `deriveFilePrefix()` (exportiert) — erste 3 Großbuchstaben des ersten signifikanten Worts; Titel/Gattungsbegriffe werden übersprungen; Umlaut-Normalisierung; Fallback "PRX"
  - `app/api/projects/[id]/export/route.ts` BUGFIX: `praxisKuerzel: ''` (leer) durch `deriveFilePrefix(praxisName)` ersetzt
  - Unit-Tests: `__tests__/unit/export/zip.test.ts` — 7 Cases (WAR, MUE, HAU, PRX-Fallback, Sonderzeichen, Gattungsbegriff, Mehrteilig) — 7/7 PASS

- Slice 4 — API-Key-Manager Erweiterungen (Phase-1-Restarbeiten):
  - Pro-Projekt-Key-Auswahl (FA-F-11a): `Project.apiKeyId` (nullable FK zu `ApiKey`), Prisma-Migration `20260514211000_project_api_key_selection`
  - `lib/ai/client.ts` MOD: `getAnthropicClient(projectApiKeyId?)` und `getOpenAIClient(projectApiKeyId?)` — projektspezifischer Key mit globalem Default-Fallback
  - Pipeline, themes.ts, texts.ts: `project.apiKeyId` wird an AI-Client weitergereicht
  - `/api/projects/[id]/settings` (GET/PATCH): apiKeyId lesen und speichern
  - `/projects/[id]/settings` UI: Dropdown zur Key-Auswahl pro Provider (Anthropic, OpenAI)
  - API-Keys-Seite: `SocialTokenStatusSection` — zeigt Canva-Token-Status (gültig/abgelaufen) mit "Bitte erneuern"-Hinweis
  - `lib/types/prisma.ts` MOD: `apiKeyId` im Project-Interface ergänzt

- Slice 16 — Auth-Lücken (Phase-1-Restarbeiten):
  - Passwort-Vergessen-Flow: `/api/auth/forgot-password` (Token-Generierung + SMTP), `/api/auth/reset-password` (Token-Validierung + bcrypt-Hash), `app/(auth)/reset-password/page.tsx` (Reset-Formular)
  - Login-Seite: "Passwort vergessen?"-Link + Inline-Formular ohne Seitennavigation
  - Prisma-Migration `20260514210000_auth_reset_token`: `User.resetToken`, `User.resetTokenExpiry` (nullable, Single-Use, 1h Ablauf)
  - Admin-User-Verwaltung: `GET /api/admin/users`, `PATCH /api/admin/users/[id]` (active, role), UI unter `/settings/users` (nur Admins sichtbar)
  - `components/auth/AutoLogoutProvider.tsx`: Client-Komponente mit 30-Min-Inaktivitäts-Timer (reset bei click/keypress/mousemove/scroll/touchstart)
  - Dashboard-Layout: `AutoLogoutProvider` eingebunden
  - AuditAction-Typen: `admin.user.update`, `admin.user.create` ergänzt

- Sprint 3 — PII-Encryption & Structured Logging:
  - `lib/utils/logger.ts` — Pino-Logger (strukturiertes JSON-Logging, PII-Redaction für email/password/name/encryptedKey)
  - `lib/crypto/aes.ts` MOD: Versions-Präfix `v1:` im Ciphertext-Format (Key-Rotation-vorbereitet)
  - `lib/crypto/aes.ts` MOD: `decrypt()` abwärtskompatibel (erkennt Legacy-Format ohne `v1:`)
  - Prisma-Migration `20260514202000_pii_encryption_fields`: `User.emailEncrypted`, `User.nameEncrypted`, `PraxisUser.emailEncrypted`, `PraxisUser.nameEncrypted` (AES-256-GCM, nullable)
  - `scripts/migrate-pii.ts` — idempotentes Datenmigrations-Skript (Plaintext → AES-256-GCM)
  - Alle `console.*`-Calls in `lib/` ersetzt durch strukturierte `logger.*`-Calls

### Fixed
- `docs/forge-web-deviations.md`: Abweichungen `User.email Plaintext`, `web-encryption-at-rest Versions-Präfix` und `terminal-output` auf Status Resolved gesetzt (Sprint 3)
- Sidebar: Menüpunkt "Ergebnisansicht" (`/results`) wiederhergestellt — war in Commit `fd71beb` versehentlich entfernt worden; Icon und Reihenfolge entsprechen wieder dem Stand vor dem Verlust
- Production-Deploy (`vysible.cloud`): Root Cause identifiziert — Coolify-App `f58gu47l7uwwchjhhd25c0gy` lief seit Stunden auf Commit `90948c4`; manueller Re-Deploy über SSH ausgelöst

### Added (Sprint 2)
- Sprint 2 — Test-Infrastruktur (NFA-16):
  - Vitest 4 Setup: `vitest.config.ts`, Prisma-Mock in `__tests__/setup.ts`, Coverage-Provider v8 (60 %-Schwelle)
  - Unit-Tests: `lib/crypto/aes.ts` — AES-256-GCM Roundtrip, IV-Zufälligkeit, Fehlerfälle (6 Cases)
  - Unit-Tests: `lib/generation/themes-schema.ts` — Schema-Validierung (5 Cases)
  - Unit-Tests: `lib/compliance/hwg-gate.ts` — HWG-Gate Logik (2 Cases)
  - Unit-Tests: `lib/utils/retry.ts` — Exponential-Backoff, 404/429-Handling (5 Cases)
  - Integration-Test: `POST /api/generate/start` — Mock-AI, Job-Anlage, Fehlerpfade (4 Cases)
  - E2E Playwright: Login-Flow — `__tests__/e2e/login.spec.ts` (läuft lokal gegen Dev-Server)
  - GitHub Actions CI: `.github/workflows/ci.yml` — lint + typecheck + vitest (E2E nicht in CI)
  - `lib/compliance/hwg-gate.ts`: `checkHwgGate()` extrahiert aus Export/WordPress-Route — testbar + dedupliziert
  - `app/(auth)/login/page.tsx`: `data-testid="login-error"` für E2E-Playwright ergänzt

- Sprint 1 — Slice 28 (Compliance & Governance):
  - `AuditLog`-Tabelle: vollständiges Aktivitätsprotokoll pro Projekt mit Action, Entity, User, Meta (FA-B-11)
  - `lib/audit/logger.ts`: `writeAuditLog()` — zentraler Audit-Service, eingebunden in project.create, export.download, review mode/flag changes
  - `ReviewMode`-Enum + `reviewMode`-Feld in `Project`: SIMPLE / COMPLETE Review-Workflow (FA-F-31)
  - `hwgFlag`-Boolean in `Project`: Heilmittelwerbegesetz-Compliance-Flag — blockiert Export wenn gesetzt (FA-B-13)
  - `PATCH /api/projects/[id]/review`: Review-Modus und HWG-Flag setzen mit Audit-Log
  - `GET /api/projects/[id]/audit`: Audit-Log-Einträge pro Projekt abrufen (max. 50, neueste zuerst)
  - `components/project/ReviewPanel.tsx`: Client-Komponente zum Umschalten von ReviewMode und HWG-Flag
  - `components/project/AuditLogTab.tsx`: Aktivitätsprotokoll-Tab auf der Projekt-Detailseite (FA-F-32)
  - `/api/projects GET`: Filtert jetzt auf `createdById === session.user.id` — nur eigene Projekte (FA-B-12)
- Navigation: „Praxis-Portal" und „Web-Analytics" in Sidebar eingetragen (Seiten waren implementiert, fehlten nur in `navItems`)
- `GenerationJob`-Tabelle in Prisma: Job-State wird jetzt DB-persistiert — kein Reload-Verlust mehr (NFA-18)
- `SmtpConfig`-Tabelle in Prisma: SMTP-Konfiguration in eigenem Modell statt HEDY-ApiKey-Hack
- `lib/utils/retry.ts`: Gemeinsamer `withRetry`-Wrapper mit exponentiellem Backoff (3 Versuche, 2s/4s/8s)
- `withRetry` auf alle externen IO-Calls angewendet: `scrapeUrl`, `generateThemes`, `generateBlogPost`, `generateNewsletter`, `generateSocialPosts`, `generateImageBrief`, `sendMail` (NFA-06, `resilience.mdc §3c`)
- Forge-Web Consumer-Setup (`forge-web.config.json`, `.github/workflows/forge-sync.yml`)
- Forge-Web Regel-Sync: 14 Governance-Regeln in `.cursor/rules/` und `.windsurf/rules/`
- Maturity-Level `DEVELOPMENT` gesetzt
- Governance-Dokumentation: `docs/decisions.md`, `docs/component-ownership.md`, `docs/forge-web-deviations.md`
- Architektur-Audit und Konzept-Vergleich: `docs/forge-migration-audit.md`, `docs/concept-vs-implementation.md`

### Fixed
- Slice 28 Post-Audit Korrekturen:
  - HWG-Gate in `app/api/wordpress/draft/route.ts` ergänzt — WordPress-Drafts werden bei gesetztem `hwgFlag` mit 403 blockiert (analog Export-Route)
  - `writeAuditLog('generation.start')` in `app/api/generate/start/route.ts` ergänzt — Generierungsstarts werden jetzt protokolliert (FA-B-11)
  - `writeAuditLog('api_key.create')` in `app/api/api-keys/route.ts` ergänzt — API-Key-Anlage wird protokolliert (FA-B-11)
  - PII-Leak behoben: `GET /api/projects/[id]/audit` gibt nicht mehr `userEmail` zurück — nur noch `userId`
  - `AuditLogTab.tsx`: `userEmail` aus Render entfernt; Interface auf `userId` umgestellt
  - `GET /api/projects/[id]/audit`: Limit von 100 auf 50 korrigiert; 404-Guard für ungültige projectId ergänzt; Response-Format auf `{ logs }` vereinheitlicht
  - `PATCH /api/projects/[id]/review`: Ownership-Check ergänzt (403 bei fremden Projekten); `.refine()`-Validierung für leere Body-Payloads ergänzt
- Playwright-Service: `playwright` npm-Abhängigkeit von `^1.49.1` auf exakte Version `1.60.0` gepinnt und `package-lock.json` committet — verhindert automatisches Upgrade auf inkompatible Browser-Binaries bei `npm install`
- `sendNotification(...).catch(() => {})` in `pipeline.ts`: Fehler werden jetzt geloggt statt stumm verworfen (`resilience.mdc §3a`)
- `checkScraperHealth` in `scraper/client.ts`: Bare `catch` durch `catch (err)` mit Warning-Log ersetzt
- DataForSEO-Client: 2 stille Catches mit Warning-Logs versehen (Autocomplete + PAA)
- `blog.yaml`: Variable `{{tonalitaet}}` wurde nicht ersetzt (Key-Mismatch mit `tonalität`)

### Changed
- `job-store.ts`: In-Memory-Store auf DB-backed Hybrid-Store umgestellt (EventEmitter bleibt in-memory für SSE, State in `GenerationJob`)
- `mailer.ts`: Liest SMTP-Konfiguration jetzt aus `SmtpConfig`-Tabelle statt aus zweckentfremdetem HEDY-`ApiKey`-Eintrag
- `themes.ts`: Manueller Retry-Loop durch gemeinsamen `withRetry`-Wrapper ersetzt
- Queue-Modul (`queue.ts`): `tryEnqueue` ist jetzt async (DB-Schreibzugriffe für Status-Updates)
- Alle `emitEvent`/`setStatus`-Aufrufe in API-Routes und Pipeline auf `await` aktualisiert

### Security
- `/api/debug`: Auth-Check hinzugefügt — Endpoint war unauthentifiziert erreichbar
- `/api/setup`: Plaintext-Passwort aus HTTP-Response entfernt

## [0.1.0] — 2026-05

### Added
- Next.js 14 App Router mit TypeScript strict mode
- Auth.js v5 (Credentials Provider), bcrypt 12 Rounds, JWT-Sessions
- PostgreSQL via Prisma 5 (Docker Compose lokal, Coolify Prod)
- AES-256-GCM Envelope-Encryption für alle API-Keys
- Playwright-Scraper als eigenständiger Microservice mit robots.txt-Check
- KI-Generation-Pipeline: Themenplanung → Texte → Bildbriefings via SSE-Streaming
- YAML-Prompts (themes, blog, newsletter, social, image-brief, positioning)
- Zod-Schema-Validierung für KI-Output inkl. HWG-Flag und Qualitätsschwellen
- API-Key-Manager: Named Keys pro Provider, Test-Call, AES-256 verschlüsselt
- Praxis-Portal: Token-basierte Einladung, Kommentar-Thread, Freigabe-Workflow
- Share-Links: passwortgeschützt (bcrypt), Ablaufdatum
- Export: ZIP, DOCX, PDF, XLSX, HTML
- Cost-Tracking: CostEntry pro KI-Call mit Modell, Tokens, EUR, Step
- Cron-Jobs: monatlicher Cost-Report, tägliche Token-Expiry-Prüfung
- E-Mail-Benachrichtigungen via nodemailer (Trigger: generation_complete)
- Social-Media-Stubs: Meta Graph API (Facebook/Instagram), LinkedIn UGC
- Canva-Integration: Asset-Listing (read-only) via Connect REST API
- DataForSEO-Client: PAA-Fragen + Autocomplete
- Fachgebiet-Templates: zahnarzt.yaml, kfo.yaml, gynaekologe.yaml
- Docker multi-stage Dockerfile, docker-compose.yml, docker-compose.prod.yml
- Coolify-kompatibles Deployment (Cloudflare Tunnel, kein offener Port)
