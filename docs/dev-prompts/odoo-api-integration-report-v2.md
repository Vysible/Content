# Odoo External API — Integration Konzept & Sprint-Prompt (Vysible)

**Dokument:** Odoo API Integration — vollständiges Konzept  
**Version:** 2.0  
**Datum:** 2026-06-21  
**Autor:** SW-Architekt + DevOps Review (konsolidiert)  
**Scope:** Odoo 18 External API ↔ Vysible — Greenfield-Integration  
**Gesamturteil:** GO MIT AUFLAGEN (alle Blocker in Sprint-Prompt adressiert)

---

## Executive Summary

| Frage | Befund |
|---|---|
| Ist Odoo in Vysible integriert? | **Nein — 0% implementiert** |
| Partial oder vollständig vorhanden? | **Nichts** — kein Code, kein Schema, keine ENV-Vars, keine Tests, kein Plan-Slice |
| Beweisen bestehende Tests Odoo-Produktivität? | **Nein** — 63 Tests laufen durch, null Odoo-bezogen |
| Warum funktioniert die Schnittstelle nicht? | **Nicht kaputt — nie gebaut** |
| Kontext Odoo-Einführung | Odoo wird **neu in der Agentur eingeführt** — keine Bestandsdaten vorhanden |
| Odoo-Plan | **Custom Plan** (External API aktiviert) — bestätigt |
| Admin-Zugang Odoo | **Vanessa K.** (Cheffin der Agentur) |
| Empfohlener nächster Schritt | Greenfield-Integration via **JSON-RPC + API Key** nach WordPress/KlickTipp-Pattern; Scope: **CRM-Sync (Client → res.partner)** als MVP; täglicher automatischer Sync + manueller Trigger jederzeit |

---

## 1. Odoo External API — Technische Grundlagen

### 1.1 Protokoll & Endpunkte

Odoo exponiert seine ORM-Schicht (Models API) über HTTP RPC. Für Odoo 18 stehen drei Protokolle zur Verfügung:

| Protokoll | Endpunkt | Status (2026) | Node.js-Eignung |
|---|---|---|---|
| **XML-RPC** | `/xmlrpc/2/common`, `/xmlrpc/2/object` | Dokumentiert für Odoo 18; Legacy | Erfordert `xmlrpc` npm-Paket; verbose XML-Parsing |
| **JSON-RPC** | `/jsonrpc` | Gleiche ORM-Oberfläche wie XML-RPC; intern vom Odoo-Web-Client genutzt | Natives JSON; **empfohlen für neue TS-Integrationen auf Odoo 18** |
| **JSON-2** | `/json/2/{model}/{method}` | Ab Odoo 18.4+; Bearer API-Key; REST-Stil | Beste Langzeitoption; `fetch` + `Authorization: bearer` |

**Deprecation-Timeline (korrekt):**  
`/jsonrpc` und `/xmlrpc` sind für Removal in **Odoo 22 (ca. Herbst 2028)** und **Odoo Online 21.1 (ca. Winter 2027)** eingeplant. Odoo 19 *kündigt* die Deprecation an, entfernt die Endpoints nicht. Kein Handlungsbedarf vor Sprint P6.

**Entscheidung für Sprint P5-A:** JSON-RPC (Odoo 18 stabil). Transport-Abstraktion (`OdooTransport`-Interface) vorbereiten, sodass JSON-2 ohne Refactoring des Sync-Codes einschwenkbar ist, sobald die Odoo-Instanz ≥ 18.4 läuft.

### 1.2 Authentifizierung

**Flow (JSON-RPC):**

1. `POST /jsonrpc` → service `common`, method `authenticate`, args `[db, username, apiKey, {}]` → gibt `uid` (Integer) zurück
2. Alle Datencalls: service `object`, method `execute_kw`, args `[db, uid, apiKey, model, method, posArgs, kwArgs]`

**Wichtige Regel:** `authenticate` darf **nicht** in `withRetry` gewrappt werden. Auth-Fehler (falscher API-Key) sind permanent — kein transienter Netzwerkfehler. Odoo Online sperrt Accounts nach mehreren Fehlversuchen (Standard: 5 in 10 Min). `withRetry` ausschließlich auf `executeKw` anwenden.

**API Keys (Odoo 14+):** API-Key ersetzt das Passwort; Login-Username bleibt gleich. API-Key erstellen: Odoo → User Profile → Account Security → New API Key. Zuständig: **Vanessa K.**

**Plan-Restriktion:** External API erfordert **Custom Odoo Pricing** — bestätigt aktiv.

### 1.3 Core ORM-Methoden (via `execute_kw`)

| Methode | Zweck |
|---|---|
| `search(domain)` | Gibt Record-IDs zurück |
| `search_count(domain)` | Anzahl ohne Records |
| `search_read(domain, fields, limit, offset)` | Kombiniertes Search + Read |
| `create(values)` | Erstellt einen Record, gibt ID zurück |
| `write(ids, values)` | Aktualisiert Records |
| `unlink(ids)` | Löscht Records |
| `fields_get()` | Modell-Introspektion |

Domain-Filter in polnischer Notation: `[['is_company', '=', True]]`

### 1.4 Odoo Online vs. Self-Hosted

| Aspekt | Odoo Online (`.odoo.com`) | Self-Hosted |
|---|---|---|
| Passwort | Muss manuell gesetzt werden | Standard-Benutzerpasswort |
| Datenbankname | Instanzname (z.B. `myagency`) | Konfigurierter DB-Name |
| URL | `https://myagency.odoo.com` | Custom Domain |

**Odoo Online:** Nutzer werden ohne lokales Passwort erstellt (Login via Odoo-Online-Auth-System). API-Key als Passwort-Ersatz ist deshalb **Pflicht**.

### 1.5 Relevante Odoo-Modelle für Vysible

| Vysible-Entity | Odoo-Modell | Sync-Richtung | Sprint |
|---|---|---|---|
| `Client` | `res.partner` | Vysible → Odoo (create/update) | **P5-A (MVP)** |
| `Project` | `project.project` | Vysible → Odoo | P5-B |
| `CostEntry`-Aggregation | `account.analytic.line` | Vysible → Odoo (nach Generation) | P5-B |
| Rechnungs-Trigger | `sale.order` / `account.move` | Manuell oder auf Milestone | Phase 6+ |

> **Modul-Hinweis:** `res.partner` ist im Basis-Modul `base` immer vorhanden. Für CRM-spezifische Felder (`customer_rank`, `supplier_rank`) muss Modul `contacts` oder `crm` installiert sein — Prüfung via `fields_get` beim Connection-Test.

---

## 2. Vysible Projektstatus — Odoo-Integration

### 2.1 Codebase-Analyse

| Suchziel | Ergebnis |
|---|---|
| `odoo`, `Odoo`, `ODOO` in `src/`, `lib/`, `app/` | **0 Treffer** |
| `xmlrpc`, `XML-RPC`, `jsonrpc` | **0 Treffer** |
| Dateien mit `*odoo*` | **0 Dateien** |
| `Provider` Enum in `prisma/schema.prisma` | Kein `ODOO`-Eintrag |
| `IntegrationProvider` in `lib/integrations/store.ts` | Nur `KLICKTIPP \| WORDPRESS \| META \| LINKEDIN` |
| `.env.example` | Kein Odoo-Abschnitt |
| `plan-v6.1.md` / `roadmap.md` | Kein Odoo-Slice |
| npm-Dependencies | Kein `xmlrpc`, kein `odoo-*` |

### 2.2 Implementierungs-Status

| Layer | Erwartet für vollständige Integration | Aktuell |
|---|---|---|
| Prisma-Schema | `ODOO` Provider, `ClientIntegrationMapping` oder Config-JSON | ❌ Fehlt |
| Credential-Speicherung | AES-256 via `ProjectIntegration` oder globaler `ApiKey` | ❌ Fehlt |
| Client-Bibliothek | `lib/odoo/client.ts` mit Transport-Abstraktion | ❌ Fehlt |
| Fehlerklassen | `OdooAuthError`, `OdooNetworkError`, `OdooValidationError`, `OdooAccessError` | ❌ Fehlt |
| Formatter/Mapper | Vysible → Odoo Feldmapping | ❌ Fehlt |
| API-Routen | `/api/odoo/test`, `/api/odoo/sync-client`, `/api/odoo/health` | ❌ Fehlt |
| Sync-Scheduler | Täglicher automatischer Sync + manueller Trigger | ❌ Fehlt |
| Settings-UI | `/settings/odoo` mit Sync-Konfiguration | ❌ Fehlt |
| Unit-Tests | Client-Mock, Mapper-Tests, Error-Klassen-Tests | ❌ Fehlt |
| Integration-Tests | Auth + `search_read` gegen nock-Mock | ❌ Fehlt |
| Smoke-Script | `scripts/smoke-odoo.ts` | ❌ Fehlt |
| Health-Endpoint | `/api/odoo/health` | ❌ Fehlt |
| Dokumentation | ADR-007, User-Manual-Abschnitt | ❌ Fehlt |

**Urteil: Vollständig absent — keine partielle Implementierung.**

### 2.3 Referenz-Pattern (bestehende Integrationen)

Vysible hat eine bewährte Integrations-Architektur. WordPress ist die nächste Analogie (pro-Projekt-Credentials, Draft-Push, Connection-Test):

```
lib/integrations/store.ts          → AES-256 Credential CRUD
lib/wordpress/client.ts            → withRetry + loadCredentials + HTTP API
lib/wordpress/formatter.ts         → Content → externes Format
app/api/wordpress/draft/           → Auth Route + HWG Gate
app/(dashboard)/settings/wordpress/ → Settings UI
```

Odoo folgt demselben Layering — RPC statt REST wo nötig.

---

## 3. Test-Status

### 3.1 Automatischer Test-Lauf (2026-06-21)

| Metrik | Ergebnis |
|---|---|
| Test-Dateien | 10 bestanden |
| Tests | 63 bestanden |
| Dauer | ~12 s |
| Odoo-spezifische Tests | **0** |

### 3.2 Test-Kategorien vs. Odoo

