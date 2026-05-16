# Offene Punkte

## Sprint P4-D — Prisma-Migration Performance-Indexes (benötigt laufende DB)

> **Status:** Schema geändert, Prisma Client regeneriert. Migration `performance_indexes`
> noch nicht gegen eine DB ausgeführt (Docker lokal nicht verfügbar beim Sprint).

**Aktion (einmalig, vor nächstem Deployment):**

```bash
# Lokal (Docker läuft):
pnpm prisma migrate dev --name performance_indexes

# Oder direkt auf Prod-DB via SSH/Coolify-Shell:
pnpm prisma migrate deploy
```

Neue Indexes: `Project[createdById, updatedAt]`, `CostEntry[projectId, timestamp]`,
`AuditLog[projectId, createdAt]`, `GenerationJob[status, createdAt]`.

---

## Sprint P3-E — KlickTipp Auth-Validierung (Slice 23)

> **Status:** Implementierung abgeschlossen. Auth-Schema (Session-Token via
> `POST /account/login`) wurde **nicht** gegen echten KlickTipp-Account getestet.
> Vor erstem produktivem Einsatz zwingend durchführen.

**Manuelle Vorab-Aktion (einmalig):**
1. KlickTipp-Credentials in Vysible hinterlegen: `/settings/klicktipp`
2. Verbindungstest klicken → `[OK] Verbunden` bestätigt Session-Auth funktioniert.
3. Eine Test-Kampagne mit einem echten Newsletter anlegen → KT-Kampagnen-ID
   erscheint im Ergebnis + Link zur KT-Bearbeitungsseite ist klickbar.
4. In KlickTipp prüfen: Kampagne erscheint als Draft, `{{unsubscribe_link}}`
   wird im E-Mail-Preview korrekt aufgelöst.

**Falls Auth fehlschlägt (HTTP 401 beim Login):**
- KT-REST-API für diesen Account auf Basic Auth umgestellt? → `lib/klicktipp/client.ts`
  `ktLogin()` durch Basic-Auth-Header ersetzen:
  ```typescript
  headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` }
  ```
- Dann: erneuter Test.

---

## Sprint P3-B — Hedy-Integration (Slice 20) — Acceptance-Verifikation

> **Status:** Implementierung abgeschlossen (Slice 20 Sub-A + Sub-B). Verifikation
> erfordert echten Hedy-API-Key + mindestens eine Test-Session in der Hedy-App.
> Bis dahin: Punkte als offen geführt.

**Vorab-Aktion (einmalig, manuell):**
1. Hedy API-Dokumentation prüfen: Auth-Schema verifizieren (Bearer-Token, API-Key-Header
   oder MCP-spezifisches Format). URL: `https://api.hedy.bot/mcp`
   Falls kein Bearer-Token → `buildHeaders()` in `lib/hedy/client.ts` anpassen.
2. Hedy API-Key in Vysible hinterlegen: Einstellungen → API-Keys → Provider "Hedy" → Key eintragen.
3. Test-Session in der Hedy-App anlegen (mind. 1 Session muss vorhanden sein).

**Sub-Slice A — API-Route + Client + YAML:**

- [ ] `GET /api/hedy/import?action=sessions` → Liste letzter 20 Sessions (Titel + Datum)
- [ ] `GET /api/hedy/import?action=transcript&id=<id>` → Transkript-Text < 10s
- [ ] `POST /api/hedy/import` → KI-Output enthält alle 8 Pflichtfelder (manuell prüfen)
- [ ] `CostEntry` in DB nach KI-Call (step=`positioning_generation`)
- [ ] Kein Hedy-Key → HTTP 422 mit Meldung "Hedy API-Key nicht konfiguriert"
- [ ] Kein Prompt-Text im TypeScript — ausschliesslich in `prompts/positioning.yaml`
- [ ] TypeScript: 0 Fehler

**Sub-Slice B — HedyImport-Wizard-Komponente:**

- [ ] 5-Schritt-Flow vollständig durchlaufbar (idle → select → transcript → generate → preview)
- [ ] Session-Liste zeigt Titel + Datum lesbar ("TT.MM.JJJJ")
- [ ] KI-Transformation: Ladezustand sichtbar ("[INFO] KI analysiert Transkript…")
- [ ] Vorschau editierbar vor Speicherung (Textarea in Step preview)
- [ ] Gespeichertes Dokument erscheint im Wizard als `positioningDocument` (identisch zu manuellem Upload)
- [ ] Kein API-Key → freundliche Meldung "[WARN] Hedy nicht konfiguriert — …" ohne Hard-Fail
- [ ] TypeScript: 0 Fehler

