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
| **2** | Collaboration & Integration | ~45 % | Feedback-Loop, Social Drafts, E-Mail aktiv |
| **3** | Erweiterungen | ~15 % | Hedy, Praxis-Portal, WordPress, KlickTipp, KPI |
| **4** | Quality & Scale | 0 % | Stabiler Betrieb mit 10+ Projekten |

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

### Sprint 2 — Tests (ca. 3–5 Tage)

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

### Sprint 3 — PII-Encryption & Logging (ca. 3 Tage)

Forge-Compliance herstellen für `web-encryption-at-rest.mdc`.

| Aufgabe | Forge-Regel |
|---|---|
| Strukturierten Logger einführen (pino) | `terminal-output.mdc` |
| `User.emailEncrypted`, `User.nameEncrypted` Prisma-Migration | `web-encryption-at-rest.mdc` |
| `PraxisUser.emailEncrypted` analog | `web-encryption-at-rest.mdc` |
| Versions-Präfix `v1:` in `lib/crypto/aes.ts` für Key-Rotation | ADR-003 |

---

## Phase-1-Restarbeiten (nach Sprint 0–2)

Diese Slices sind teilweise implementiert und müssen vervollständigt werden:

| Slice | Lücke | Aufwand |
|---|---|---|
| Slice 16 (Auth) | Passwort-Vergessen-Email, Admin-User-Verwaltungs-UI, Auto-Logout 30 min | 1 Tag |
| Slice 4 (API-Key-Manager) | Pro-Projekt-Key-Auswahl (FA-F-11a), Social-Token-Manager-UI | 1 Tag |
| Slice 9 (Export) | Dateinamen-Konvention `[PraxisKürzel]_[Kanal]_[MonatJahr]_v[N]` | 0.5 Tage |
| Slice 13 (KI-Texte) | Blog-Gliederungsschritt vor Volltext (FA-KI-04) | 1–2 Tage |
| Pipeline (canva_loaded) | Canva-Context-Injektion in Pipeline verdrahten | 0.5 Tage |

---

## Phase-2-Backlog

| Slice | Name | Status |
|---|---|---|
| Slice 6 | Text-Editor (Autosave-Indikator) | ⚠️ Teilweise |
| Slice 8 | Chat + Versionen (Kontext-Binding, Chips, Versionierung) | ⚠️ Teilweise |
| Slice 7 | Kalender (Drag & Drop, Status-Farben) | ⚠️ Teilweise |
| Slice 11a | DataForSEO Keyword-Review-UI | ⚠️ Stub |
| Slice 17 | Canva OAuth 2.0 Flow + Ordner-Such-UI | ⚠️ Stub |
| Slice 18 | Social Drafts UI + Provider-Hacks bereinigen | ⚠️ Stub |
| Slice 19 | E-Mail: HTML-Mails, restliche Trigger, SMTP-UI | ⚠️ Teilweise |

---

## Phase-3-Backlog (plan.md v6.1)

| Slice | Name | Prio |
|---|---|---|
| **28 (NEU)** | Compliance & Governance (Audit-Log, HWG-Gate, Review-Workflow) | **P1** |
| 27 | Kosten-Tracking pro Kunde (CSV-Export, Marge-Kalkulation) | P1 |
| 20 | Hedy-Integration (Transkript → Positionierungsdokument) | P1 |
| 21 | Praxis-Portal (lesen, kommentieren, freigeben) | P1 |
| 22 | WordPress REST API Connector | P1 |
| 23 | KlickTipp Newsletter Connector | P1 |
| 24 | KPI-Dashboard + automatischer Monatsreport | P1 |
| 25 | Fachgebiet-Templates + Klon-Funktion | P2 |
| 26 | Token-Ablauf-Warnsystem | P2 |

---

## Offene strategische Entscheidungen (vor Phase 3 fällen)

| Punkt | Optionen | Dringlichkeit |
|---|---|---|
| Meta-Business-Verifizierung | Sofort beantragen (Vorlaufzeit Wochen) | **Jetzt** |
| DataForSEO-Validierung | PAA für 3 reale Praxis-URLs testen | Vor Slice 11a |
| KT-Listenstrategie | Eine Liste vs. Tagging-Strategie | Vor Slice 23 |
| WP-Varianten | Jimdo/Wix: nur HTML-Export, kein Connector | Vor Slice 22 |
| VPS-Kapazität | Läuft bis 2027-02-28 | Vor Launch |