| Test-Typ | Odoo-Abdeckung | Schlussfolgerung |
|---|---|---|
| Unit | Keine | Kann RPC-Client oder Mapper nicht validieren |
| Integration | Keine | Kann Auth oder `execute_kw` nicht validieren |
| E2E | Keine | Kein UI-Flow für Odoo Settings/Sync |
| Smoke | Nur generisches `/api/healthz` | Kein Odoo-Health-Endpunkt |

---

## 4. Ursachen-Analyse

### 4.1 Primäre Ursache

**Die Odoo-Schnittstelle wurde nie geplant, spezifiziert oder implementiert.**

Dies ist kein Laufzeitfehler (keine kaputte Auth, kein falscher Endpunkt). Es ist eine **Anforderungs- und Delivery-Lücke**.

### 4.2 Beitragende Faktoren

| Faktor | Evidenz |
|---|---|
| Keine Produktanforderung | `plan-v6.1.md` listet 27 Slices + Compliance; kein Odoo |
| Keine Architekturentscheidung | `docs/decisions.md` — kein ADR für ERP-Integration |
| Konkurrierende Integrationen priorisiert | WordPress (Slice 22), KlickTipp (Slice 23) decken Content-Distribution ab |
| External API Plan-Gate | Odoo Custom Plan erforderlich — nun bestätigt |
| Phase-4-Fokus auf Qualität | Roadmap zeigt Phase 4 abgeschlossen; Odoo nie in den Backlog aufgenommen |

---

## 5. Lösungskonzepte

### Concept A — Minimaler CRM-Sync (Empfohlenes MVP — Sprint P5-A)

**Ziel:** Wenn ein Vysible `Client` erstellt/aktualisiert wird, wird er in Odoo als `res.partner` gespiegelt. Zusätzlich: täglicher automatischer Bulk-Sync aller Clients + manueller Trigger jederzeit.

**Kontext:** Odoo wird neu eingeführt — keine Bestandsdaten. Alle `res.partner`-Einträge werden durch Vysible erstellt. Initial-Sync = erster Bulk-Lauf aller bestehenden Clients.

| Pros | Cons |
|---|---|
| Kleiner Scope (~2 Tage) | Noch kein finanzieller Mehrwert |
| Validiert Auth + RPC End-to-End | Erfordert Odoo CRM-Modul |
| Nutzt `ProjectIntegration`-Pattern | Feldmapping-Entscheidungen erforderlich |
| Idempotentes Upsert via `ref` | Initial-Bulk-Sync muss geplant werden |

**Sync-Flow:**

```
MANUELL: User klickt "Sync" in Vysible Settings oder auf Client-Detailseite
  → POST /api/odoo/sync-client { clientId }
  → lib/odoo/client.ts: authenticate() → uid
  → search_read res.partner by ref='vysible:{clientId}', limit: 2
    → 0 Treffer: create() → odooPartnerId
    → 1 Treffer: write() → odooPartnerId
    → >1 Treffer: ERROR 'duplicate_ref' — kein Write
  → odooPartnerId in IntegrationConfig speichern
  → writeAuditLog(clientId, 'odoo_sync', { action, odooPartnerId })

AUTOMATISCH: Cron-Job (Standard: täglich 02:00 UTC, konfigurierbar in Settings)
  → alle Clients laden
  → jeden Client einzeln syncen (sequential, kein Burst)
  → Ergebnis in Sync-Log
```

**Upsert-Logik (vollständig spezifiziert):**

1. `search_read('res.partner', [['ref','=','vysible:{clientId}']], ['id','name','ref'], limit: 2)`
2. Ergebnis.length === 0 → `create({ name, ref, company_type, customer_rank: 1 })`
3. Ergebnis.length === 1 → `write([id], { name })` (nur geänderte Felder)
4. Ergebnis.length > 1 → `logger.error({ clientId, count: 2 }, 'odoo duplicate_ref')` → `return { ok: false, error: 'duplicate_ref' }` — **kein Write**

### Concept B — Kosten-Export zu Analytic Accounting (Sprint P5-B)

**Ziel:** Nach abgeschlossener Content-Generation, aggregierte `CostEntry`-Totals als Odoo Analytic Lines pushen.

| Pros | Cons |
|---|---|
| Schließt Loop mit `lib/costs/aggregator.ts` | Erfordert Odoo Accounting + Analytic Accounts konfiguriert |
| Direkter Agentur-ROI | Mapping Projekt → Analytic Account nicht trivial |
| Nutzbar via bestehendem Cron | Odoo Multi-Company-Komplexität |

**Flow:**

```
Generation-Job COMPLETE
  → Kosten für projectId aggregieren
  → account.analytic.line erstellen (negativer Betrag = Kosten)
  → optional: Verknüpfung mit sale.order wenn odooOrderId vorhanden
```

### Concept C — Vollständige Bidirektionale ERP-Brücke (Phase 6+)

Clients, Projekte, Deliverables, Rechnungen, Zahlungsstatus synchron halten — aufwand 2–4 Wochen, hohe Kopplung, Konflikte mit ADR-002. **Zurückgestellt auf Phase 6+.**

### Concept D — JSON-2 First (Zukunftspfad)

Direkte Implementierung gegen `/json/2` mit Bearer API-Key. Erfordert Odoo ≥ 18.4. Implementieren als `OdooJson2Transport` hinter Interface — aktivierbar sobald Instanz-Version bestätigt.

---

## 6. Bekannte Probleme & Mitigationen

| Problem | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| Odoo-Account-Lockout durch Retry auf Auth | **Hoch (ohne Korrektur)** | Auth-Sperre | `withRetry` **nicht** auf `authenticate` — nur auf `executeKw` |
| Odoo Online: kein Passwort gesetzt | Mittel | Auth schlägt fehl | API-Key via Vanessa K. erstellen; Pre-Condition |
| Falscher Datenbankname | Mittel | Auth schlägt fehl | Connection-Test gibt expliziten Fehler; `db` in Integration-Config speichern |
| Duplikat `res.partner`-Records | Mittel (manueller Odoo-Eingriff) | Datenqualität | Upsert via `ref`; bei >1 Treffer: Error ohne Write |
| Partial-Write-Inkonsistenz | Mittel | Odoo hat Partner, Vysible weiß es nicht | Bei Write-Fehler: idempotenter Retry via `ref`-Lookup |
| RPC-Timeout bei langsamem Odoo | Mittel | UI hängt | `AbortController` mit 10s Timeout in `jsonRpcCall` |
| API-Key im Log | **Hoch (ohne Korrektur)** | Security | `apiKey: '***'` in allen Log-Statements |
| Fehlender Health-Check | **Hoch (ohne Korrektur)** | Kein Alert bei Odoo-Ausfall | `/api/odoo/health`-Endpunkt in Sub-Slice B |
| Many2one-Feldformat `[id, name]` | Hoch | Mapper-Bugs | `parseMany2one()`-Helper + Unit-Tests |
| Timezone auf Datetime-Feldern | Mittel | Off-by-one | ISO-Strings senden; Odoo erwartet UTC |
| SSL/TLS auf Self-Hosted | Mittel | Verbindungsfehler | Niemals `rejectUnauthorized: false` hardcoden |
| PII in Logs (Partner-E-Mail) | Hoch | Compliance-Verstoß | Nur IDs loggen (AGENTS.md) |
| DSGVO-Löschung: Partner bleibt bei Client-Löschung | Mittel | DSGVO Art. 17 | P5-A: `active: false`-Archivierung als TODO; MUSS in P5-B |
| `demo.odoo.com` als Dev-Instanz | Mittel | Wird täglich zurückgesetzt | Für Connectivity-Tests; für CI: eigene Docker-Instanz |
| Odoo-Version < 18 auf Ziel-Instanz | Niedrig | RPC-Verhalten abweichend | Version-Check im Connection-Test; Warnung bei < 18.0 |

---

## 7. Technische Empfehlungen

### 7.1 Strategische Empfehlung

**Greenfield-Integration als neuer Phase-5-Slice**, beginnend mit **Concept A (CRM-Sync)** mit automatischem täglichem Sync und manuellem Trigger. Concept B (Cost Export) als P5-B nach Validierung von P5-A.

### 7.2 Technische Entscheidungsmatrix

| Entscheidung | Wahl | Begründung |
|---|---|---|
| Protokoll | **JSON-RPC** auf Odoo 18; Transport-Abstraktion für JSON-2 | Natives JSON in Node.js; gleiche ORM-Oberfläche wie dokumentiertes XML-RPC |
| Auth | **API Key** (nicht Passwort) | Odoo Best Practice; rotierbar; passt zu bestehenden Key-Patterns |
| Credential-Scope | **Globale Agentur-Config** (eine Odoo-Instanz) | ADR-002 Single-Tenant; alle Projekte teilen eine Odoo-Instanz |
| Credential-Speicherung | `IntegrationProvider` + `ApiKey` Provider `ODOO` | Konsistent mit WordPress/KlickTipp |
| `odooPartnerId`-Speicherung | **IntegrationConfig-JSON oder `ClientIntegrationMapping`-Tabelle** — NICHT auf `Client`-Modell | Schema-Entkopplung; kein orphaned Column bei Odoo-Abkündigung |
| Library | Thin Custom Client (~150 LOC) über `fetch` | Kein unmaintained `xmlrpc`-npm; volle Kontrolle über Retry/Logging |
| Retry | `withRetry` **nur auf `executeKw`**, niemals auf `authenticate` | Auth-Fehler sind permanent; Account-Lockout-Schutz |
| Timeout | `AbortController` mit 10s in `jsonRpcCall` | Verhindert hängende Next.js-Handler |
| Error-Klassen | `OdooAuthError`, `OdooNetworkError`, `OdooValidationError`, `OdooAccessError` | Nur `OdooNetworkError` ist retry-eligible |
| Sync-Trigger | Manuell (Button) + automatisch täglich (Cron, konfigurierbar in Settings) | Product-Owner-Entscheidung |
| Testing | Unit (vi.mock) + Integration (nock) + manueller Smoke | Kein Live-Odoo in CI |
| Health-Check | `GET /api/odoo/health` → leichtgewichtiger `version()`-Call | Coolify-Monitoring + Alert |

### 7.3 Sicherheits-Selbstprüfung

