# Forge-Web Migration Audit — Vysible (`Vys_MarkMng`)

> **Zweck:** Architektonische Standortbestimmung vor der Forge-Web-Integration.
> **Datum:** 2026-05-14
> **Scope:** `C:\GIT\Vys_MarkMng` — vollständige Codebasis-Analyse
> **Reviewer:** KI-Architekt (Cursor Agent)
> **Status:** Nur Bericht — keine Änderungen vorgenommen

---

## Inhaltsverzeichnis

1. [Projektübersicht](#1-projektübersicht)
2. [Bewertungsraster](#2-bewertungsraster)
3. [A) Standard-Kriterien guter Softwareentwicklung](#3-a-standard-kriterien)
4. [B) Forge-Web-Regel-Compliance](#4-b-forge-web-compliance)
5. [Schulnotensystem](#5-schulnotensystem)
6. [Kritische Stellungnahme — Funktionsumfang & Umsetzungsqualität](#6-kritische-stellungnahme)
7. [Empfehlung: Wie weiter?](#7-empfehlung)
8. [Anhang: Befund-Katalog](#8-anhang-befund-katalog)

---

## 1. Projektübersicht

**Vysible** ist eine Single-Tenant-SaaS-Plattform für KI-gestützte Marketing-Content-Generierung, primär für Medizinpraxen (Zahnarzt, Gynäkologe, KFO). Der Kern-Workflow ist:

```
Praxis-URL eingeben
  → Playwright-Microservice scrapet die Website
  → Anthropic generiert Themen + Texte (Blog, Newsletter, Social)
  → Kosten werden getrackt, Inhalte per Share-Link / Praxis-Portal freigegeben
  → Export (DOCX, PDF, XLSX, ZIP) + direkte WordPress/KlickTipp-Integrationen
```

**Technologie-Stack:**

| Schicht | Technologie |
|---|---|
| Framework | Next.js 14 App Router |
| Datenbank | PostgreSQL via Prisma ORM |
| Auth | Auth.js v5 (beta), Credentials + JWT |
| KI | Anthropic SDK, OpenAI SDK |
| Scraping | Eigener Express+Playwright-Microservice |
| Styling | Tailwind CSS 3 |
| Deployment | Docker / docker-compose / Coolify |
| Paketmanager | pnpm 9 |

**Umfang der Codebasis (ca.):**

- 61 App-Router-Dateien (Pages + API Routes)
- 43 `lib/`-Module (Integrations, Generation, Export, Costs, Cron)
- 25 React-Komponenten
- 1 Prisma-Schema mit 8 Modellen
- 0 Tests, 0 CI-Workflows, 0 ADRs

---

## 2. Bewertungsraster

Das Schulnotensystem orientiert sich an der deutschen Skala (1–6):

| Note | Bezeichnung | Bedeutung für SW-Qualität |
|---|---|---|
| **1** | Sehr gut | Industrie-Standard vollständig erfüllt, vorbildlich |
| **2** | Gut | Solide, geringe Mängel, produktionsreif |
| **3** | Befriedigend | Funktioniert, aber relevante Lücken |
| **4** | Ausreichend | Grundanforderungen gerade erfüllt, signifikante Defizite |
| **5** | Mangelhaft | Klare Verstösse, nicht produktionsreif ohne Korrekturen |
| **6** | Ungenügend | Anforderung nicht erfüllt, vollständige Überarbeitung nötig |

**Gewichtung der Kategorien:**

| Kategorie | Gewicht | Begründung |
|---|---|---|
| Sicherheit | 20 % | Direkte Compliance- und Haftungsrelevanz |
| Tests | 20 % | Fundamentale Qualitätssicherung |
| Architektur & Design | 15 % | Langfristige Maintainability |
| Resilienz & Fehlerbehandlung | 15 % | Produktionsstabilität |
| Code-Qualität | 10 % | Lesbarkeit, Wartbarkeit |
| Dokumentation & Governance | 10 % | Betrieb, Übergabe, Compliance |
| DevOps & CI/CD | 10 % | Deployment-Sicherheit |

---

## 3. A) Standard-Kriterien

### 3.1 Architektur & Design — Note **2−**

**Positiv:**

- Next.js 14 App Router wird korrekt eingesetzt: Server Components für Datenzugriff, Client Components mit `'use client'` nur wo nötig.
- `lib/`-Struktur ist konsequent nach Domänen unterteilt (`ai/`, `costs/`, `generation/`, `crypto/`, `scraper/`, …). Gute Separation of Concerns.
- Playwright-Scraper sinnvoll als eigenständiger Microservice isoliert — verhindert Chromium-Footprint in der Next.js-Runtime.
- Prisma-Schema mit korrekten Indizes auf `status`, `createdById`, `token`, `month` — datenbankbewusstes Design.
- `output: 'standalone'` + multi-stage Dockerfile = schlankes Container-Image.
- AES-256-GCM Envelope-Encryption für API-Keys ist architektonisch sauber.

**Mängel:**

- `Project.scrapedData`, `.themeResults`, `.textResults` sind `Json`-Spalten ohne Schema-Validierung. Das ist schemalose Datenpersistenz in einer relationalen DB. Bei Änderungen an der Generation-Pipeline entstehen stille Inkompatibilitäten. Besser: dedizierte Tabellen oder Zod-Validation beim Lesen.
- Das SMTP-System missbraucht die `ApiKey`-Tabelle mit einem `HEDY`-Provider-Hack: SMTP-Config wird im `name`-Feld als `smtp:host:port:user` kodiert, Empfänger-Liste im `model`-Feld. Das ist eine semantische Zweckentfremdung — SMTP benötigt ein eigenes Konfigurationsmodell.
- In-Memory Job-Store (`lib/generation/job-store`) und In-Memory Rate-Limiter (`lib/ratelimit/index.ts`): Beide funktionieren nicht bei mehr als einer App-Instanz (kein Horizontal Scaling, kein Restart-Recovery für laufende Jobs).
- `app/api/projects/route.ts` `GET` hat kein multi-tenant Filtering — alle Projekte aller User werden zurückgegeben (`prisma.project.findMany()` ohne `where: { createdById: session.user.id }`). Das ist ein Datenschutzmangel, auch bei Single-Tenant-Betrieb mit STAFF-Rollen.

---

### 3.2 Code-Qualität — Note **3**

**Positiv:**

- TypeScript mit `"strict": true` — vollständige Typ-Sicherheit im gesamten Projekt.
- Zod-Schema-Validierung in API Routes (`createSchema.safeParse(body)`) — konsistentes Input-Validation-Pattern.
- `lib/db.ts` nutzt den Next.js-empfohlenen Global-Singleton-Pattern für Prisma — kein Connection-Leak in Dev Hot-Reload.
- `lib/crypto/aes.ts` ist sauber: IV per `randomBytes(12)`, GCM Auth-Tag, fehlt nur Versions-Präfix für Key-Rotation.

**Mängel:**

- **Kein strukturierter Logger** — `console.log`, `console.error` werden projektübergreifend für alles verwendet. Kein Log-Level, keine Korrelations-ID, keine strukturierten Felder. In Produktion nicht auswertbar.
- `JSON.parse(JSON.stringify(result))` als Serialisierungsmuster (pipeline.ts, Zeilen 79, 135, 167) — funktioniert, ist aber ein Code-Smell. Korrekt wäre Prisma `InputJsonValue` mit sauberem Casting.
- Kein dediziertes ESLint-Config-File — nur `eslint-config-next` Defaults. Keine projektspezifischen Regeln, keine Import-Sort, keine Unused-Variable-Enforcement über Next-Defaults hinaus.
- `lib/email/mailer.ts` Zeile 39: `catch { return null }` — stiller Catch ohne Log für den Parse-Fehler im SMTP-Config-String. Parse-Fehler werden unsichtbar.
- Keine Barrel-Exports (`index.ts`) in `lib/`-Modulen — Import-Paths sind teilweise tief und spröde.

---

### 3.3 Sicherheit — Note **4**

**Positiv:**

- API-Keys AES-256-GCM verschlüsselt im DB-Feld `encryptedKey` ✓
- Passwörter mit bcrypt (Rounds 12) ✓
- `ShareLink.passwordHash` — Passwort-geschützte Share-Links ✓
- Auth.js v5 JWT-Session mit eigenem `NEXTAUTH_SECRET` ✓
- `ENCRYPTION_SECRET` nur via Env-Variable ✓
- Keine Secrets im Quellcode ✓
- `poweredByHeader: false` in `next.config.mjs` ✓

**Kritische Befunde:**

**[KRITISCH-1] `/api/debug` — unauthentifizierter Endpoint:**

```typescript
// app/api/debug/route.ts — keine Session-Prüfung!
export async function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasNextauthSecret: !!process.env.NEXTAUTH_SECRET,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasDbUrl: !!process.env.DATABASE_URL,
    authTrustHost: process.env.AUTH_TRUST_HOST,
    nextauthUrl: process.env.NEXTAUTH_URL,
  })
}
```

Dieser Endpoint ist im Middleware-Matcher explizit von der Auth-Prüfung ausgenommen. Jeder Internetzugang kann Environment-Variable-Zustände des Produktionssystems abfragen. Das ist ein Information-Disclosure-Befund.

**[KRITISCH-2] `/api/setup` — Plaintext-Credential in Response:**

```typescript
return NextResponse.json({
  message: 'Admin-User angelegt',
  email: 'admin@vysible.de',
  password: 'admin123',  // <-- Klartext-Passwort in HTTP-Response
  hint: 'Passwort nach erstem Login ändern!',
})
```

Ein HTTP-Response mit einem Klartext-Passwort ist ein Security Anti-Pattern, unabhängig davon, dass es ein Default ist. Logs, Proxies, Browser-History und Monitoring-Tools speichern diese Antwort.

**[HOCH-1] PII in Plaintext (DSGVO-relevant):**

- `User.email` — Plaintext in PostgreSQL
- `User.name` — Plaintext in PostgreSQL
- `PraxisUser.email` — Plaintext in PostgreSQL
- `PraxisUser.name` — Plaintext in PostgreSQL
- `Comment.authorName` — Plaintext in PostgreSQL

Forge-Regel `web-encryption-at-rest.mdc` verlangt Envelope-Encryption für alle PII-Felder. Diese fehlt für alle personenbezogenen Daten ausser API-Keys.

**[MITTEL-1] In-Memory Rate-Limiter:**

```typescript
// lib/ratelimit/index.ts — Map lebt im Node.js-Prozess
const store = new Map<string, { count: number; resetAt: number }>()
```

Umgehbar durch: mehrere App-Instanzen, Container-Restart, oder einfach parallele Requests (keiner der Requests erhält denselben Rate-Limit-Counter bei Horizontal Scaling).

**[MITTEL-2] `/api/projects` GET — keine Eigentümer-Filterung:**

```typescript
// Gibt ALLE Projekte zurück, nicht nur die des eingeloggten Users
const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' }, ... })
```

---

### 3.4 Tests — Note **6**

**Befund:** Null.

```
*.test.ts  → 0 Treffer
*.spec.ts  → 0 Treffer
*.test.tsx → 0 Treffer
vitest.config.*  → nicht vorhanden
jest.config.*    → nicht vorhanden
```

Kein einziger Test existiert. Kein Unit-Test für Crypto-Funktionen, Keine Integrationstests für API-Routes, keine E2E-Tests für kritische User-Flows (Auth, Generation-Pipeline, Export).

Die Generation-Pipeline — das Herzstück des Produkts — hat keinerlei automatisierte Verifikation. Jede Änderung an `lib/generation/` ist manuell zu testen und birgt unbemerkte Regressionen.

---

### 3.5 Dokumentation & Governance — Note **5**

**Was existiert:**

- `README.md` — minimale Quick-Start-Anleitung (gut genug für Dev-Setup)
- `plan.md` (1179 Zeilen) — internes Planungsdokument, Deployment-Topology, Phasen-Checkliste. Wertvoll als Konzeptdokument, aber kein Ersatz für strukturierte Dokumentation.
- `prompts/*.yaml` — selbstdokumentierend, guter Ansatz
- `templates/*.yaml` — gut strukturierte Domain-Templates

**Was fehlt:**

- `docs/` — kein Verzeichnis vorhanden
- `CHANGELOG.md` — nicht vorhanden (Forge Hard Rule: MUSS in jedem Commit mitgepflegt werden)
- `docs/decisions.md` (ADRs) — keine Architekturentscheidungen dokumentiert
- `docs/component-ownership.md` — kein Ownership-Dokument
- `docs/architecture.md` — kein Architektur-Überblick
- API-Dokumentation — keine OpenAPI-Spec, keine Route-Dokumentation

---

### 3.6 DevOps & CI/CD — Note **3−**

**Positiv:**

- Multi-Stage Dockerfile mit Alpine-Base — schlankes Produktions-Image ✓
- `docker-compose.yml` für lokale Dev-Umgebung mit allen Services ✓
- `docker-compose.prod.yml` für Coolify-Deployment ✓
- `prisma migrate deploy` beim Container-Start mit Retry-Logic ✓
- `healthz`-Endpoint vorhanden ✓
- `instrumentation.ts` für Cron-Job-Bootstrap ✓

**Mängel:**

- Kein `.github/workflows/` — keine GitHub Actions CI/CD-Pipeline
- Kein automatisches Lint/Type-Check vor Merge
- Kein automatischer Deployment-Test
- Kein Image-Vulnerability-Scan
- `package.json` enthält kein `"typecheck"` Script — `tsc --noEmit` ist nicht als eigenständiger Task definiert

---

### 3.7 Resilienz & Fehlerbehandlung — Note **4**

**Positiv:**

- `scrapeUrl` hat `AbortSignal.timeout(90_000)` — kein ewiges Hängen ✓
- `checkRobotsRemote` hat `AbortSignal.timeout(10_000)` ✓
- Pipeline-Fehler werden strukturiert als SSE-Events emittiert ✓
- Retry-Mechanismus für Pipeline-Steps existiert (über `retryPipeline`) ✓

**Forge-Violations (resilience.mdc §3a — Keine stillen Exception Handler):**

**Verletzung 1 — Silent Catch in `pipeline.ts`:**

```typescript
// lib/generation/pipeline.ts, Zeile 172
sendNotification('generation_complete', project.name).catch(() => {})
//                                                            ^^^^^^^^
// Vollständig stiller Catch — kein Log, kein Signal
```

E-Mail-Versand-Fehler werden komplett verschluckt. Operatoren erfahren nie, ob Benachrichtigungen funktionieren.

**Verletzung 2 — Silent Catch in `scraper/client.ts`:**

```typescript
// lib/scraper/client.ts, Zeile 58-61
} catch {
  return false   // kein Log, kein Kontext
}
```

Wenn der Playwright-Service abstürzt oder nicht erreichbar ist, gibt `checkScraperHealth()` stillschweigend `false` zurück.

**Verletzung 3 — Silent Catch in `mailer.ts`:**

```typescript
// lib/email/mailer.ts, Zeile 39
} catch {
  return null   // Parse-Fehler der SMTP-Config wird verschluckt
}
```

**Forge-Violation (resilience.mdc §3c — Kein Retry-loses IO):**

- `scrapeUrl()` — kein Retry bei Netzwerkfehler oder Timeout
- `getAnthropicClient()` / `getOpenAIClient()` — DB-Abfrage ohne Retry
- `sendMail()` in `mailer.ts` — kein Retry
- Alle AI-API-Calls in `lib/generation/themes.ts`, `lib/generation/texts.ts` — kein Retry

---

## 4. B) Forge-Web Compliance

### Forge-Regel-Scorecard

| Regel | Status | Befund |
|---|---|---|
| `web-server-client-separation.mdc` | ✅ Weitgehend erfüllt | App Router korrekt genutzt; keine Browser-APIs in Server Components gefunden |
| `web-encryption-at-rest.mdc` | ❌ Verletzt | PII (User.email, User.name, PraxisUser.*) in Plaintext; nur API-Keys korrekt verschlüsselt |
| `resilience.mdc §3a` (keine stillen Catches) | ❌ Verletzt | 3 stille Catch-Blöcke identifiziert |
| `resilience.mdc §3b` (kein disabled SSL) | ✅ Erfüllt | Kein `rejectUnauthorized: false` gefunden |
| `resilience.mdc §3c` (kein Retry-loses IO) | ❌ Verletzt | Alle externen HTTP-Calls ohne Retry-Wrapper |
| `terminal-output.mdc` (Markers, kein Emoji) | ⚠️ Teilweise | Keine Emojis ✓; `[Vysible]` Prefix ✓; kein strukturierter Logger ✗ |
| `secrets-policy.mdc` | ⚠️ Teilweise | Keine Secrets im Code ✓; `/api/setup` gibt Plaintext-Passwort zurück ✗ |
| `git-commits-and-changelog.mdc` | ❌ Verletzt | `CHANGELOG.md` fehlt vollständig |
| `no-duplication.mdc` | ✅ Weitgehend erfüllt | Keine signifikante Duplikation festgestellt |
| `governance-precedence.mdc` | ❌ Verletzt | Keine ADRs, kein `docs/architecture.md`, keine `docs/decisions.md` |
| `component-ownership.mdc` | ❌ Verletzt | Kein `docs/component-ownership.md`, kein `CODEOWNERS` |
| `sync-deviation-policy.mdc` | ➖ N/A | Forge-Web noch nicht integriert |
| `prompt-code-standards.mdc` | ✅ Erfüllt | Prompts als YAML, kein Code in Prompts |

**Forge-Compliance-Score: 3/12 erfüllt, 5/12 verletzt, 3/12 teilweise, 1/12 N/A**

---

## 5. Schulnotensystem

### Einzelbewertungen

| # | Kategorie | Note | Gewicht | Begründung (Kurzform) |
|---|---|---|---|---|
| 1 | **Sicherheit** | **4** | 20 % | 2 kritische Endpoints; PII in Plaintext; In-Memory Rate-Limit; API-Key-Crypto ist gut |
| 2 | **Tests** | **6** | 20 % | 0 Testdateien; kein Framework; keine CI-Verifikation |
| 3 | **Architektur & Design** | **2−** | 15 % | Next.js App Router korrekt; gute lib/-Trennung; SMTP-Hack; schemalose Json-Spalten; fehlende Eigentümer-Filterung |
| 4 | **Resilienz & Fehlerbehandlung** | **4** | 15 % | 3 stille Catches; kein Retry auf externen IO; In-Memory Job-Store |
| 5 | **Code-Qualität** | **3** | 10 % | Strict TypeScript; Zod-Validation; kein strukturierter Logger; keine ESLint-Config |
| 6 | **Dokumentation & Governance** | **5** | 10 % | `plan.md` vorhanden aber informell; kein CHANGELOG, keine ADRs, keine Arch-Docs |
| 7 | **DevOps & CI/CD** | **3−** | 10 % | Docker/Compose/Coolify gut; kein CI-Pipeline; kein Typecheck-Script |

### Gesamtnote (gewichtet)

```
Gesamtnote = (4×0.20) + (6×0.20) + (2×0.15) + (4×0.15) + (3×0.10) + (5×0.10) + (3×0.10)
           = 0.80 + 1.20 + 0.30 + 0.60 + 0.30 + 0.50 + 0.30
           = 4.00
```

### **Gesamtnote: 4 (Ausreichend)**

Das Projekt ist **produktionsfähig für einen informellen Einzelbetrieb**, aber **nicht produktionsreif** für eine Situation mit externen Nutzern, Compliance-Anforderungen oder Teamentwicklung. Die kritischen Sicherheitsbefunde und der komplette Mangel an Tests sind die dominierenden Defizite.

---

## 6. Kritische Stellungnahme

### Funktionsumfang: bemerkenswert — Note **2**

Für ein Einzelprojekt ohne Team ist der Funktionsumfang beachtlich. Vysible implementiert:

- Vollständige KI-Content-Pipeline mit SSE-Streaming und Retry-Mechanismus
- 7 externe Integrationen (Anthropic, OpenAI, DataSEO, KlickTipp, WordPress, Canva, Hedy)
- 6 Export-Formate (DOCX, PDF, XLSX, HTML, CSV, ZIP)
- Praxis-Portal mit Token-basierter Einladung und Kommentar-Thread
- Passwort-geschützte Share-Links mit Ablaufdatum
- Cost-Tracking mit monatlichen Reports
- Content-Kalender
- SEO-Analyse

Das ist für ein Soloprojekt im Frühentwurfs-Stadium (v0.1.0) ehrlich gesagt eine respektable Breite.

### Umsetzungsqualität: ungleichmäßig — Note **3−**

Das Projekt zeigt eine klare **technische Asymmetrie**: Die Produktions-Features sind sorgfältig implementiert, während Quer-schnittsthemen (Testing, Resilience, Security-Hygiene, Governance) fast vollständig fehlen.

**Das Kernproblem ist nicht fehlende Kompetenz, sondern fehlende Disziplin auf der Meta-Ebene:**

1. **Das Testproblem ist existenziell.** Die Generation-Pipeline ist das Herzstück des Produkts. Sie ruft Anthropic auf, verarbeitet mehrere Steps, serialisiert Ergebnisse in Json-Felder. Eine kleine Änderung an `themes.ts` oder `texts.ts` kann die gesamte Output-Qualität zerstören, ohne dass irgendjemand es merkt, bis ein Nutzer sich beschwert. Mit 0 Tests ist jedes Deployment ein Blind-Flug.

2. **Die Sicherheitslücken sind keine Denkfehler, sondern Convenience-Abkürzungen** die nie "aufgeräumt" wurden. `/api/debug` und `/api/setup` sind klassische "Ich brauche das für das Onboarding"-Endpoints die in Produktion bleiben. Das ist ein Muster, das regelmäßig zu Incidents führt.

3. **Die Forge-Compliance-Lücken bei PII** sind DSGVO-relevant. `User.email` und `PraxisUser.email` im Klartext in einer PostgreSQL-Datenbank ist in der EU nicht ideal. Bei einem Datenbankdump wären alle E-Mail-Adressen direkt lesbar.

4. **Der SMTP-Hack** (`ApiKey` mit Provider `HEDY` missbraucht für SMTP-Config) ist ein Zeichen, dass das Datenmodell organisch gewachsen ist ohne Refactoring-Momente. Wer in 6 Monaten den Code liest — oder der Forge-Migrationsprozess — muss dieses implizite Wissen aus dem Code reverse-engineeren.

5. **`plan.md` ist kein Dokumentation-Ersatz.** Ein 1179-Zeilen-Planungsdokument mit TODO-Listen, Deployment-Notizen und Feature-Ideen ist wertvoll als Arbeitsnotiz, aber gefährlich als einzige Wissensquelle. Es vermischt abgeschlossene, laufende und geplante Dinge. Nach der Forge-Migration wird `plan.md` strukturell durch `docs/decisions.md` + `CHANGELOG.md` ersetzt werden müssen.

---

## 7. Empfehlung

### Phase 0 — Sofortmassnahmen (vor nächstem Deployment, ≤ 1 Tag)

Diese Punkte sind **Sicherheitsmängel** die unabhängig von Forge-Migration sofort behoben werden müssen:

| Priorität | Massnahme | Aufwand |
|---|---|---|
| P0 | `/api/debug`: Auth-Check hinzufügen ODER Endpoint löschen | 5 min |
| P0 | `/api/setup`: Passwort aus Response entfernen, nur `hint` zurückgeben | 5 min |
| P0 | `sendNotification(...).catch(() => {})` → `catch(err => console.error('[WARN] Notification failed:', err))` | 5 min |
| P0 | `checkScraperHealth` silent catch → `catch(err => { console.warn('[WARN] Scraper health check failed:', err); return false; })` | 5 min |

### Phase 1 — Forge-Web Foundation (Woche 1–2)

Forge-Web-Pflichtartefakte anlegen, ohne Code zu ändern:

| Massnahme | Forge-Regel | Aufwand |
|---|---|---|
| `CHANGELOG.md` anlegen (Initial entry v0.1.0) | `git-commits-and-changelog.mdc` | 30 min |
| `docs/component-ownership.md` anlegen | `component-ownership.mdc` | 30 min |
| `docs/decisions.md` anlegen mit ADR-001 (Tech Stack), ADR-002 (Encryption), ADR-003 (Single-Tenant) | `governance-precedence.mdc` | 2 h |
| `.cursor/rules/` einrichten (Forge-Regeln synchronisieren) | `sync-deviation-policy.mdc` | 1 h |

### Phase 2 — Test-Fundament legen (Woche 2–4)

Ohne Tests ist jeder weitere Fortschritt riskant:

| Massnahme | Priorität | Aufwand |
|---|---|---|
| Vitest + Testing-Library aufsetzen | Hoch | 2 h |
| Unit-Tests für `lib/crypto/aes.ts` (Encrypt/Decrypt Roundtrip) | Kritisch | 2 h |
| Unit-Tests für `lib/generation/themes.ts` + `texts.ts` (Mock AI-Client) | Kritisch | 4 h |
| Integration-Tests für `/api/projects` Route | Hoch | 3 h |
| GitHub Actions CI-Pipeline (lint + typecheck + test) | Hoch | 2 h |

### Phase 3 — Resilience & Logging (Woche 3–5)

| Massnahme | Forge-Regel | Aufwand |
|---|---|---|
| Strukturierten Logger einführen (pino oder winston) | `terminal-output.mdc` | 3 h |
| `withRetry`-Wrapper für alle externen IO-Calls | `resilience.mdc §3c` | 4 h |
| Alle stillen Catch-Blöcke mit Logger versehen | `resilience.mdc §3a` | 2 h |

### Phase 4 — Encryption at Rest für PII (Woche 4–6)

| Massnahme | Forge-Regel | Aufwand |
|---|---|---|
| Forge `encrypt()`/`decrypt()` Pattern für `User.email`, `User.name` | `web-encryption-at-rest.mdc` | 1 Tag |
| Prisma Migration: `emailEncrypted` Spalte, Datenmigration | — | 1 Tag |
| `PraxisUser.email`, `PraxisUser.name` analog | — | 0.5 Tage |
| DSGVO-Erasure Strategy dokumentieren (Key-Deletion vs. Null-Overwrite) | — | 2 h |

### Phase 5 — Data Model Cleanup (Woche 5–7)

| Massnahme | Begründung | Aufwand |
|---|---|---|
| SMTP-Config in eigenes Prisma-Modell `SmtpConfig` | Schema-Integrität | 1 Tag |
| `Json`-Spalten mit Zod-Schemas validieren (beim Lesen) | Typ-Sicherheit | 1 Tag |
| `/api/projects` GET: `where: { createdById: session.user.id }` (STAFF-Sicht) | Datenschutz | 1 h |
| In-Memory Rate-Limiter gegen Redis/Upstash ersetzen | Skalierbarkeit | 1 Tag |

### Phase 6 — Forge-Web-Integration (Woche 6–8)

Erst wenn Phase 0–4 abgeschlossen sind, ist die Codebasis bereit für die vollständige Forge-Web-Integration (`forge-web sync`). Die offenen Security- und Resilience-Befunde würden sonst in den Forge-verwalteten Dateien auftauchen und sofort als Deviations markiert.

---

## 8. Anhang: Befund-Katalog

| ID | Schwere | Kategorie | Datei | Beschreibung |
|---|---|---|---|---|
| F-001 | KRITISCH | Sicherheit | `app/api/debug/route.ts` | Unauthentifizierter Endpoint — Environment-Variable-Disclosure |
| F-002 | KRITISCH | Sicherheit | `app/api/setup/route.ts` | Plaintext-Passwort in HTTP-Response-Body |
| F-003 | HOCH | Sicherheit | `prisma/schema.prisma` | `User.email`, `User.name` in Plaintext (PII / DSGVO) |
| F-004 | HOCH | Sicherheit | `prisma/schema.prisma` | `PraxisUser.email`, `PraxisUser.name` in Plaintext (PII) |
| F-005 | HOCH | Resilienz | `lib/generation/pipeline.ts:172` | `sendNotification(...).catch(() => {})` — stiller Catch |
| F-006 | HOCH | Resilienz | `lib/scraper/client.ts:58-61` | `checkScraperHealth` — stiller Catch |
| F-007 | HOCH | Resilienz | `lib/email/mailer.ts:39` | SMTP-Config Parse — stiller Catch ohne Log |
| F-008 | HOCH | Resilienz | `lib/scraper/client.ts` | Kein Retry auf `scrapeUrl()` |
| F-009 | HOCH | Resilienz | `lib/generation/themes.ts`, `texts.ts` | Alle AI-Calls ohne Retry-Wrapper |
| F-010 | HOCH | Architektur | `app/api/projects/route.ts:23` | `findMany()` ohne User-Filter (alle Projekte für alle) |
| F-011 | MITTEL | Architektur | `lib/ratelimit/index.ts` | In-Memory Rate-Limiter — funktioniert nicht multi-instance |
| F-012 | MITTEL | Architektur | `lib/email/mailer.ts` | SMTP-Config missbraucht `ApiKey`-Tabelle mit `HEDY`-Provider-Hack |
| F-013 | MITTEL | Architektur | `prisma/schema.prisma` | `Project.scrapedData/themeResults/textResults` — schemalose `Json`-Spalten |
| F-014 | MITTEL | Architektur | `lib/generation/job-store.ts` | In-Memory Job-Store — kein Restart-Recovery |
| F-015 | MITTEL | Code-Qualität | Gesamtes Projekt | Kein strukturierter Logger — nur `console.log/error` |
| F-016 | MITTEL | Code-Qualität | Kein File | Kein ESLint-Config-File — nur `eslint-config-next` Defaults |
| F-017 | MITTEL | Governance | Projekt-Root | `CHANGELOG.md` fehlt (Forge Hard Rule) |
| F-018 | MITTEL | Governance | Projekt-Root | Keine ADRs, kein `docs/decisions.md` |
| F-019 | MITTEL | Governance | Projekt-Root | Kein `docs/component-ownership.md` / `CODEOWNERS` |
| F-020 | NIEDRIG | Code-Qualität | `lib/generation/pipeline.ts` | `JSON.parse(JSON.stringify(...))` als Serialisierungspattern |
| F-021 | NIEDRIG | Sicherheit | `lib/crypto/aes.ts` | Kein Versions-Präfix im verschlüsselten String — Key-Rotation nicht vorbereitet |

---

*Report generiert von Cursor Agent — keine Codeänderungen vorgenommen.*
*Für Rückfragen und Priorisierung: Review Phase 0 zuerst, danach sequenziell.*