---

## Sprint P2-E — Canva (externe Einmal-Aktionen, benötigen kein Deployment)

1. **Canva Developer Portal: OAuth-App anlegen + Redirect-URIs registrieren**

   ⚠️ **BLOCKIERT** — Canva Developer API steht noch nicht zur Verfügung. Erst ausführen wenn Canva-Zugang besteht.

   Einmalige manuelle Aktion unter https://www.canva.com/developers/ :
   - Neue App anlegen (OAuth 2.0, Scope: `asset:read design:content:read`).
   - Redirect-URIs eintragen:
     - Dev:  `http://localhost:3000/api/canva/oauth/callback`
     - Prod: `https://vysible.cloud/api/canva/oauth/callback`
   - `CANVA_CLIENT_ID` und `CANVA_CLIENT_SECRET` aus dem Portal in `.env`
     (lokal) und in Coolify (App `nndzr03dlpcfony81kja6lb6` → Environment Variables) eintragen.
   - Vorlage: `.env.example` — Abschnitt "Canva OAuth 2.0".

2. ~~**`prisma migrate deploy` für `CanvaToken`-Migration gegen Live-DB**~~
   **✅ Erledigt (2026-05-15)** — Migration `20260515090000_canva_oauth_token`
   ist applied (DB-Container `s7q3ix0pj9ztc2n8koblu0dz`, finished_at 07:55 UTC).
   Alle 7 Migrationen auf der Live-DB sind konsistent.

---

## Sprint 2

1. **GitHub Actions Secret anlegen** (einmalig, im GitHub-Repo):
   - `Settings → Secrets → Actions → New repository secret`
   - Name: `TEST_ENCRYPTION_SECRET`
   - Wert: beliebiger 64-Zeichen Hex-String (z.B. `openssl rand -hex 32`)
   - Ohne dieses Secret schlägt der `unit-tests`-Job in `.github/workflows/ci.yml` fehl.

---

## Sprint P3-A — Kosten-Tracking (benötigt laufende DB)

1. ~~**Prisma-Migration ausführen** (CostSettings-Modell)~~
   **✅ Erledigt (2026-05-15)** — Migration `20260515110000_add_cost_settings` applied
   via SSH → psql auf DB-Container `s7q3ix0pj9ztc2n8koblu0dz`.
   Prisma Client lokal via `pnpm prisma generate` regeneriert. TypeScript: 0 Fehler.

---

## Sprint 3 (benötigt laufende DB / VPS-Zugriff)

1. ~~**Prisma-Migration ausführen** (Sprint 3 — PII-Felder)~~
   **✅ Erledigt (2026-05-14)** — Migration `20260514202000_pii_encryption_fields` applied
   (verifiziert in `_prisma_migrations`).

2. ~~**PII-Datenmigration ausführen**~~
   **✅ Erledigt (2026-05-15)** — `scripts/migrate-pii.ts` via SSH-Tunnel (localhost:5433 → Prod-DB)
   ausgeführt. 1 User verschlüsselt (`emailEncrypted` + `nameEncrypted` gesetzt).
   Verifiziert via `_prisma_migrations` + direkter DB-Abfrage.

---

## Sprint 0

1. ~~prisma migrate deploy muss gegen die Live-DB ausgeführt werden~~
   **✅ Erledigt (2026-05-15)** — Alle 8 Migrationen applied (inkl. PII-Felder + CanvaToken + CostSettings).
   Verifiziert via `_prisma_migrations`-Tabelle auf DB-Container `s7q3ix0pj9ztc2n8koblu0dz`.

2. **SMTP-Datenmigration** — Bestehende HEDY-ApiKey-SMTP-Einträge einmalig in `SmtpConfig`-Tabelle übertragen.
   ⚠️ **Nur notwendig wenn** HEDY-ApiKey-Einträge mit SMTP-Daten in der DB vorhanden sind.
   Durchführung: Prisma Studio (`pnpm prisma studio`) → `ApiKey`-Tabelle prüfen → SMTP-Werte manuell in `SmtpConfig` anlegen.

3. **`COOLIFY_APP_UUID` in `.env` aktualisieren** — Aktuell: `f58gu47l7uwwchjhhd25c0gy` (alte App).
   Prod-App seit kurzem: `nndzr03dlpcfony81kja6lb6` (läuft unter `https://vysible.cloud`).
   Eintragen: `COOLIFY_APP_UUID=nndzr03dlpcfony81kja6lb6`

