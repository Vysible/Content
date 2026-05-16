# Roadmap — Vysible

> Implementierungsreihenfolge und Sprint-Planung.
> Vollständige Slice-Prompts: `plan.md`.
> Anforderungen: `KI_Content_Plattform_Anforderungen_v6.0` (Konzeptdokument).

---

## Phasenübersicht

| Phase | Name | Status | Definition of Done |
|---|---|---|---|
| **0** | Foundation | ✅ Abgeschlossen | Auth, Docker, SSL, YAML, AES-256, KI-Adapter |
| **1** | Core MVP | ~70 % | Content-Paket generiert, ZIP heruntergeladen, Quality-Kriterien erfüllt |
| **2** | Collaboration & Integration | ~85 % | Feedback-Loop, Social Drafts, E-Mail aktiv |
| **3** | Erweiterungen | ~65 % | Hedy, Praxis-Portal, WordPress, KlickTipp, KPI |
| **4** | Quality & Scale | ~60 % | Stabiler Betrieb mit 10+ Projekten |

---

## Nächste Sprints (priorisiert)

### Sprint 0 — Stabilisierung (ca. 3 Tage)

Keine neuen Features. Technische Schuld die jeden Folgesprint blockiert.

| Aufgabe | Warum | Forge-Regel |
|---|---|---|
| `generation_jobs`-Tabelle in Prisma + Job-Store auf DB umstellen | NFA-18: Reload verliert laufende Generierung | — |
| `sendNotification(...).catch(() => {})` → Logger | Stiller Catch, unsichtbarer Fehler | `resilience.mdc §3a` |
| `checkScraperHealth` bare catch → Logger | Stiller Catch | `resilience.mdc §3a` |
| `DataForSEO` client: 2 stille Catches reparieren | Stiller Catch | `resilience.mdc §3a` |
| `withRetry`-Wrapper für `scrapeUrl`, AI-Calls, `sendMail` | NFA-06: kein Exponential-Backoff | `resilience.mdc §3c` |
| SMTP-Config in eigenes Prisma-Modell `SmtpConfig` | HEDY-Provider-Hack bereinigen | — |

### Sprint 1 — Slice 28: Compliance & Governance ✅ Abgeschlossen (2026-05-14)

P1-Anforderungen aus Konzept v6, die in plan.md v6.1 fehlen (ADR-005).

| Aufgabe | Anforderung |
|---|---|
| `audit_log`-Tabelle in Prisma | FA-B-11 |
| Logging-Middleware für alle definierten Actions | FA-B-11 |
| `reviewMode`-Feld in `Project` (simple/complete) | FA-F-31 |
| Review-Workflow-UI: Statuswechsel-Buttons | FA-F-31 |
| HWG-Compliance-Gate: Rot-Flag blockiert Export + Post-Button | FA-B-13 |
| `/api/projects` GET: `where: { createdById: session.user.id }` | FA-B-12 |
| Audit-Log-Aktivitäten-Tab pro Projekt | FA-F-32 |

### Sprint 2 — Tests ✅ Abgeschlossen (2026-05-14)

Ohne Tests ist jeder weitere Sprint ein Blindflug (NFA-16).

| Aufgabe | Framework |
|---|---|
| Vitest aufsetzen | Vitest |
| Unit-Tests: `lib/crypto/aes.ts` (Roundtrip) | Vitest |
| Unit-Tests: `ThemenItemSchema`-Validierung + Quality-Check | Vitest |
| Unit-Tests: HWG-Compliance-Gate | Vitest |
| Integration-Test: `/api/generate/start` (Mock-AI) | Vitest |
| E2E-Grundgerüst: URL → ZIP | Playwright |
| GitHub Actions CI: lint + typecheck + test | — |

### Sprint 3 — PII-Encryption & Logging ✅ Abgeschlossen (2026-05-14)

Forge-Compliance herstellen für `web-encryption-at-rest.mdc`.

| Aufgabe | Forge-Regel |
|---|---|
| Strukturierten Logger einführen (pino) | `terminal-output.mdc` |
| `User.emailEncrypted`, `User.nameEncrypted` Prisma-Migration | `web-encryption-at-rest.mdc` |
| `PraxisUser.emailEncrypted` analog | `web-encryption-at-rest.mdc` |
| Versions-Präfix `v1:` in `lib/crypto/aes.ts` für Key-Rotation | ADR-003 |

---

## Phase-1-Restarbeiten (nach Sprint 0–2) ✅ Abgeschlossen (2026-05-14)

