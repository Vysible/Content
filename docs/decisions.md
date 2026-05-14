# Architecture Decision Records (ADRs)

Alle signifikanten Architekturentscheidungen für Vysible.
Autorität: Diese Datei hat Vorrang vor `plan.md`, `AGENTS.md` und Code-Kommentaren
(siehe `governance-precedence.mdc`).

---

## ADR-001 — Tech Stack

**Datum:** Mai 2026  
**Status:** Accepted

**Entscheidung:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, Prisma 5, PostgreSQL 16, Auth.js v5, pnpm.

**Begründung:** Next.js App Router ermöglicht Server Components für Datenzugriff ohne Client-Round-Trip. Prisma bietet typsichere DB-Zugriffe. Auth.js v5 ist die empfohlene Auth-Lösung für Next.js App Router. PostgreSQL ab Phase 0 (kein SQLite-Migration-Risiko später). pnpm für schnelle, deterministisch lockbare Installs.

**Konsequenzen:** `services/playwright/` hat eigenes `tsconfig.json` und ist vom Root-TypeScript-Compiler ausgeschlossen.

---

## ADR-002 — Single-Tenant / Agentur-intern

**Datum:** Mai 2026  
**Status:** Accepted

**Entscheidung:** Vysible ist ein agentur-internes Single-Tenant-System. Kein Mandanten-Splitting im DB-Schema, kein SaaS-Pricing-Layer, kein Public-Signup.

**Begründung:** Initiale Nutzerbasis ist eine Marketingagentur mit wenigen Mitarbeitern. Multi-Tenant-Komplexität (Row-Level-Security, Tenant-Isolation, Billing) ist nicht gerechtfertigt.

**Konsequenzen:** `Project`-Schema hat `createdById` (User-Referenz), aber keine `tenantId`. Eine spätere SaaS-Migration erfordert Schema-Erweiterung. Diese Entscheidung ist in `plan.md` (Entscheidungslog) dokumentiert.

---

## ADR-003 — AES-256-GCM Envelope-Encryption für API-Keys

**Datum:** Mai 2026  
**Status:** Accepted

**Entscheidung:** Alle externen API-Keys (Anthropic, OpenAI, DataForSEO, Canva, Meta, LinkedIn, SMTP, WordPress, KlickTipp) werden AES-256-GCM verschlüsselt in der DB gespeichert. Der Encryption-Key liegt ausschliesslich in `ENCRYPTION_SECRET` (ENV-Variable, 64-Hex-Zeichen).

**Begründung:** API-Keys sind hochsensible Credentials. Ein DB-Dump darf keine nutzbaren Keys enthalten. Entspricht `web-encryption-at-rest.mdc`.

**Konsequenzen:** `lib/crypto/aes.ts` ist die einzige Stelle für Encrypt/Decrypt. Format: `iv:authTag:ciphertext` (hex-kodiert). Key-Rotation erfordert neues `ENCRYPTION_SECRET_V2` — Versions-Präfix fehlt aktuell (bekannte Lücke, dokumentiert in `forge-web-deviations.md`).

---

## ADR-004 — Playwright als eigenständiger Microservice

**Datum:** Mai 2026  
**Status:** Accepted

**Entscheidung:** Der Web-Scraper läuft als eigenständiger Express-Service in einem separaten Docker-Container (`services/playwright/`), nicht als Next.js API Route.

**Begründung:** Chromium-Prozesse haben hohen Memory-Footprint (~512MB). Ein Crash des Scrapers soll nicht die Next.js-App beeinflussen. Der Container kann unabhängig skaliert und mit `mem_limit: 512m` gecapped werden.

**Konsequenzen:** Kommunikation via HTTP (`PLAYWRIGHT_SERVICE_URL`). Der Service ist im Root-TypeScript-Compiler ausgeschlossen. Eigenes `Dockerfile` und `package.json`.

---

## ADR-005 — plan.md v6.1 erweitert Konzeptdokument v6.0

**Datum:** Mai 2026  
**Status:** Accepted

**Entscheidung:** Das interne `plan.md` (v6.1) erweitert das formelle Konzeptdokument `KI_Content_Plattform_Anforderungen_v6.0` um zusätzliche Slices (20: Hedy-Integration, 21: Praxis-Portal, 22: WordPress, 23: KlickTipp, 24: KPI-Dashboard, 25: Templates, 26: Token-Warning, 27: Kosten-Tracking). Das Konzeptdokument bleibt die autoritative Quelle für P1-Anforderungen.

**Begründung:** Das Konzept v6 deckt den Phase-1/2-Scope ab. Die Erweiterungen in plan.md v6.1 adressieren Agentur-spezifische Workflows (Hedy, WordPress, KlickTipp) die über den initialen MVP-Scope hinausgehen.

**Konsequenzen:**
- **Kritische Lücke:** Die Slice-20-Neubelegung (Konzept v6: Audit-Log + Compliance-Gate → plan.md v6.1: Hedy-Integration) hat zur Folge, dass FA-B-11 (audit_log), FA-B-12 (Datenisolation), FA-B-13 (HWG-Compliance-Gate) und FA-F-31 (Review-Workflow) in plan.md fehlen. Diese Anforderungen sind **P1** und werden als **Slice 28 (Compliance & Governance)** in Phase 3 von plan.md nachgetragen.
- `plan.md` ist ein Entwicklungs-Artefakt, kein Governance-Dokument. Architekturentscheidungen gehören in diese Datei (`docs/decisions.md`).

---

## ADR-006 — Forge-Web Consumer-Integration

**Datum:** Mai 2026  
**Status:** Accepted

**Entscheidung:** Vysible wird als Forge-Web-Consumer registriert. Maturity-Level: `DEVELOPMENT`.

**Begründung:** Forge-Web stellt Governance-Regeln bereit, die einheitliche Code-Qualität, Sicherheits-Patterns und Commit-Disziplin sicherstellen. Die Migration erfolgt zum Zeitpunkt aktiver Entwicklung, damit alle Folge-Commits unter diesen Regeln entstehen.

**Konsequenzen:** `.cursor/rules/` und `.windsurf/rules/` werden von forge-web verwaltet. Bekannte Abweichungen sind in `docs/forge-web-deviations.md` dokumentiert.