---

## Audit-2026-05-16 — Schwere 3 (Qualitätsmängel)

> Aus `docs/audit-2026-05-16.md`. Kein Sicherheits- oder Compliance-Blocker,
> aber relevant für Produktionsqualität und Skalierbarkeit.

11. **FIX-07 — Test-Coverage zu gering (NFA-16 partiell)**

    Sprint-Prompt: `docs/dev-prompts/audit-2026-05-16.md` (Abschnitt FIX-07).
    Fehlt:
    - E2E URL→ZIP-Flow (war in roadmap Sprint 2 geplant, nur `login.spec.ts` vorhanden)
    - Unit-Tests: Chat-Versioning, Cost-Aggregator, Export-Dateinamen, Template-Loader, WP-Formatter, KT-Formatter, Email-Templates
    - Integration-Tests: weitere API-Routen außer `/api/generate/start`

    Aufwand: 3–5 Tage. Empfehlung: als eigenen Sprint planen.

12. ~~**FIX-08 — Audit-Log-Retention fehlt**~~ **✅ Erledigt (2026-05-16)**

    Cron täglich 03:00 in `lib/cron/scheduler.ts` — löscht `AuditLog`-Einträge älter als 30 Tage.
    Konfigurierbar via `AUDIT_LOG_RETENTION_DAYS` (Standard: 30). `.env.example` ergänzt.

13. **FIX-09 — `positioningDocument` unverschlüsselt in DB (bekannte Abweichung)**

    `Project.positioningDocument String?` — Klartext in PostgreSQL.
    Kann Praxis-sensible Strategieinformationen enthalten.
    Bereits in `docs/forge-web-deviations.md` als bekannte Abweichung dokumentiert.
    Sprint-Prompt: `docs/dev-prompts/sprint-fix06-aes-version-prefix.md` als Vorlage (gleiche AES-Mechanik).
    Empfehlung: nach FIX-06 (AES-Versions-Präfix) angehen — gleiche Migrations-Infrastruktur.

14. **FIX-10 — In-Memory-Queue + In-Memory-Rate-Limiter**

    `lib/generation/queue.ts`: Concurrent-Counter geht bei App-Neustart verloren (Coolify auto-deploy).
    `lib/ratelimit/index.ts`: In-Memory-Map, kein Redis.
    Aktuell kein Showstopper für Single-Tenant-Einzel-Instanz-Betrieb.
    Relevant ab: mehrere App-Instanzen oder häufige Deployments mit laufenden Generierungen.
    Lösung langfristig: Queue-Counter auf DB-Feld oder Redis/BullMQ.
    Aufwand: 1–2 Tage. **Erst anpacken wenn horizontales Scaling konkret geplant wird.**

---

## Backlog / Tech-Debt (nicht sprintgebunden)

1. **Sprint 0a — Restbestand stiller Catches schließen** (Forge-Regel `resilience §3a`) — noch 0 offen

   Zwei `.catch(() => {})` aus Slices 26/27, eingeführt vor Forge-Migration. Alle dokumentiert in `docs/forge-web-deviations.md` (Status: `Accepted`, Timeline: Sprint 0a).

   - ~~`components/layout/TokenWarningBanner.tsx:21` (Slice 26)~~ **✅ Geschlossen (Sprint P3-H)**
   - ~~`components/wizard/TemplateSelector.tsx:23` (Slice 25)~~ **✅ Geschlossen (Sprint P3-G)**
   - ~~`lib/klicktipp/client.ts:34` (Slice 23)~~ **✅ Geschlossen (Sprint P3-E)**
   - ~~`lib/tokens/expiry-checker.ts:21` (Slice 26)~~ **✅ Bereits gefixt vor Sprint P3-H (staler Eintrag)**
   - ~~`lib/costs/reporter.ts:56` (Slice 27)~~ **✅ Geschlossen (Sprint P3-F)**

   Pattern: catch durch `(err: unknown) => { logger.warn(...) }` (Server) bzw. `console.warn('[Vysible] …', err)` (Client) ersetzen. Aufwand: ~1–2 Stunden.