| Regel | Geplante Compliance | Status |
|---|---|---|
| AES-256 Credentials (ADR-003) | Via `saveIntegration` / `ApiKey` | ✅ Geplant |
| `withRetry` NUR auf `executeKw` | Explizit getrennt; Auth hat eigenes try/catch | ✅ Korrigiert |
| Kein stiller Catch (resilience §3a) | `logger.warn/error` + re-throw oder strukturiertes Return | ✅ Pflicht |
| Kein PII in Logs | Nur `clientId`, `odooPartnerId` — niemals E-Mail/Name | ✅ Pflicht |
| API-Key in Logs maskiert | `apiKey: '***'` in allen Log-Statements | ✅ Pflicht |
| Auth auf allen API-Routen | `getServerSession` | ✅ Standard |
| Mandantentrennung (ADR-002) | Filter via `createdById` / Project-Ownership | ✅ Standard |
| Timeout in RPC-Calls | `AbortController` 10s | ✅ Neu ergänzt |
| DSGVO Löschkonzept | P5-A: TODO-Kommentar; P5-B: `active: false` oder `unlink` | ⚠️ P5-B MUSS |

### 7.4 Pre-Conditions (vor Sprint-Start manuell erledigen)

1. Odoo-Instanz aufgesetzt (Custom Plan — bestätigt). URL, DB-Name notieren.
2. **Vanessa K.** erstellt API-Key: Odoo → User Profile → Account Security → New API Key.
3. Odoo-Version prüfen: Falls ≥ 18.4 → JSON-2 in ADR-007 als sofortige Alternative evaluieren.
4. **Vanessa K.** bestätigt: Odoo wird frisch eingeführt, keine Bestandsdaten in `res.partner` (nochmals manuell verifizieren bei Sprint-Start).
5. Modul-Check: `contacts` oder `crm` installiert (für `customer_rank`). Falls nicht: Standard-Felder von `res.partner` (Base) verwenden.
6. **Vanessa K.** bestätigt DSGVO-Frage: Soll bei Client-Löschung in Vysible der Odoo-Partner archiviert/gelöscht werden? → Antwort beeinflusst P5-A vs. P5-B Scope für `unlink`-Logik.
7. FIX-09 (positioningDocument encryption) abgeschlossen — kein paralleler Schema-Konflikt.
8. Product Owner bestätigt MVP-Scope: **Client → `res.partner` Sync** (kein Rechnungswesen in P5-A).

### 7.5 Sequenzierung relativ zu offenen Arbeiten

| Priorität | Item | Relation zu Odoo |
|---|---|---|
| P1 | FIX-09 positioningDocument encryption | Unabhängig — muss vorher fertig sein |
| P1 | FIX-07 Test Coverage | Odoo-Tests können Teil von FIX-07 Sub-Slice sein |
| P2 | **Sprint P5-A Odoo CRM** (dieses Dokument) | Neu — nach Pre-Conditions |
| P3 | Concept B Cost Export | P5-A Sub-Slice C oder P5-B |

### 7.6 DSGVO-Löschkonzept (P5-A TODO, P5-B MUSS)

`res.partner` enthält PII (Name, E-Mail, Adresse). DSGVO Art. 17 (Recht auf Löschung):

- **P5-A:** Bei Client-Löschung in Vysible: TODO-Kommentar in `lib/odoo/client.ts` dokumentiert die offene Pflicht.
- **P5-B:** `write([odooPartnerId], { active: false })` (Archivierung) oder `unlink([odooPartnerId])` (Löschung) — abhängig von Vanessa K.s Antwort auf Pre-Condition 6.

### 7.7 Evolutionspfad & Wartbarkeit

| Phase | Aktion |
|---|---|
| **Jetzt (P5-A)** | JSON-RPC hinter `OdooTransport`-Interface; ADR-007 committed |
| **P5-B** | JSON-2 als `OdooJson2Transport` implementieren wenn Instanz ≥ 18.4; Feature-Flag in Settings |
| **Bis Winter 2027** | Migration auf JSON-2 für Odoo Online; JSON-RPC bleibt für Self-Hosted bis 2028 |
| **Vor Odoo 22 (2028)** | `OdooJson2Transport` als Default; JSON-RPC-Transport deprecated |

---

## 8. Bekannte Architektur-Alternativen (bewertet)

### Option 1: Event-Queue statt synchroner Sync-Route

**Konzept:** Client-Update-Event in DB-Queue schreiben; Worker verarbeitet asynchron.

**Pros:** UI blockiert nicht; Retry bei Odoo-Ausfall; natürliches Audit-Log.  
**Cons:** ~300+ LOC zusätzlich; kein Queue-System in Vysible; Overkill für <50 Clients.  
**Entscheidung:** Nicht für MVP. Synchrone Route mit Timeout und Fehlerhandling reicht. Evaluieren wenn Sync-Latenz >3s spürbar oder Odoo-Ausfälle häufig.

### Option 2: JSON-2 API sofort

**Konzept:** Direkt `/json/2` mit Bearer API-Key statt JSON-RPC.

**Pros:** Längere Lebensdauer (kein Rework bis 2027/2028); einfachere Auth (kein `uid`-Problem); weniger Boilerplate.  
**Cons:** Erfordert Odoo ≥ 18.4; weniger Community-Beispiele; Doku noch in Entwicklung.  
**Entscheidung:** Solide Alternative wenn Instanz-Version bestätigt ≥ 18.4. **Bei Sprint-Start Vanessa K. nach Odoo-Version fragen** und ADR-007 entsprechend ausfüllen.

### Option 3: npm-Library `@fernandoslim/odoo-jsonrpc`

**Konzept:** Fertige TypeScript-Bibliothek statt Custom-Client.

**Pros:** Wartung extern; generische Typen; API-Key-Support bereits integriert.  
**Cons:** Externe Abhängigkeit; weniger Kontrolle über Logging/Retry-Integration.  
**Entscheidung:** Evaluieren wenn Custom-Client >200 LOC wird oder Typ-Sicherheit schwächelt. Entscheidung in ADR-007 festhalten.

---

## 9. Zu aktualisierende Dokumente nach Implementierung

- `docs/decisions.md` — ADR-007 Odoo-Integration (vor erstem Merge)
- `docs/roadmap.md` — Phase-5-Eintrag
- `docs/dev-prompts/OpenActions.md` — Manuelle Odoo-Validierungs-Checkliste
- `CHANGELOG.md` — User-facing Integration-Hinweis
- `docs/user-manual/benutzerhandbuch.md` — Integrationen-Abschnitt
- `.env.example` — Odoo-Platzhalter-Variablen

---

## 10. Odoo RPC Quick Reference (JSON-RPC)

### Authenticate

```json
POST https://{instance}/jsonrpc
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "service": "common",
    "method": "authenticate",
    "args": ["{db}", "{username}", "{apiKey}", {}]
  },
  "id": 1
}
```

### execute_kw (search_read)

```json
{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "service": "object",
    "method": "execute_kw",
    "args": [
      "{db}", {uid}, "{apiKey}",
      "res.partner", "search_read",
      [[["ref", "=", "vysible:abc123"]]],
      {"fields": ["id", "name", "ref"], "limit": 2}
    ]
  },
  "id": 2
}
```

### Lokale Dev-Instanz (Docker)

```bash
docker run -p 8069:8069 \
  -e HOST=db -e USER=odoo -e PASSWORD=odoo \
  --name odoo18 odoo:18.0
```

`demo.odoo.com` ausschließlich für initiale Connectivity-Tests — wird täglich zurückgesetzt.

---

## 11. Sprint P5-A — Odoo CRM Connector (Slice 29 — NEU)

> **Gespeicherte Standalone-Kopie:** `docs/dev-prompts/sprint-p5a-odoo.md`  
> **Tier 3** — Greenfield, Exploration dominiert.

---

# Sprint P5-A — Odoo CRM Connector (Slice 29 — NEU)

**Projekt:** Vysible  
**Sprint:** P5-A  
**Format:** Tier 3 (Greenfield — kein vorhandener Stub, Use Case neu definiert)  
**Abhängigkeit:** Phase 4 ✅, FIX-06 ✅ (AES-256 Prefix), FIX-09 ✅ (positioningDocument encryption)  
**Anforderungen:** NEU Slice 29 (dieses Dokument, Abschnitt "Technische Empfehlungen"); ADR-003 (AES-256); resilience §3a/§3c  
**Geschätzte Dauer:** ~2 Tage (Sub-Slice A: 4–5h, Sub-Slice B: 4–5h, Sub-Slice C: 3h)

---

> **Pre-Condition (extern, vor Sprint-Start manuell erledigen):**
>
> **PFLICHT — Agent fragt beim Sprint-Start interaktiv nach:**
>
> 1. Odoo-Instanz mit **Custom Plan** (External API freigeschaltet) — bestätigt.
> 2. **Vanessa K.** (Odoo-Admin): API-Key erstellen unter Odoo → User Profile → Account Security → New API Key. URL, DB-Name, Username, API-Key notieren — in Coolify-Secrets hinterlegen, **nicht in `.env` committen**.
> 3. **Frage an Maintainer:** Welche Odoo-Version ist aktiv? Falls ≥ 18.4 → JSON-2-Transport in ADR-007 als sofortige Alternative festhalten.
> 4. **Frage an Maintainer / Bestätigung Vanessa K.:** Sind bereits `res.partner`-Einträge in Odoo vorhanden, die Vysible-Clients entsprechen? (Erwartet: Nein — Odoo wird neu eingeführt. Trotzdem bestätigen lassen.)
> 5. **Frage an Maintainer:** Soll bei Löschung eines Clients in Vysible der entsprechende `res.partner` in Odoo archiviert (`active: false`) oder gelöscht (`unlink`) werden? → Antwort dokumentieren; Umsetzung P5-B falls nicht P5-A.
> 6. Modul `contacts` oder `crm` in Odoo installiert? (Für `customer_rank`-Feld. Falls nicht: nur Base-Felder verwenden.)
> 7. Product Owner bestätigt schriftlich: MVP = **Client → `res.partner` Sync** — kein Rechnungswesen in Sub-Slice A/B.
>
> **Ohne Punkte 1, 2, 3 ist kein manueller Smoke-Test möglich — Sprint trotzdem ausführbar (Sub-Slice A + C), Sub-Slice B (Settings-UI) erfordert keine Live-Verbindung.**

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