| Slice | Lücke | Status |
|---|---|---|
| Slice 16 (Auth) | Passwort-Vergessen-Email, Admin-User-Verwaltungs-UI, Auto-Logout 30 min | ✅ Commit 89d8185 |
| Slice 4 (API-Key-Manager) | Pro-Projekt-Key-Auswahl (FA-F-11a), Social-Token-Manager-UI | ✅ Commit 4be7a65 |
| Slice 9 (Export) | Dateinamen-Konvention `[PraxisKürzel]_[Kanal]_[MonatJahr]_v[N]` | ✅ Commit 62f6c19 |
| Slice 13 (KI-Texte) | Blog-Gliederungsschritt vor Volltext (FA-KI-04) | ✅ Commit b749a01 |
| Pipeline (canva_loaded) | Canva-Context-Injektion in Pipeline verdrahten | ✅ Commit 36461b3 |

---

## Phase-2-Backlog

| Slice | Name | Status |
|---|---|---|
| Slice 6 | Text-Editor (Autosave-Indikator) | ✅ Abgeschlossen (2026-05-14, Sprint P2-A · Commit bc6f205) |
| Slice 8 | Chat + Versionen (Kontext-Binding, Chips, Versionierung) | ✅ Abgeschlossen (2026-05-14, Sprint P2-A · Commit 581aaab) |
| Slice 7 | Kalender (Drag & Drop, Status-Farben) | ✅ Abgeschlossen (2026-05-14, Sprint P2-B · Commit b759c84) |
| Slice 10 | Sharing (Newsletter + Social im Freigabelink) | ✅ Abgeschlossen (2026-05-14, Sprint P2-B · Commit 5f36b5f) |
| Slice 11a | DataForSEO Keyword-Review-UI | ✅ Abgeschlossen (2026-05-15, Sprint P2-D · Commit 14906ad) |
| Slice 17 | Canva OAuth 2.0 Flow + Ordner-Such-UI | ✅ Abgeschlossen (2026-05-15, Sprint P2-E) |
| Slice 18 | Social Drafts UI + Provider-Hacks bereinigen | ✅ Abgeschlossen (2026-05-15, Sprint P2-F) |
| Slice 19 | E-Mail: HTML-Mails, restliche Trigger, SMTP-UI | ✅ Abgeschlossen (2026-05-15, Sprint P2-C) |

---

## Phase-3-Backlog (plan.md v6.1)

| Slice | Name | Status |
|---|---|---|
| **28 (NEU)** | Compliance & Governance (Audit-Log, HWG-Gate, Review-Workflow) | ✅ Abgeschlossen (2026-05-14, Sprint 1) |
| 27 | Kosten-Tracking pro Kunde (CSV-Export, Marge-Kalkulation) | ✅ Abgeschlossen (2026-05-15, Sprint P3-A) |
| 20 | Hedy-Integration (Transkript → Positionierungsdokument) | ✅ Abgeschlossen (2026-05-15, Sprint P3-B) |
| 21 | Praxis-Portal (lesen, kommentieren, freigeben) | ✅ Abgeschlossen (2026-05-15, Sprint P3-C) |
| 22 | WordPress REST API Connector | ✅ Abgeschlossen (2026-05-15, Sprint P3-D) |
| 23 | KlickTipp Newsletter Connector | ✅ Abgeschlossen (2026-05-15, Sprint P3-E) |
| 24 | KPI-Dashboard + automatischer Monatsreport | ✅ Abgeschlossen (2026-05-15, Sprint P3-F) |
| 25 | Fachgebiet-Templates + Klon-Funktion | ✅ Abgeschlossen (2026-05-15, Sprint P3-G) |
| 26 | Token-Ablauf-Warnsystem | ✅ Abgeschlossen (2026-05-15, Sprint P3-H) |

---

## Phase-4-Backlog (plan.md v6.1 — Quality & Scale)

| Slice | Name | Status |
|---|---|---|
| 14 | SEO-Analyse (Keyword-Dichte, Meta-Description, Title-Tag) | ✅ Abgeschlossen (2026-05-16, Sprint P4-A) |
| 15 | Bildbriefing erweitert | ✅ Abgeschlossen (2026-05-16, Sprint P4-B) |
| — | NFA-Härtung (Rate-Limit Middleware, CSP, DSGVO-Löschkaskade, AI-Timeouts, Zod) | ✅ Abgeschlossen (2026-05-16, Sprint P4-C) |

---

## Offene strategische Entscheidungen (vor Phase 3 fällen)

| Punkt | Optionen | Dringlichkeit |
|---|---|---|
| Meta-Business-Verifizierung | Sofort beantragen (Vorlaufzeit Wochen) | **Jetzt** |
| DataForSEO-Validierung | PAA für 3 reale Praxis-URLs testen | Vor Slice 11a |
| KT-Listenstrategie | Eine Liste vs. Tagging-Strategie | Vor Slice 23 |
| WP-Varianten | Jimdo/Wix: nur HTML-Export, kein Connector | Vor Slice 22 |
| VPS-Kapazität | Läuft bis 2027-02-28 | Vor Launch |
