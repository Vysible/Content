# Component Ownership

Alle signifikanten Komponenten von Vysible und ihre Eigentümer.
Einzelentwickler-Projekt — alle Komponenten gehören dem Repository-Maintainer.

**Stand:** Mai 2026  
**Modell:** Solo Developer (Model A gemäss `component-ownership.mdc`)

---

## Ownership-Übersicht

Alle Komponenten: **@kaiDa** (Repository-Maintainer)

Diese Deklaration gilt bis ein zweiter Contributor Schreibzugriff erhält.
Bei Team-Erweiterung: Tabelle unten nach Komponent aufteilen und `CODEOWNERS` anlegen.

---

## Komponentenstruktur (zur Orientierung)

| Bereich | Pfad | Beschreibung |
|---|---|---|
| KI-Pipeline | `lib/generation/` | Themes, Texts, Bildbriefings, Job-Store, SSE |
| Auth | `auth.ts`, `auth.config.ts`, `middleware.ts` | Auth.js v5, Sessions, Route-Schutz |
| Scraper | `services/playwright/` | Playwright-Microservice |
| Crypto | `lib/crypto/` | AES-256-GCM Encryption |
| Integrationen | `lib/canva/`, `lib/social/`, `lib/dataseo/`, `lib/wordpress/`, `lib/klicktipp/`, `lib/hedy/` | Externe API-Clients |
| Export | `lib/export/` | DOCX, PDF, XLSX, HTML, ZIP |
| Cost-Tracking | `lib/costs/` | CostEntry, Aggregation, Reports |
| API-Routes | `app/api/` | Next.js Route Handlers |
| Frontend | `app/(dashboard)/`, `components/` | UI-Komponenten |
| DB-Schema | `prisma/schema.prisma` | Datenmodell |
| Prompts | `prompts/*.yaml` | KI-Prompts (editierbar ohne Deployment) |
| Templates | `templates/*.yaml` | Fachgebiet-Templates |