```powershell
# Check A — Working Tree sauber
git status --porcelain

# Check B — TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Check C — Phase 4 abgeschlossen?
Select-String "Phase 4.*Abgeschlossen|P4-D.*✅" docs/roadmap.md -i

# Check D — FIX-09 abgeschlossen?
Select-String "FIX-09.*✅|FIX-09.*DONE" docs/dev-prompts/OpenActions.md -i

# Check E — Tests grün
pnpm test

# Check F — CHANGELOG [Unreleased] vorhanden
Select-String "\[Unreleased\]" CHANGELOG.md
```

Bei **Hard-FAIL (A, B oder E):** SOFORT STOP.  
Bei **6/6 PASS:** Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# Odoo — erwartet: nichts vorhanden
Get-ChildItem lib/odoo -Recurse -ErrorAction SilentlyContinue
Select-String "odoo|Odoo|ODOO" lib,app,prisma -Recurse -i

# Integrations-Muster studieren (WordPress = Referenz)
Get-Content lib/integrations/store.ts
Get-Content lib/wordpress/client.ts
Get-Content lib/klicktipp/client.ts

# Retry + Logger + bestehende Healthz-Route
Get-Content lib/utils/retry.ts
Get-Content lib/utils/logger.ts | Select-Object -First 40
Get-Content app/api/healthz/route.ts

# Bestehende Settings-Seiten als UI-Vorlage
Get-ChildItem app/(dashboard)/settings -Recurse -Name
Get-Content app/(dashboard)/settings/wordpress/page.tsx -ErrorAction SilentlyContinue

# Client-Modell — Sync-Ziel
Select-String "model Client" prisma/schema.prisma -A 20

# IntegrationProvider Enum — exakter Name und Typ prüfen
Select-String "IntegrationProvider|enum.*Provider" prisma/schema.prisma -A 5
Select-String "IntegrationProvider" lib/integrations/store.ts -A 3

# Cron/Scheduler — bestehender Scheduler?
Get-ChildItem lib/cron -Recurse -Name -ErrorAction SilentlyContinue
Select-String "scheduler|cron" lib -Recurse -i | Select-Object -First 10

# API-Routen-Muster
Get-ChildItem app/api/wordpress -Recurse -Name -ErrorAction SilentlyContinue
Get-Content app/api/wordpress/draft/route.ts -ErrorAction SilentlyContinue | Select-Object -First 40

# writeAuditLog — Signatur prüfen
Select-String "writeAuditLog" lib -Recurse | Select-Object -First 5

# forge-web-deviations — Odoo-relevante Abweichungen?
Select-String "odoo|wordpress|klicktipp|integration" docs/forge-web-deviations.md -i
```

**Bekannte Lücken (Stand 2026-06-21):**

| Datei | Lücke | Priorität |
|---|---|---|
| `lib/odoo/client.ts` | Fehlt — JSON-RPC Transport + Auth + Error-Klassen | MUSS |
| `lib/odoo/transport.ts` | Fehlt — `OdooTransport`-Interface für JSON-RPC + JSON-2 | MUSS |
| `lib/odoo/mappers.ts` | Fehlt — Client → `res.partner` Feldmapping | MUSS |
| `lib/odoo/types.ts` | Fehlt — `OdooCredentials`, `OdooConnectionResult`, Error-Klassen | MUSS |
| `lib/integrations/store.ts` | `ODOO` nicht in `IntegrationProvider` Prisma-Enum | MUSS |
| `prisma/schema.prisma` | `ClientIntegrationMapping`-Tabelle oder Config-JSON (NICHT direkt auf Client-Modell) | MUSS |
| `lib/odoo/sync.ts` | Fehlt — Bulk-Sync-Logik für alle Clients + täglicher Cron | MUSS |
| `app/api/odoo/test/route.ts` | Fehlt — Verbindungstest | MUSS |
| `app/api/odoo/sync-client/route.ts` | Fehlt — Client-Sync (manuell) | MUSS |
| `app/api/odoo/sync-all/route.ts` | Fehlt — Bulk-Sync trigger (Cron + manuell) | MUSS |
| `app/api/odoo/health/route.ts` | Fehlt — Health-Check Endpunkt | MUSS |
| `app/(dashboard)/settings/odoo/page.tsx` | Fehlt — Konfig-UI + Sync-Konfiguration | MUSS |
| `components/clients/OdooSyncButton.tsx` | Fehlt — Manueller Sync-Button auf Client-Detailseite | SOLL |
| `__tests__/unit/odoo/` | Fehlt — alle Unit-Tests | MUSS |
| `__tests__/integration/odoo-rpc.test.ts` | Fehlt — nock-Integration | MUSS |
| `scripts/smoke-odoo.ts` | Fehlt | SOLL |
| `docs/decisions.md` (ADR-007) | Fehlt — Odoo-Protokoll + Scope-Entscheidung | MUSS |

---

## CRITICAL: Self-Review Checklist (vor jedem Commit prüfen)

**Architektur & Korrektheit:**
- [ ] `withRetry` ist **NICHT** um `authenticate` gewrappt — nur um `executeKw`
- [ ] `authenticate` hat eigenes try/catch → wirft `OdooAuthError`
- [ ] `jsonRpcCall` verwendet `import { randomUUID } from 'crypto'` (nicht `crypto.randomUUID()`)
- [ ] `authenticate`-Aufruf: args = `[creds.db, creds.username, creds.apiKey, {}]` (4 Elemente, letztes `{}` ist Pflicht)
- [ ] `AbortController` mit 10s Timeout in `jsonRpcCall`
- [ ] `OdooTransport`-Interface vorhanden; `JsonRpcTransport` implementiert es

**Datensicherheit:**
- [ ] `encryptedKey` / rohe Credentials **nie** in API-Response oder Log
- [ ] API-Key in allen Log-Statements maskiert: `apiKey: '***'`
- [ ] PII (E-Mail, Name) nicht in Logs — nur `clientId`, `odooPartnerId`

**Resilienz:**
- [ ] Kein stiller Catch — `logger.warn` / `logger.error` + re-throw oder strukturiertes Return
- [ ] Kein `rejectUnauthorized: false` hardcoded
- [ ] Upsert: `search_read` mit `limit: 2`; bei >1 Treffer ERROR ohne Write
- [ ] Partial-Write: bei Odoo-Create-Erfolg aber lokalem DB-Fehler → idempotenter Retry möglich (via `ref`-Lookup)

**Auth & Mandantentrennung:**
- [ ] Auth-Check in jeder API-Route (`getServerSession`)
- [ ] Client/Project nur mit `createdById` des Session-Users

**Schema:**
- [ ] `odooPartnerId` in `ClientIntegrationMapping`-Tabelle oder `IntegrationConfig`-JSON — **NICHT** auf `Client`-Modell
- [ ] Prisma-Migration nach `IntegrationProvider`-Enum-Änderung: `prisma migrate dev --name add_odoo_integration_provider`

**Sync-Trigger:**
- [ ] Manueller Trigger via Button funktioniert
- [ ] Täglicher Cron-Job (Standard 02:00 UTC) konfiguriert und in Settings parametrierbar
- [ ] Sync-Intervall in Settings speicherbar und ladbar

**Observability:**
- [ ] `writeAuditLog(clientId, 'odoo_sync', { action: 'created'|'updated', odooPartnerId })` bei jedem Sync
- [ ] `/api/odoo/health` → `{ ok, version, latencyMs }` — rate-limited (1 req/min)
- [ ] Fehlerklassen differenziert: `OdooAuthError | OdooNetworkError | OdooValidationError | OdooAccessError`

**Tests & Dokumentation:**
- [ ] Sub-Slice C (Tests) ist MUSS — kein Merge ohne Tests
- [ ] `pnpm test` grün (alle 63 bestehenden + neue Odoo-Tests)
- [ ] TypeScript strict: 0 Fehler
- [ ] ADR-007 in `docs/decisions.md` committed (vor erstem Merge)
- [ ] CHANGELOG im jeweiligen Commit aktualisiert
- [ ] `.env.example` mit Odoo-Platzhalter-Kommentaren ergänzt

---

## Sub-Slice A — Odoo Client + Mapper + Schema + Error-Klassen

**Aufwand:** ~4–5 Stunden  
**Scope:** JSON-RPC-Transport-Interface + Client, Error-Klassen, Client→Partner-Mapper, IntegrationProvider-Erweiterung, Schema.

### IN

```
lib/odoo/types.ts               NEU — Credentials, Connection-Result, Error-Klassen
lib/odoo/transport.ts           NEU — OdooTransport-Interface + JsonRpcTransport
lib/odoo/client.ts              NEU — authenticate(), executeKw(), testOdooConnection(), upsertPartner()
lib/odoo/mappers.ts             NEU — clientToPartnerValues()
lib/odoo/sync.ts                NEU — syncClient(), syncAllClients()
lib/integrations/store.ts       CHANGE — 'ODOO' zu IntegrationProvider Prisma-Enum hinzufügen
prisma/schema.prisma            CHANGE — ClientIntegrationMapping-Tabelle (oder Config-JSON-Feld)
                                         + Prisma-Migration
docs/decisions.md               CHANGE — ADR-007 (Odoo-Protokoll + Scope)
```

### Code-Patterns

```typescript
// lib/odoo/types.ts

export interface OdooCredentials {
  url: string       // https://myagency.odoo.com
  db: string        // Datenbankname
  username: string
  apiKey: string    // ersetzt Passwort (Odoo 14+)
}

export interface OdooConnectionResult {
  ok: boolean
  uid?: number
  version?: string
  latencyMs?: number
  error?: string
}

export interface OdooSyncResult {
  ok: boolean
  odooPartnerId?: number
  action?: 'created' | 'updated'
  error?: 'duplicate_ref' | 'auth_error' | 'network_error' | 'validation_error' | string
}

// Fehlerklassen — nur OdooNetworkError ist retry-eligible
export class OdooAuthError extends Error {
  constructor(message: string) { super(message); this.name = 'OdooAuthError' }
}
export class OdooNetworkError extends Error {
  constructor(message: string) { super(message); this.name = 'OdooNetworkError' }
}
export class OdooValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'OdooValidationError' }
}
export class OdooAccessError extends Error {
  constructor(message: string) { super(message); this.name = 'OdooAccessError' }
}
```

```typescript
// lib/odoo/transport.ts

