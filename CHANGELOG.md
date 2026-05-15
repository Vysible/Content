# Changelog

Alle relevanten Änderungen an Vysible werden hier dokumentiert.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

## [Unreleased]

### Added
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