2. **Browser-tauglicher Logger** (Forge-Regel `resilience §3a` — Client-Component-Abweichung)

   `lib/utils/logger.ts` nutzt `pino` mit `pino-pretty`-Transport — nur Server-side lauffähig. Client-Components nutzen daher `console.warn/error('[Vysible] …')`. Eintrag in `docs/forge-web-deviations.md` (Status: `Accepted`).

   Optionen:
   - `pino/browser` (offizielle Browser-Variante, kompatible API)
   - `consola` (alternativer isomorpher Logger)
   - Dünner eigener Wrapper `lib/utils/logger-client.ts`, der intern `console.*` mit `[Vysible]`-Prefix kapselt

   Nach Einführung: Sprint-Prompt-Self-Review-Regeln präzisieren ("`logger.*` in Server, `loggerClient.*` in Client").

3. ~~**`SocialTokenStatusSection` auf OAuth-Modelle umstellen** (Slice 18)~~ **✅ Geschlossen (Sprint P2-F)**

   Komponente zeigt jetzt META/LINKEDIN-ApiKeys (Provider-Enum bereinigt).
   CANVA-ApiKey-Rows deprecated — Hinweisbox mit Link zu `/settings/canva` ergänzt.
   Stiller Catch `.catch(() => {})` durch `console.warn('[Vysible] …', err)` ersetzt.

4. **KT-Status-Feld in `StoredTextResult` ergänzen** (Kalender-Badge, Slice 7)

   `ContentCalendar.tsx` ist darauf vorbereitet: WP/KT-Badge wird angezeigt wenn `wpDraftStatus` / `ktStatus` im `StoredTextResult`-Typ vorhanden sind. WP-Integration ist seit Sprint P3-D (Slice 22) implementiert — `blogStatus: 'in_wordpress'` wird aus `StoredTextResult` gelesen und in der Blog-Ansicht angezeigt. Das separate `wpDraftPostId`-Feld lebt auf dem Project-Modell. KT-Status gehört zu Slice 23 (KlickTipp-Connector). Nach Implementierung: `ktStatus`-Feld in `lib/generation/results-store.ts` ergänzen.

5. **Themen-Quality-Gate refaktorisieren** (`lib/generation/themes-schema.ts` Z. 33–53) — **teilweise erledigt (Sprint Fix-B)**

   Beobachtetes Problem (Mai 2026, Praxis Zahnzentrum Warendorf): Lauf brach mit *"Nur 36% SEO-Titel als Frage/mit Keyword (Minimum 50%)"* ab. User kann nur "Wiederholen", nicht parametrieren oder teilakzeptieren.

   Erledigte Teilpunkte (Sprint Fix-B, 2026-05-16):
   - ~~**Magic Numbers extrahieren**~~ **✅** — `lib/generation/config.ts` mit `THEMES_CONFIG` (`minPraxisQuote: 0.8`, `minSeoQuote: 0.5`), ENV-Override via `THEMES_MIN_PRAXIS_QUOTE` / `THEMES_MIN_SEO_QUOTE`.
   - ~~**`istFrage` deterministisch berechnen**~~ **✅** — `computeIstFrage()` in `lib/generation/themes.ts`; `istFrage` kein LLM-Pflichtfeld mehr.
   - ~~**Prompt bereinigen**~~ **✅** — `prompts/themes.yaml` angepasst, `istFrage`-Beispiel entfernt.

   Noch offen:
   - **Zwei Kriterien trennen:** "Frage" und "enthält Keyword" sind zwei verschiedene SEO-Eigenschaften. Prüfen ob getrennte Schwellwerte gewünscht sind.
   - **Soft-Warn-Pfad in der UI:** Bei Schwellwert-Verfehlung Auswahl anbieten (Wiederholen vs. Akzeptieren mit Warning-Badge), statt Hard-Fail. Erfordert UI-Änderung + ggf. neuen Job-Status (`QUALITY_WARNING`).

   Aufwand Rest: ~halber Tag (UI-Änderung dominiert). Kein Sicherheits- oder Compliance-Bezug.

6. **Meta-Business-Verifizierung + LinkedIn Developer App abschließen** (PSR P2-F WARN Check 2+8)

   Externe Genehmigungen müssen vor echten API-Tests vorliegen. Code-Implementierung (Sprint P2-F) ist ohne sie möglich — End-to-End-Tests und reale Draft-Uploads erst danach.

   - **Meta:** Business-Verifizierung unter https://business.facebook.com/settings/security beantragen (Vorlaufzeit: Wochen). Ohne Verifizierung lehnt die Graph API `published: false`-Posts ab.
   - **LinkedIn:** Developer App mit `w_member_social`-Scope unter https://www.linkedin.com/developers/apps anlegen + Partner Review beantragen. Ohne Review nur Read-Scope verfügbar.

   Lösungsvorschlag:
   - Sofort beantragen (Vorlaufzeit dominiert den Zeitplan).
   - Sobald genehmigt: Tokens in Vysible unter Einstellungen → API-Keys hinterlegen (Provider META / LINKEDIN).
   - Abschluss-Check: `POST /api/projects/[id]/social-post` mit echtem Token gegen Test-Seite.