import { randomUUID } from 'crypto'
import { logger } from '@/lib/utils/logger'
import { OdooAuthError, OdooNetworkError, OdooValidationError, OdooAccessError } from './types'

export interface OdooTransport {
  call<T>(url: string, service: string, method: string, args: unknown[]): Promise<T>
}

// Odoo-Error-Payload parsen und in typisierte Error-Klassen umwandeln
function parseOdooError(errorData: unknown): Error {
  const data = errorData as { message?: string; data?: { name?: string } }
  const name = data?.data?.name ?? ''
  const msg = data?.message ?? 'Unknown Odoo error'
  if (name.includes('AccessDenied') || name.includes('authentication')) return new OdooAuthError(msg)
  if (name.includes('AccessError')) return new OdooAccessError(msg)
  if (name.includes('ValidationError') || name.includes('UserError')) return new OdooValidationError(msg)
  return new OdooNetworkError(msg)
}

export class JsonRpcTransport implements OdooTransport {
  async call<T>(url: string, service: string, method: string, args: unknown[]): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000) // 10s Timeout

    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: { service, method, args },
          id: randomUUID(),
        }),
      })
      clearTimeout(timeout)

      if (!res.ok) throw new OdooNetworkError(`Odoo HTTP ${res.status}`)

      const body = await res.json() as { error?: unknown; result?: T }
      if (body.error) throw parseOdooError(body.error)
      return body.result as T

    } catch (err) {
      clearTimeout(timeout)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new OdooNetworkError('Odoo request timed out after 10s')
      }
      throw err
    }
  }
}
```

```typescript
// lib/odoo/client.ts

import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import { JsonRpcTransport } from './transport'
import type { OdooCredentials, OdooConnectionResult, OdooSyncResult } from './types'
import { OdooAuthError } from './types'

const transport = new JsonRpcTransport()

// authenticate — KEIN withRetry — Auth-Fehler sind permanent
export async function authenticate(creds: OdooCredentials): Promise<number> {
  try {
    // Pflicht: 4 Argumente inkl. leerem Options-Objekt
    const uid = await transport.call<number>(
      creds.url, 'common', 'authenticate',
      [creds.db, creds.username, creds.apiKey, {}],
    )
    if (!uid) throw new OdooAuthError('Odoo authentication failed — check db/username/apiKey')
    return uid
  } catch (err) {
    if (err instanceof OdooAuthError) throw err
    throw new OdooAuthError(`Authentication failed: ${(err as Error).message}`)
  }
}

// executeKw — withRetry NUR hier, nur für OdooNetworkError
export async function executeKw<T>(
  creds: OdooCredentials,
  uid: number,
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
): Promise<T> {
  return withRetry(
    () => transport.call<T>(
      creds.url, 'object', 'execute_kw',
      [creds.db, uid, creds.apiKey, model, method, args, kwargs],
    ),
    `odoo.${model}.${method}`,
  )
}

// testOdooConnection — kombiniert version() + authenticate()
export async function testOdooConnection(creds: OdooCredentials): Promise<OdooConnectionResult> {
  const start = Date.now()
  try {
    const info = await transport.call<{ server_version: string }>(
      creds.url, 'common', 'version', []
    )
    const version = info.server_version
    if (!version.startsWith('18') && !version.startsWith('19')) {
      logger.warn({ version }, 'Odoo version <18 detected; behavior may differ')
    }
    const uid = await authenticate(creds)
    return { ok: true, uid, version, latencyMs: Date.now() - start }
  } catch (err) {
    logger.error({ error: (err as Error).message }, 'Odoo connection test failed')
    return { ok: false, error: (err as Error).message }
  }
}

// upsertPartner — idempotentes Create-oder-Update via ref
export async function upsertPartner(
  creds: OdooCredentials,
  uid: number,
  clientId: string,
  values: Record<string, unknown>,
): Promise<OdooSyncResult> {
  const ref = `vysible:${clientId}`

  const existing = await executeKw<Array<{ id: number }>>(
    creds, uid, 'res.partner', 'search_read',
    [[['ref', '=', ref]]],
    { fields: ['id', 'name', 'ref'], limit: 2 },
  )

  if (existing.length > 1) {
    logger.error({ clientId, count: existing.length, ref }, 'odoo duplicate_ref — no write performed')
    return { ok: false, error: 'duplicate_ref' }
  }

  if (existing.length === 0) {
    const odooPartnerId = await executeKw<number>(
      creds, uid, 'res.partner', 'create',
      [{ ...values, ref }],
    )
    logger.info({ clientId, odooPartnerId }, 'odoo partner created')
    return { ok: true, odooPartnerId, action: 'created' }
  }

  const odooPartnerId = existing[0].id
  await executeKw(creds, uid, 'res.partner', 'write', [[odooPartnerId], values])
  logger.info({ clientId, odooPartnerId }, 'odoo partner updated')
  return { ok: true, odooPartnerId, action: 'updated' }
}
```

```typescript
// lib/odoo/mappers.ts
import type { Client } from '@prisma/client'

export function clientToPartnerValues(client: Client): Record<string, unknown> {
  return {
    name: client.name,
    // ref wird in upsertPartner gesetzt
    company_type: 'company' as const,
    customer_rank: 1,
    // Erweiterbar: email, phone, website nach Modul-Check
  }
}
```

```typescript
// lib/odoo/sync.ts
//
// EXPLORATION PFLICHT vor Implementierung:
//   1. Wie lädt lib/integrations/store.ts Credentials? (loadIntegration? getApiKey? decrypt?)
//      → Signatur ermitteln, loadOdooCredentials() entsprechend implementieren
//   2. Wie ist writeAuditLog signiert?
//      → Signatur ermitteln, Aufrufe unten anpassen
//   3. Existiert lib/cron/scheduler.ts? Wie werden Cron-Jobs registriert?
//      → scheduleDailyOdooSync() entsprechend einbinden
//
import { authenticate, upsertPartner } from './client'
import { clientToPartnerValues } from './mappers'
import { logger } from '@/lib/utils/logger'
import type { OdooCredentials } from './types'
import type { Client } from '@prisma/client'
// EXPLORATION: echte Importe nach Exploration-Schritt eintragen:
// import { loadIntegration, decryptCredentials } from '@/lib/integrations/store'
// import { writeAuditLog } from '@/lib/audit/log'
// import { prisma } from '@/lib/prisma'

// loadOdooCredentials — Credentials aus verschlüsseltem Store laden
// AGENT: Signatur und Implementierung nach Exploration von lib/integrations/store.ts anpassen
export async function loadOdooCredentials(): Promise<OdooCredentials | null> {
  // Pattern-Vorlage (nach WordPress/KlickTipp-Pattern):
  // const integration = await loadIntegration('ODOO')
  // if (!integration) return null
  // const { url, db, username, apiKey } = decryptCredentials(integration.encryptedData)
  // return { url, db, username, apiKey }
  throw new Error('loadOdooCredentials: Implementation nach Exploration von lib/integrations/store.ts ergänzen')
}

export async function syncClient(
  creds: OdooCredentials,
  client: Client,
): Promise<{ ok: boolean; odooPartnerId?: number; action?: string; error?: string }> {
  const uid = await authenticate(creds)
  const values = clientToPartnerValues(client)
  const result = await upsertPartner(creds, uid, client.id, values)

  if (result.ok && result.odooPartnerId) {
    // AGENT: writeAuditLog-Signatur nach Exploration anpassen
    // await writeAuditLog(client.id, 'odoo_sync', { action: result.action, odooPartnerId: result.odooPartnerId })
    logger.info({ clientId: client.id, odooPartnerId: result.odooPartnerId, action: result.action }, 'odoo_sync audit')
  }

  return result
}

export async function syncAllClients(
  creds: OdooCredentials,
  clients: Client[],
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const uid = await authenticate(creds)
  let synced = 0
  let failed = 0
  const errors: string[] = []

  // Sequential — kein Burst, kein Rate-Limit-Risiko
  for (const client of clients) {
    try {
      const values = clientToPartnerValues(client)
      const result = await upsertPartner(creds, uid, client.id, values)
      if (result.ok) {
        synced++
        if (result.odooPartnerId) {
          // AGENT: writeAuditLog-Signatur nach Exploration anpassen
          logger.info({ clientId: client.id, odooPartnerId: result.odooPartnerId, action: result.action }, 'odoo_sync audit')
        }
      } else {
        failed++
        errors.push(`${client.id}: ${result.error}`)
        logger.warn({ clientId: client.id, error: result.error }, 'odoo sync skipped')
      }
    } catch (err) {
      failed++
      errors.push(`${client.id}: ${(err as Error).message}`)
      logger.error({ clientId: client.id, error: (err as Error).message }, 'odoo sync error')
    }
  }

  logger.info({ synced, failed }, 'odoo bulk sync complete')
  return { synced, failed, errors }
}

// runScheduledSync — wird vom Cron-Handler aufgerufen
// AGENT: Cron-Registrierung nach Exploration von lib/cron/scheduler.ts einbinden
export async function runScheduledSync(): Promise<void> {
  const creds = await loadOdooCredentials()
  if (!creds) {
    logger.warn('odoo scheduled sync skipped — no credentials configured')
    return
  }
  // AGENT: prisma.client.findMany() nach Schema-Exploration anpassen
  // const clients = await prisma.client.findMany({ where: { deletedAt: null } })
  // const result = await syncAllClients(creds, clients)
  // logger.info({ result }, 'odoo scheduled sync complete')
  throw new Error('runScheduledSync: prisma.client.findMany und syncAllClients nach Exploration verdrahten')
}
```

### ADR-007 (in `docs/decisions.md` eintragen)

```markdown
## ADR-007 — Odoo External API Integration

**Datum:** 2026-06-21  
**Status:** Accepted  
**Kontext:** Vysible benötigt eine Verbindung zu Odoo für CRM-Sync (Client → res.partner).  
**Entscheidung:**  
- Protokoll: JSON-RPC (`/jsonrpc`) für Odoo 18; Transport-Interface für JSON-2-Migration vorbereitet
- Auth: API Key (nicht Passwort); Credentials AES-256 verschlüsselt via ApiKey-Provider
- Scope MVP: Vysible Client → Odoo res.partner (Upsert via ref='vysible:{clientId}')
- `withRetry` ausschließlich auf `executeKw`, niemals auf `authenticate`
- Täglicher automatischer Sync (02:00 UTC, konfigurierbar) + manueller Trigger
- `odooPartnerId` in ClientIntegrationMapping, nicht auf Client-Modell
**Konsequenzen:** Migration auf JSON-2 vor Online 21.1 (Winter 2027) erforderlich.
```

### Acceptance Checklist Sub-Slice A

- [ ] `testOdooConnection()` gibt `{ ok: true, version, uid, latencyMs }` gegen echte Instanz zurück
- [ ] `authenticate()` wirft `OdooAuthError` bei falschem API-Key — kein Retry
- [ ] `executeKw('res.partner', 'search_read', ...)` gibt Array zurück
- [ ] `authenticate`-args hat 4 Elemente: `[db, username, apiKey, {}]`
- [ ] `AbortController` mit 10s Timeout aktiv in `JsonRpcTransport`
- [ ] `randomUUID` aus `'crypto'` importiert, nicht `crypto.randomUUID()`
- [ ] `IntegrationProvider` Prisma-Enum enthält `'ODOO'`
- [ ] `prisma migrate dev --name add_odoo_integration_provider` ausgeführt
- [ ] Schema für `odooPartnerId` in `ClientIntegrationMapping` oder Config-JSON, NICHT auf `Client`
- [ ] TypeScript: 0 Fehler
- [ ] Mapper-Output: `ref`-Format `vysible:{clientId}` nicht im Mapper (wird in `upsertPartner` gesetzt)
- [ ] ADR-007 in `docs/decisions.md` committed

### Commit-Message

```
feat(odoo): JSON-RPC transport + client + mappers + error classes (Slice 29 Sub-A)
```

---

## Sub-Slice B — API-Routen + Settings-UI + Health-Endpunkt + Sync-Scheduler

**Aufwand:** ~4–5 Stunden  
**Scope:** Connection-Test-Endpunkt, Client-Sync-Endpunkt, Bulk-Sync-Endpunkt, Health-Endpunkt, Cron-Konfiguration, Settings-Seite, optionaler Sync-Button auf Client-Detailseite.

### IN

```
app/api/odoo/test/route.ts           NEU — POST Connection Test
app/api/odoo/sync-client/route.ts    NEU — POST { clientId } manueller Sync
app/api/odoo/sync-all/route.ts       NEU — POST Bulk-Sync (Cron + manuell)
app/api/odoo/health/route.ts         NEU — GET Health-Check (rate-limited via In-Memory-Map)
app/(dashboard)/settings/odoo/page.tsx  NEU — Konfig-UI + Sync-Settings
app/(dashboard)/settings/layout.tsx  CHANGE — Nav-Link für Odoo ergänzen
components/clients/OdooSyncButton.tsx  NEU — manueller Sync-Button (SOLL)
lib/odoo/scheduler.ts               NEU — Cron-Setup für täglichen Sync
```

### Cron-Deployment-Klärung (PFLICHT vor Implementierung)

> **AGENT: Vor Sub-Slice-B-Implementierung prüfen und eine der drei Optionen wählen:**

| Option | Wann wählen | Implementierung |
|---|---|---|
| **A: Next.js Route Handler + Coolify Cron** | Coolify unterstützt Cron-Jobs (Cron-Task in Coolify-Config) | `POST /api/odoo/sync-all` mit `CRON_SECRET`-Header-Guard; Coolify feuert täglich |
| **B: Vercel Cron / Edge Cron** | Deployment auf Vercel | `vercel.json` mit `crons` + Route Handler |
| **C: Bestehender `lib/cron/scheduler.ts`** | Existiert bereits in Codebase (Exploration prüfen) | `runScheduledSync()` in bestehendem Scheduler registrieren |

**Exploration-Check:**
```powershell
# Welche Cron-Option ist aktiv?
Get-ChildItem lib/cron -Recurse -ErrorAction SilentlyContinue
Get-Content vercel.json -ErrorAction SilentlyContinue | Select-String "cron"
Select-String "CRON_SECRET|cron" app/api -Recurse -i | Select-Object -First 10
```

**Empfehlung (Coolify-Kontext):** Option A — `CRON_SECRET` als Coolify-Secret, Coolify feuert `POST /api/odoo/sync-all` täglich um 02:00 UTC mit Header `Authorization: Bearer {CRON_SECRET}`.

### Rate-Limiting Pattern für `/api/odoo/health`

```typescript
// app/api/odoo/health/route.ts
// Rate-Limit: In-Memory-Map (Next.js Edge/Node — kein Redis erforderlich für MVP)
// 1 Request/Minute pro IP

const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 60_000

export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const last = rateLimitMap.get(ip) ?? 0
  if (Date.now() - last < RATE_LIMIT_MS) {
    return Response.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }
  rateLimitMap.set(ip, Date.now())

  // AGENT: loadOdooCredentials() nach Exploration verdrahten
  // const creds = await loadOdooCredentials()
  // if (!creds) return Response.json({ ok: false, error: 'not_configured' }, { status: 503 })
  // const result = await testOdooConnection(creds)
  // return Response.json(result, { status: result.ok ? 200 : 503 })
  return Response.json({ ok: true, version: 'not_yet_configured', latencyMs: 0 })
}
```

> **Hinweis:** In-Memory-Rate-Limit wird bei Server-Restart zurückgesetzt — für MVP ausreichend. Für Produktion mit hoher Last: `next-rate-limit` oder Redis.

### API-Signaturen

```typescript
// POST /api/odoo/test
// Body: { url: string, db: string, username: string, apiKey: string }
// Nur für Connection-Test — speichert NICHT automatisch
// Response: { ok: true, version: string, uid: number, latencyMs: number }
//         | { ok: false, error: string }

// POST /api/odoo/sync-client
// Body: { clientId: string }
// Erfordert: Session + Client gehört zu Session-User
// Response: { ok: true, odooPartnerId: number, action: 'created'|'updated' }
//         | { ok: false, error: string }

// POST /api/odoo/sync-all
// Body: {} (leer) oder { force: boolean }
// Erfordert: Session + Admin-Rolle oder Cron-Secret-Header
// Response: { ok: true, synced: number, failed: number, errors: string[] }

// GET /api/odoo/health
// Rate-limit: 1 req/min pro IP
// Keine Auth erforderlich (Health-Check für Coolify)
// Response: { ok: true, version: string, latencyMs: number }
//         | { ok: false, error: string }
```

### Settings-UI Spec

**Felder:**
- URL (Pflicht): `https://myagency.odoo.com`
- Datenbankname (Pflicht): z.B. `myagency`
- Benutzername (Pflicht): Odoo-Login-E-Mail
- API-Key (Pflicht): Feld verdeckt (type=password)
- "Verbindung testen"-Button → zeigt `[OK] Verbunden (Odoo {version})` oder `[FAIL] {error}`
- Speichern-Button → speichert AES-256-verschlüsselt via `saveIntegration`

**Sync-Konfiguration (Settings-Abschnitt):**
- Automatischer Sync: Toggle (Standard: aktiviert)
- Sync-Uhrzeit: Dropdown oder Zeitfeld (Standard: 02:00 UTC)
- Sync-Intervall: täglich / wöchentlich (Standard: täglich)
- "Jetzt alle Clients synchronisieren"-Button → ruft `POST /api/odoo/sync-all` auf
- Letzter Sync: Timestamp aus Audit-Log

### OdooSyncButton-Spec

```typescript
// components/clients/OdooSyncButton.tsx
// Props: { clientId: string }
// Verhalten:
//   - Klick → POST /api/odoo/sync-client { clientId }
//   - Während Request: Spinner, Button disabled
//   - Erfolg: Toast "[OK] In Odoo synchronisiert (Partner #{id})"
//   - Fehler: Toast "[FAIL] {error}" — kein Stack-Trace an Client
//   - Berechtigungsprüfung: Button nur rendern wenn Odoo-Integration konfiguriert
```

### Acceptance Checklist Sub-Slice B

- [ ] Settings-Seite: URL, DB, Username, API-Key-Felder + "Verbindung testen"
- [ ] Erfolgreicher Test → `[OK] Verbunden (Odoo {version})`
- [ ] Fehlgeschlagener Test → `[FAIL]` mit Fehlermeldung, kein Stack-Trace an Client
- [ ] Credentials AES-256 gespeichert — kein Klartext in DB
- [ ] Sync erstellt neuen `res.partner` wenn ref nicht gefunden
- [ ] Sync aktualisiert Partner wenn ref gefunden
- [ ] Sync gibt ERROR zurück bei >1 Partner mit gleichem ref — kein Write
- [ ] API-Key in Connection-Test-Log maskiert: `apiKey: '***'`
- [ ] Unauthorized → HTTP 401
- [ ] Client gehört anderem User → HTTP 403
- [ ] `/api/odoo/health` antwortet `{ ok, version, latencyMs }` — rate-limited
- [ ] Täglicher Cron konfiguriert (Standard 02:00 UTC)
- [ ] Sync-Zeitkonfiguration in Settings speicher- und ladbar
- [ ] Manueller Bulk-Sync-Button in Settings funktioniert

### Commit-Message

```
feat(odoo): settings UI + API routes + health endpoint + sync scheduler (Slice 29 Sub-B)
```

---

## Sub-Slice C — Tests + Smoke-Script (MUSS — kein Merge ohne)

**Aufwand:** ~3 Stunden  
**Scope:** Unit-Tests, nock-Integration-Tests, CLI-Smoke-Script.

> **Sub-Slice C ist kein optionaler Bonus.** Kein Merge von Sub-Slice A oder B ohne grüne Tests.

### IN

```
__tests__/unit/odoo/client.test.ts       NEU
__tests__/unit/odoo/mappers.test.ts      NEU
__tests__/unit/odoo/transport.test.ts    NEU
__tests__/integration/odoo-rpc.test.ts   NEU — nock JSON-RPC
scripts/smoke-odoo.ts                    NEU
```

### Kritische Test-Cases