7. **Sprint-Prompt P2-F ohne FA-*/NFA-*-IDs** (PSR P2-F WARN Check 5)

   `docs/dev-prompts/sprint-p2f-social-media.md` referenziert nur "plan.md Slice 18" ohne explizite FA-*/NFA-*-Verweise. Vollständigkeit gegen Konzept v6.0 nicht maschinell prüfbar.

   Lösungsvorschlag:
   - Nach Sprint-Abschluss: Prompt nachträglich mit FA-*-IDs annotieren (z.B. `FA-F-29` Social-Drafts, `NFA-06` Resilience/Retry) als Referenz für spätere PSR-Läufe.
   - Alternativ: `GENERATE-SPRINT-PROMPTS.md` anpassen, sodass FA-*-IDs bei der Prompt-Generierung aus plan-v6.1.md extrahiert werden.
   - Aufwand: ~30 Minuten Dokumentation.

8. **Cookie-Disclaimer, Impressum & TMG-konforme Pflichtseiten** (Rechtliches) — **teilweise erledigt (Sprint Fix-A)**

   Da Vysible unter `https://vysible.cloud` öffentlich im Internet erreichbar ist, sind folgende Pflichtbestandteile nach deutschem Recht erforderlich:

   - **Impressum** (§ 5 TMG): Muss verlinkt und von jeder Seite der App erreichbar sein.
   - **Datenschutzerklärung** (DSGVO Art. 13/14): Informationspflichten über erhobene Daten, Zwecke, Drittanbieter.
   - **Cookie-Disclaimer / Consent-Banner**: Auth.js-Session-Cookie ist notwendig — kein Consent nötig. Prüfen ob sonstige Cookies gesetzt werden.

   Erledigte Teilpunkte (Sprint Fix-A, 2026-05-16):
   - ~~Links im Footer der `(dashboard)/layout.tsx` eintragen~~  **✅** — Footer mit `/impressum` + `/datenschutz` Links implementiert.

   Noch offen:
   - Statische Seiten `/impressum` und `/datenschutz` anlegen (Texte liefert Betreiber).
   - Footer-Link auch in Login-Seite eintragen.
   - `middleware.ts`: `/impressum` und `/datenschutz` zur Public-Allowlist hinzufügen (analog `/share/*`).
   - Cookie-Situation prüfen: `document.cookie`-Analyse im Browser.

   Aufwand Rest: ~1–2 Stunden.

9. ~~**Prisma-Migration `20260515220000_add_meta_linkedin_providers` auf Prod-DB anwenden** (BLOCKING für META/LINKEDIN-Nutzung)~~ **✅ Schema-Seite erledigt (Provider-Enum bereinigt, Sprint P2-F). Prod-DB-Anwendung manuell nötig — siehe SSH-Anleitung unten.**

   Migration wurde lokal manuell erstellt (DB war nicht erreichbar). Sie muss via SSH auf der Prod-DB angewendet werden, bevor META/LINKEDIN-API-Keys funktionieren.

   Empfohlenes Vorgehen:
   ```bash
   # Via SSH auf dem Hostinger VPS:
   psql $DATABASE_URL -c "ALTER TYPE \"Provider\" ADD VALUE IF NOT EXISTS 'META';"
   psql $DATABASE_URL -c "ALTER TYPE \"Provider\" ADD VALUE IF NOT EXISTS 'LINKEDIN';"
   # Danach Prisma Migrations-Tabelle aktualisieren:
   pnpm prisma migrate deploy
   ```
   Alternativ direkt in Coolify-Shell oder via `pnpm prisma migrate deploy` im Container-Environment.

   **Solange diese Migration nicht applied ist:** Prisma wirft einen Fehler wenn `provider: 'META'` oder `provider: 'LINKEDIN'` in `findFirst`-Queries verwendet wird.

10. ~~**Forge §3c-Scan: `lib/ai/client.ts` als False Positive dokumentiert**~~ **✅ Geschlossen (Sprint Fix-A)**

    `@forge-scan factory-only`-Kommentar in `lib/ai/client.ts` JSDoc ergänzt — CI-False-Positive verhindert.