```typescript
// __tests__/unit/odoo/client.test.ts — kritische Fälle

// 1. Auth-Fehler löst KEINEN Retry aus
test('authenticate throws OdooAuthError without retry', async () => {
  // nock: POST /jsonrpc → { error: { message: 'Access Denied', data: { name: 'odoo.exceptions.AccessDenied' } } }
  // Erwartung: OdooAuthError geworfen, withRetry nicht aufgerufen
})

// 2. Network-Error löst Retry aus
test('executeKw retries on OdooNetworkError', async () => {
  // nock: erste zwei Requests → HTTP 503, dritter → Erfolg
  // Erwartung: Erfolg nach 3 Versuchen
})

// 3. Duplikat-Upsert-Fall
test('upsertPartner returns error on duplicate ref', async () => {
  // nock: search_read → Array mit 2 Elementen
  // Erwartung: { ok: false, error: 'duplicate_ref' } — kein Write-Call
})

// 4. Timeout
test('jsonRpcCall throws OdooNetworkError on timeout', async () => {
  // nock: delay(15000) → AbortController greift nach 10s
  // Erwartung: OdooNetworkError 'timed out'
})

// 5. authenticate-Signatur: 4 Argumente
test('authenticate sends 4 args including empty options object', async () => {
  // Interceptor prüft body.params.args.length === 4 && body.params.args[3] === {}
})
```

### Smoke-Script

```typescript
// scripts/smoke-odoo.ts
// Pre-Conditions: ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY in .env (NICHT committen)
// Ausführen: pnpm smoke:odoo  (in package.json als Script hinterlegen)
// Zweck: Manuelle Verifikation nach Deployment mit echten Credentials

import { testOdooConnection, upsertPartner } from '@/lib/odoo/client'
import type { OdooCredentials } from '@/lib/odoo/types'

const creds: OdooCredentials = {
  url: process.env.ODOO_URL!,
  db: process.env.ODOO_DB!,
  username: process.env.ODOO_USERNAME!,
  apiKey: process.env.ODOO_API_KEY!,
}

async function main() {
  console.log('[START] Odoo smoke test')

  const conn = await testOdooConnection(creds)
  if (!conn.ok) {
    console.error('[FAIL] Connection:', conn.error)
    process.exit(1)
  }
  console.log(`[OK] Connected — Odoo ${conn.version}, uid=${conn.uid}, latency=${conn.latencyMs}ms`)

  // Smoke-Upsert mit Test-Client-ID
  const result = await upsertPartner(creds, conn.uid!, 'smoke-test-999', {
    name: 'Smoke Test Partner',
    company_type: 'company',
    customer_rank: 1,
  })
  if (!result.ok) {
    console.error('[FAIL] Upsert:', result.error)
    process.exit(1)
  }
  console.log(`[OK] Upsert — action=${result.action}, odooPartnerId=${result.odooPartnerId}`)
  console.log('[DONE] Smoke test passed')
}

main().catch((e) => { console.error('[FAIL]', e); process.exit(1) })
```

### Acceptance Checklist Sub-Slice C

- [ ] Unit-Tests: Auth-Fehler wirft `OdooAuthError` ohne Retry
- [ ] Unit-Tests: `executeKw` führt Retry bei `OdooNetworkError` durch
- [ ] Unit-Tests: Duplikat-ref → `{ ok: false, error: 'duplicate_ref' }`, kein Write-Call
- [ ] Unit-Tests: Timeout → `OdooNetworkError 'timed out after 10s'`
- [ ] Unit-Tests: `authenticate` sendet 4 args inkl. `{}`
- [ ] Mapper-Test: `clientToPartnerValues` gibt korrektes Objekt zurück (ohne `ref`)
- [ ] Integration-Test: nock mockt vollständigen JSON-RPC-Flow (auth + search_read + create)
- [ ] Integration-Test: nock mockt `{ error: { message: 'Access Denied' } }` → `OdooAuthError`
- [ ] `scripts/smoke-odoo.ts` dokumentiert erforderliche ENV-Vars im Header
- [ ] `pnpm test` — alle bestehenden 63 + neue Odoo-Tests grün

### Commit-Message

```
test(odoo): unit + integration tests + smoke script (Slice 29 Sub-C)
```

---

## Abschluss-Validation (nach allen Sub-Slices)

### Schritt 1 — Automatische Validierung (immer ausführen)

```powershell
# TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Tests (alle Unit + Integration mit nock)
pnpm test

# Lint
pnpm lint

# Keine Odoo-Credentials im Code
Select-String "apiKey.*=.*['\"][a-zA-Z0-9]" lib/odoo,app/api/odoo -Recurse
Select-String "ODOO_API_KEY" lib,app -Recurse -i

# Health-Endpunkt lokal prüfen (Basis-Response ohne Live-Odoo)
curl -s http://localhost:3000/api/odoo/health
```

### Schritt 2 — Live-Odoo-Acceptance-Test (PFLICHT für Sprint-Closeout)

> **Kein Sprint P5-A ist abgeschlossen ohne bestandenen Live-Acceptance-Test.**  
> Diese Tests erfordern echte Odoo-Credentials von Vanessa K. in lokaler `.env` (NICHT committen).

```powershell
# ENV laden (lokal, nicht committen)
# ODOO_URL=https://... ODOO_DB=... ODOO_USERNAME=... ODOO_API_KEY=... in .env.local

# Test 1: Basis-Verbindung
pnpm smoke:odoo
# Erwartung: [OK] Connected + [OK] Upsert

# Test 2: Connection-Test-Endpunkt (Webserver lokal starten)
pnpm dev &
curl -s -X POST http://localhost:3000/api/odoo/test \
  -H "Content-Type: application/json" \
  -d '{"url":"${ODOO_URL}","db":"${ODOO_DB}","username":"${ODOO_USERNAME}","apiKey":"${ODOO_API_KEY}"}' \
  | jq '.ok'
# Erwartung: true

# Test 3: Einzelner Client-Sync (clientId aus DB)
curl -s -X POST http://localhost:3000/api/odoo/sync-client \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"clientId":"<echter-client-id>"}' \
  | jq '{ok,action,odooPartnerId}'
# Erwartung: {ok:true, action:"created"|"updated", odooPartnerId:<number>}

# Test 4: Idempotenz — gleicher Client nochmal (muss "updated" sein)
# Gleicher curl wie Test 3 nochmal ausführen
# Erwartung: action:"updated", gleiche odooPartnerId

# Test 5: Health-Endpunkt mit Live-Credentials
curl -s http://localhost:3000/api/odoo/health | jq '.ok'
# Erwartung: true

# Test 6: Odoo-UI-Verifikation (manuell)
# → Odoo öffnen → Kontakte → nach "vysible:" in ref-Feld suchen
# → Testpartner aus Smoke-Test und Client-Sync-Test sichtbar
```

**Acceptance-Gate für Sprint-Closeout:**

| Live-Test | Ergebnis | Prüfer |
|---|---|---|
| `pnpm smoke:odoo` | [ ] OK / [ ] FAIL | Agent |
| Connection-Test-API | [ ] OK / [ ] FAIL | Agent |
| Client-Sync create | [ ] OK / [ ] FAIL | Agent |
| Idempotenz (2. Sync = updated) | [ ] OK / [ ] FAIL | Agent |
| Health-Endpunkt | [ ] OK / [ ] FAIL | Agent |
| Odoo-UI-Verifikation | [ ] OK / [ ] FAIL | Maintainer (Vanessa K. oder Entwickler) |

**Bei FAIL in einem der Tests:** STOP — Bug fixen, alle Live-Tests wiederholen. Kein Merge bis alle grün.

---

## Scope-Grenzen (was NICHT in diesem Sprint)

| Feature | Warum nicht jetzt |
|---|---|
| CostEntry → analytic line (Concept B) | Separater Sprint P5-B nach CRM-Validierung |
| Bidirektionaler Sync (Odoo → Vysible) | Komplexität; kein MVP |
| Rechnungserstellung (`account.move`) | Erfordert Buchhaltungsmodul-Setup + rechtliche Prüfung |
| JSON-2-Transport (aktiv nutzen) | Warten bis Instanz-Version ≥ 18.4 bestätigt; Interface vorbereitet |
| XML-RPC-Transport | Deprecated-Pfad; JSON-RPC ausreichend |
| DSGVO `unlink` bei Client-Löschung | P5-A: TODO-Kommentar; MUSS in P5-B — abhängig von Vanessa K.s Antwort |
| Webhook-Eingang (Odoo → Vysible) | Für Concept B (Invoice-Status); nicht MVP |
| Custom Odoo-Modul (`x_vysible_*`) | Standard-Felder + `ref` ausreichend für MVP |
| Per-Projekt Odoo-Credentials | Single-Tenant: eine Agentur-Odoo-Instanz |

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P5-A ABSCHLUSSBERICHT
Datum: ____
Ergebnis: [OK|FAIL]

Sub-Slice A: [OK|FAIL] — Client + Transport + Mapper + Error-Klassen + Schema
Sub-Slice B: [OK|FAIL] — API-Routen + Health + Settings-UI + Sync-Scheduler (Cron-Option: A/B/C)
Sub-Slice C: [OK|FAIL] — Tests + Smoke-Script

pnpm test: __/pass
TypeScript: 0 Fehler [OK|FAIL]

LIVE-ACCEPTANCE-TESTS (Pflicht für Closeout):
Smoke-Script pnpm smoke:odoo:      [OK|FAIL]
Connection-Test-API:               [OK|FAIL]
Client-Sync create:                [OK|FAIL]
Idempotenz (2. Sync = updated):    [OK|FAIL]
Health-Endpunkt:                   [OK|FAIL]
Odoo-UI-Verifikation (Maintainer): [OK|FAIL]

[OK] P5-A ABGESCHLOSSEN — alle 6 Live-Tests grün
▶ ADR-007 in docs/decisions.md committed ✅
▶ Cron-Option (A/B/C) in ADR-007 dokumentiert ✅
▶ CHANGELOG.md Eintrag: feat: Odoo CRM Connector (Slice 29) ✅
▶ .env.example ergänzt mit ODOO_*-Platzhaltern ✅
▶ OpenActions.md: Odoo-Validierungs-Eintrag (analog KlickTipp) ✅
▶ Nächste Priorität: Sprint P5-B (Odoo Cost Export — Concept B) ODER FIX-07
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p5a-odoo.md docs/dev-prompts/archive/
```

---

## Go/No-Go Checkliste (gesamt)

**PRE-Conditions:**
- [ ] **[PRE-01]** Odoo-Instanz URL + DB-Name + API-Key von Vanessa K. erstellt und in Coolify-Secrets hinterlegt
- [ ] **[PRE-02]** Custom Plan verifiziert: `GET https://{instance}/web/database/list` → 200
- [ ] **[PRE-03]** Odoo-Version geprüft; falls ≥ 18.4: JSON-2-Option in ADR-007 bewertet
- [ ] **[PRE-04]** Bestätigung: Keine Bestandsdaten in `res.partner` (Odoo neu eingeführt)
- [ ] **[PRE-05]** DSGVO-Frage (Löschkonzept) von Vanessa K. / Product Owner beantwortet
- [ ] **[PRE-06]** Modul-Check: `contacts`/`crm` installiert oder Base-Felder als Fallback festgelegt
- [ ] **[PRE-07]** Product Owner bestätigt schriftlich: MVP = Client → res.partner (kein Rechnungswesen)
- [ ] **[PRE-08]** FIX-09 abgeschlossen

**Code:**
- [ ] **[CODE-01]** `withRetry` ausschließlich auf `executeKw`, nicht auf `authenticate`
- [ ] **[CODE-02]** `OdooTransport`-Interface + `JsonRpcTransport` implementiert
- [ ] **[CODE-03]** Alle 4 Error-Klassen vorhanden; nur `OdooNetworkError` ist retry-eligible
- [ ] **[CODE-04]** `AbortController` 10s Timeout in `JsonRpcTransport`
- [ ] **[CODE-05]** `randomUUID` via `import { randomUUID } from 'crypto'`
- [ ] **[CODE-06]** `authenticate`-args: 4 Elemente inkl. `{}`
- [ ] **[CODE-07]** Upsert: `limit: 2`; bei >1 Treffer ERROR ohne Write
- [ ] **[CODE-08]** API-Key in allen Logs maskiert
- [ ] **[CODE-09]** `odooPartnerId` in Mapping-Tabelle/Config, NICHT auf `Client`-Modell
- [ ] **[CODE-10]** Prisma-Migration ausgeführt: `add_odoo_integration_provider`
- [ ] **[CODE-11]** `writeAuditLog` bei jedem Sync-Event
- [ ] **[CODE-12]** Täglicher Cron (02:00 UTC default) + manueller Trigger implementiert
- [ ] **[CODE-13]** `GET /api/odoo/health` rate-limited implementiert

**Tests:**
- [ ] **[TEST-01]** Sub-Slice C vollständig — kein Merge ohne Tests
- [ ] **[TEST-02]** Auth-Error-Test: kein Retry
- [ ] **[TEST-03]** Duplikat-ref-Test: kein Write
- [ ] **[TEST-04]** Timeout-Test: `OdooNetworkError`
- [ ] **[TEST-05]** authenticate-Signatur-Test: 4 args
- [ ] **[TEST-06]** `pnpm test` grün — alle 63+ Tests
- [ ] **[LIVE-01]** `pnpm smoke:odoo` grün gegen echte Odoo-Instanz (PFLICHT)
- [ ] **[LIVE-02]** Connection-Test-API `POST /api/odoo/test` gibt `ok: true` zurück
- [ ] **[LIVE-03]** `POST /api/odoo/sync-client` erstellt `res.partner` in Odoo (action: created)
- [ ] **[LIVE-04]** Zweiter identischer Sync-Call gibt action: updated zurück (Idempotenz)
- [ ] **[LIVE-05]** Odoo-UI zeigt synchronisierten Partner unter Kontakte (Vanessa K. bestätigt)
- [ ] **[LIVE-06]** `/api/odoo/health` gibt `ok: true` mit Odoo-Version zurück

**Docs & Ops:**
- [ ] **[DOC-01]** ADR-007 committed vor erstem PR-Merge
- [ ] **[DOC-02]** ADR-007 enthält gewählte Cron-Option (A: Coolify / B: Vercel / C: bestehender Scheduler)
- [ ] **[DOC-03]** `CHANGELOG.md`: `feat: Odoo CRM Connector (Slice 29)`
- [ ] **[DOC-04]** `.env.example`: `ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME` als Kommentare; `CRON_SECRET` falls Option A
- [ ] **[OPS-01]** `pnpm smoke:odoo` in `package.json` als Script — MUSS ausführbar sein
- [ ] **[OPS-02]** Coolify: `ODOO_SMOKE_ENABLED`-Guard für Post-Deploy-Smoke (Option A: auch `CRON_SECRET` hinterlegen)
- [ ] **[LEGAL-01]** DSGVO-Löschkonzept als TODO in `lib/odoo/client.ts` kommentiert

---

## Appendix A — Odoo RPC Quick Reference

**authenticate:**
```json
POST https://{instance}/jsonrpc
{"jsonrpc":"2.0","method":"call","params":{"service":"common","method":"authenticate","args":["{db}","{user}","{apiKey}",{}]},"id":1}
```

**execute_kw (search_read):**
```json
{"jsonrpc":"2.0","method":"call","params":{"service":"object","method":"execute_kw","args":["{db}",{uid},"{apiKey}","res.partner","search_read",[[["ref","=","vysible:abc123"]]],{"fields":["id","name","ref"],"limit":2}]},"id":2}
```

## Appendix B — Geprüfte Dateien

| Pfad | Zweck |
|---|---|
| `lib/integrations/store.ts` | Integration Credential-Pattern |
| `lib/wordpress/client.ts` | Referenz-Client-Implementierung |
| `lib/klicktipp/client.ts` | Referenz-Client mit Session-Auth |
| `lib/utils/retry.ts` | `withRetry`-Implementierung |
| `lib/utils/logger.ts` | Logging-Pattern (pino) |
| `app/api/healthz/route.ts` | Bestehender Health-Check als Referenz |
| `prisma/schema.prisma` | Provider-Enum, ProjectIntegration, Client |
| `docs/dev-prompts/plan-v6.1.md` | Slice-Katalog — kein Odoo |
| `docs/roadmap.md` | Phase-Status |

## Appendix C — Lokale Odoo-Dev-Instanz (Docker)

```bash
# Odoo 18 lokal starten (für Tests ohne Live-Instanz)
docker run -p 8069:8069 \
  -e HOST=localhost \
  --name odoo18-dev odoo:18.0

# URL: http://localhost:8069
# DB-Name bei erster Einrichtung wählen
# Admin-Passwort setzen
# External API: Custom Plan erforderlich — für lokale Tests: Community Edition reicht für RPC
```

`demo.odoo.com` ist ausschließlich für erste Connectivity-Tests geeignet — wird täglich zurückgesetzt.

## Appendix D — Kritische Selbstprüfung dieses Dokuments

**Geprüfte Aspekte:**

1. **Technische Korrektheit:** `authenticate`-Signatur mit 4 Argumenten entspricht der offiziellen Odoo-18-Spec. Retry-Trennung (nur `executeKw`) ist korrekt. Deprecation-Timeline (Odoo 22 / Online 21.1) faktenbasiert.

2. **Vollständigkeit:** Alle 7 Fragen des Product Owners beantwortet und ins Dokument integriert. Sync-Trigger (manuell + täglich automatisch) vollständig spezifiziert.

3. **Risiko-Abdeckung:** Account-Lockout, Partial-Write, Duplikat-ref, API-Key-Leakage in Logs, DSGVO-Löschkonzept, Timeout — alle adressiert.

4. **Produktions-Readiness-Lücken (adressiert):**
   - **Credentials-Laden im Cron-Kontext:** `loadOdooCredentials()` als Stub mit Exploration-Kommentar — Agent muss nach Exploration von `lib/integrations/store.ts` verdrahten. ✅ Dokumentiert.
   - **Cron-Deployment-Mechanismus:** Drei Optionen (Coolify, Vercel, bestehender Scheduler) mit Exploration-Check — Agent wählt nach Codebase-Befund. ✅ Dokumentiert.
   - **Rate-Limiting:** In-Memory-Map-Pattern für MVP bereitgestellt; Einschränkungen (Restart-Reset) transparent dokumentiert. ✅ Ausreichend für MVP.
   - **Live-Acceptance-Tests:** Verpflichtend als Sprint-Closeout-Gate, nicht optional. 6 konkrete curl-Tests + Odoo-UI-Verifikation durch Maintainer. ✅ Neu ergänzt.

5. **Verbleibende bekannte Unsicherheiten (Cursor löst diese beim Exploration-Schritt):**
   - Exakte `writeAuditLog`-Signatur — Stub + Kommentar im Code; Cursor passt an
   - Exaktes `ClientIntegrationMapping`-Schema — hängt von `ProjectIntegration`-Struktur ab; Cursor prüft und wählt konsistentes Pattern
   - Cron-Option A/B/C — Cursor wählt nach Exploration; alle drei dokumentiert

6. **Gewichtung der Review-Dimensionen:**

| Dimension | Gewichtung | Bewertung |
|---|---|---|
| Betriebsstabilität (Health, Monitoring, Cron) | Hoch — eigene Sektion, 3 Cron-Optionen, rate-limiting Pattern | ✅ |
| Datenintegrität & Sync-Konsistenz | Hoch — vollständige Upsert-Logik, Duplikat-Schutz, Idempotenz-Test | ✅ |
| Live-Acceptance-Tests | Hoch — 6 verpflichtende Tests als Closeout-Gate | ✅ Neu |
| Fehlerklassen-Architektur | Hoch — 4 Klassen, Retry-Eligibility explizit | ✅ |
| Sicherheit | Hoch — Logs, Timeout, AES-256, Credentials-Kontext | ✅ |
| Einfachheit/YAGNI | Mittel — kein Event-Queue, kein JSON-2 sofort | ✅ |
| Evolutionspfad | Mittel — Transport-Interface + ADR-007 + Timeline | ✅ |

**Gesamturteil nach Selbstprüfung:** Mit vollständig ausgeführtem Sprint-Prompt, bestandenen Live-Acceptance-Tests und Odoo-UI-Bestätigung durch Maintainer ist die Integration produktiv und verifiziert.

