## Template for Prompts, Content IS NOT FOR USE OR PRODUCTION!
# W-20 — Example Prompt

**Framework:** ForgeWeb
**Phase:** Phase 2
**Position:** 20/20 (W-20)
**Abhängigkeit:** W-19 (v1.5.0) + W-18 (v1.1.0)
**Mode:** phase-end
**Ziel-Version:** v1.6.0
**Forge-Quelle:** kein direktes Äquivalent — Consumer-Registry ist ForgeWeb-spezifisch

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

> ⚠️ Lies den gesamten Slice-Prompt zuerst. Beginne **keinen** Tool-Call
> bis Pre-Slice Validation abgeschlossen ist.

> **Pre-Flight:** Committe Drift in `prompts/`, `docs/`, `attention.md`,
> `ROADMAP.md`, `CHANGELOG.md` mit `chore(prompts): ...` oder `docs: ...`.

Lies `prompts/Pre_Slice_Validation.md` vollständig.

Resolve Parameter automatisch:

```powershell
$predecessor_version     = (Get-Content package.json | ConvertFrom-Json).version
$expected_version        = (Select-String "W-20\s*\|[^|]*\|[^|]*\|[^|]*\|\s*v?([\d.]+)" ROADMAP.md).Matches[0].Groups[1].Value
$collect_out             = npx vitest --reporter=verbose --run --passWithNoTests 2>&1
$expected_test_count_min = [int](($collect_out | Select-String "(\d+)\s+tests?\s+(passed|collected)" | ForEach-Object { $_.Matches[0].Groups[1].Value } | Select-Object -Last 1) ?? 0)
```

Feste Parameter:

```
mode              = phase-end
current_slice     = W-20
predecessor_slice = W-19
expected_coverage_min = 85.0
```

> **Pflicht-Voraussetzung:** BEIDE Abhängigkeiten MÜSSEN committed sein:
> - W-19 (`detectConflicts`, `writeDeviationsDoc` in sync.ts) ✅
> - W-18 (`BroadcastService`, `broadcast-update` in bin/) ✅
>
> Prüfe: `Select-String "broadcast-update" bin/forge-web.ts` → muss Treffer liefern.

Bei **Hard-FAIL:** STOP. Warte auf Maintainer.
Bei **Soft-FAIL:** Auto-Fix, Re-Check, Auto-Proceed.
Bei **7/7 PASS:** direkt mit Sub-Track A beginnen.

---

## CRITICAL: Self-review Checklist

- [ ] **Phase-End-Check (E-1):** Alle W-14 bis W-20 Slices committed — `ROADMAP.md` prüfen
- [ ] `consumers.ts`: CRUD via `forge-web.config.json` — keine eigene DB, nur JSON
- [ ] `forge-web.config.json` Schema: `consumers[]` + ggf. weitere Felder — rückwärtskompatibel
- [ ] `bin/forge-web.ts` MOD: `consumers`-Subcommands registrieren (`add`, `list`, `remove`)
- [ ] Kommando-Struktur: `forge-web consumers add`, `list`, `remove` (Sub-Commands via `.command()`)
- [ ] ADR-W009 bis W-011: Sachlich, keine Marketing-Sprache, konkrete Entscheidung mit Kontext + Alternativen
- [ ] `docs/architecture.md` MOD: Phase-2-Abschnitt mit Überblick aller 7 neuen Slices
- [ ] `README.md` MOD: Neue Commands dokumentieren (broadcast-update, consumers)
- [ ] Tests: ≥ 4 Tests für `consumers.ts` (add/list/remove)
- [ ] Phase-End: Alle Tests grün, Coverage ≥ 85%, Version = 1.6.0
- [ ] Phase-End: `attention.md` Phase-2-Abschluss-Eintrag

---

## ADR-Bezug

- **ADR-W009** — Consumer-Registry-Entscheidung (DIESE SLICE)
- **ADR-W010** — Sync Conflict-Resolution (DIESE SLICE — Dokumentation W-19)
- **ADR-W011** — broadcast-update Mechanismus (DIESE SLICE — Dokumentation W-18)

---

## Scope Check

**IN:**

```
src/commands/consumers.ts               (NEU — add/list/remove Consumer-Registry)
bin/forge-web.ts                        (MOD — consumers Sub-Commands)
docs/adr/ADR-W009.md                    (NEU)
docs/adr/ADR-W010.md                    (NEU)
docs/adr/ADR-W011.md                    (NEU)
docs/architecture.md                    (MOD — Phase-2-Abschnitt)
README.md                               (MOD — neue Commands)
tests/unit/commands/consumers.test.ts   (NEU — ≥4 Tests)
CHANGELOG.md / ROADMAP.md / attention.md
```

**OUT:**

```
Nichts — W-20 ist Phase-2-Abschluss. Kein weiteres Slice folgt.
```

---

## Sub-Track A — `src/commands/consumers.ts` NEU

```typescript
// src/commands/consumers.ts
import fs from 'node:fs';
import path from 'node:path';
import type { ConsumerEntry } from '../interfaces/ForgeBroadcastProvider.js';

// ─── forge-web.config.json Schema ──────────────────────────────────────────

interface ForgeWebConfig {
  consumers?: ConsumerEntry[];
  [key: string]: unknown;
}

const DEFAULT_CONFIG_PATH = 'forge-web.config.json';

function readConfig(configPath: string): ForgeWebConfig {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf-8')) as ForgeWebConfig;
  } catch (exc: unknown) {
    console.warn(`[WARN] forge-web.config.json unreadable, starting fresh: ${exc instanceof Error ? exc.message : String(exc)}`);
    return {};
  }
}

function writeConfig(configPath: string, config: ForgeWebConfig): void {
  const resolved = path.resolve(configPath);
  fs.writeFileSync(resolved, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

// ─── CRUD-Operationen ──────────────────────────────────────────────────────

export function listConsumers(configPath = DEFAULT_CONFIG_PATH): ConsumerEntry[] {
  const config = readConfig(configPath);
  return Array.isArray(config.consumers) ? config.consumers : [];
}

export function addConsumer(
  entry: ConsumerEntry,
  configPath = DEFAULT_CONFIG_PATH
): { added: boolean; reason?: string } {
  const config = readConfig(configPath);
  const consumers: ConsumerEntry[] = Array.isArray(config.consumers) ? config.consumers : [];

  const exists = consumers.some(
    (c) => c.owner === entry.owner && c.repo === entry.repo
  );
  if (exists) {
    return { added: false, reason: `Consumer ${entry.owner}/${entry.repo} already registered.` };
  }

  consumers.push(entry);
  writeConfig(configPath, { ...config, consumers });
  return { added: true };
}

export function removeConsumer(
  owner: string,
  repo: string,
  configPath = DEFAULT_CONFIG_PATH
): { removed: boolean; reason?: string } {
  const config = readConfig(configPath);
  const consumers: ConsumerEntry[] = Array.isArray(config.consumers) ? config.consumers : [];

  const before = consumers.length;
  const updated = consumers.filter((c) => !(c.owner === owner && c.repo === repo));
  if (updated.length === before) {
    return { removed: false, reason: `Consumer ${owner}/${repo} not found.` };
  }

  writeConfig(configPath, { ...config, consumers: updated });
  return { removed: true };
}

// ─── CLI-Command-Handler ──────────────────────────────────────────────────

export function consumersAddCommand(opts: {
  owner: string;
  repo: string;
  alias?: string;
  config: string;
}): void {
  const result = addConsumer(
    { owner: opts.owner, repo: opts.repo, ...(opts.alias ? { alias: opts.alias } : {}) },
    opts.config
  );
  if (result.added) {
    console.log(`[OK] Consumer added: ${opts.owner}/${opts.repo}`);
  } else {
    console.warn(`[WARN] ${result.reason}`);
  }
}

export function consumersListCommand(opts: { config: string }): void {
  const consumers = listConsumers(opts.config);
  if (consumers.length === 0) {
    console.log('No consumers registered. Use: forge-web consumers add --owner <owner> --repo <repo>');
    return;
  }
  console.log(`Registered consumers (${consumers.length}):`);
  for (const c of consumers) {
    const alias = c.alias ? ` (${c.alias})` : '';
    console.log(`  • ${c.owner}/${c.repo}${alias}`);
  }
}

export function consumersRemoveCommand(opts: {
  owner: string;
  repo: string;
  config: string;
}): void {
  const result = removeConsumer(opts.owner, opts.repo, opts.config);
  if (result.removed) {
    console.log(`[OK] Consumer removed: ${opts.owner}/${opts.repo}`);
  } else {
    console.warn(`[WARN] ${result.reason}`);
  }
}
```

---

## Sub-Track B — `bin/forge-web.ts` MOD

Ergänze am Datei-Anfang bei den Imports:

```typescript
import {
  consumersAddCommand,
  consumersListCommand,
  consumersRemoveCommand,
} from '../src/commands/consumers.js';
```

Ergänze nach dem `broadcast-update`-Command:

```typescript
const consumers = program
  .command('consumers')
  .description('Manage consumer repository registry (forge-web.config.json)');

consumers
  .command('add')
  .description('Register a consumer repository')
  .requiredOption('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--repo <repo>', 'GitHub repository name')
  .option('--alias <alias>', 'Optional display alias')
  .option('--config <path>', 'Path to forge-web.config.json', 'forge-web.config.json')
  .action((opts: { owner: string; repo: string; alias?: string; config: string }) => {
    consumersAddCommand(opts);
  });

consumers
  .command('list')
  .description('List registered consumer repositories')
  .option('--config <path>', 'Path to forge-web.config.json', 'forge-web.config.json')
  .action((opts: { config: string }) => {
    consumersListCommand(opts);
  });

consumers
  .command('remove')
  .description('Remove a consumer repository from the registry')
  .requiredOption('--owner <owner>', 'GitHub owner')
  .requiredOption('--repo <repo>', 'GitHub repository name')
  .option('--config <path>', 'Path to forge-web.config.json', 'forge-web.config.json')
  .action((opts: { owner: string; repo: string; config: string }) => {
    consumersRemoveCommand(opts);
  });
```

---

## Sub-Track C — ADR-W009: Consumer-Registry

```markdown
# ADR-W009 — Consumer-Registry in forge-web.config.json

**Datum:** YYYY-MM-DD
**Status:** Accepted
**Autoren:** ForgeWeb Team

## Kontext

`forge-web broadcast-update` (W-18) muss wissen welche Consumer-Repositories
ForgeWeb-Regeln abonniert haben. Es braucht eine persistente Registrierung.

## Entscheidung

Consumer-Repositories werden als JSON-Array in `forge-web.config.json`
im Root des ForgeWeb-Repos gespeichert:

```json
{
  "consumers": [
    { "owner": "acme-corp", "repo": "saas-frontend" },
    { "owner": "acme-corp", "repo": "admin-panel", "alias": "Admin" }
  ]
}
```

CRUD via `forge-web consumers add/list/remove` CLI-Commands.

## Alternativen verworfen

| Alternative | Warum verworfen |
|-------------|-----------------|
| GitHub Topics-basiert (auto-discovery) | Erfordert GitHub API-Polling, zu komplex |
| Separate Datenbank/Registry-Service | Over-Engineering für das Anwendungsszenario |
| Hardcoded Liste im Quellcode | Nicht wartbar, erfordert Commit für jede Änderung |

## Konsequenzen

- **Positiv:** Einfach, versionierbar, kein externer Service nötig
- **Positiv:** `forge-web.config.json` ist `.gitignore`-fähig falls sensitiv
- **Negativ:** Manuelle Pflege — kein Auto-Discovery
- **Negativ:** Bei vielen Consumern wird JSON-Datei groß (akzeptabel für <100 Repos)
```

---

## Sub-Track D — ADR-W010: Sync Conflict-Resolution

```markdown
# ADR-W010 — Sync Conflict-Resolution via Exit-Code 4 und deviations.md

**Datum:** YYYY-MM-DD
**Status:** Accepted
**Autoren:** ForgeWeb Team

## Kontext

`forge-web sync` hat bisher forge-managed Dateien blind überschrieben.
Dadurch gehen lokale, bewusste Anpassungen in Consumer-Projekten verloren.

## Entscheidung

1. `forge-web sync` erkennt Konflikte (forge-managed Datei lokal modifiziert)
2. Bei Conflicts ohne `--force`: Exit-Code 4, kein Überschreiben
3. `docs/forge-web-deviations.md` dokumentiert die Conflicts (Governance-Pflicht)
4. CI (`forge-sync.yml`) behandelt Exit-Code 4 als reviewpflichtigen Zustand

## Exit-Code-Semantik

| Code | Bedeutung |
|------|-----------|
| 0 | Sync erfolgreich |
| 1 | Interner Fehler |
| 4 | Conflicts detected (forge-managed Dateien lokal modifiziert) |

## Konsequenzen

- Consumer-Projekte können jetzt bewusst von Regeln abweichen (dokumentiert)
- `--force` bleibt für Notfälle — erfordert aber dokumentierten Prozess
- Referenz: `src/rules/schicht-0/sync-deviation-policy.mdc`
```

---

## Sub-Track E — ADR-W011: broadcast-update Mechanismus

```markdown
# ADR-W011 — broadcast-update via GitHub Workflow-Dispatch

**Datum:** YYYY-MM-DD
**Status:** Accepted
**Autoren:** ForgeWeb Team

## Kontext

Wenn ForgeWeb eine neue Version released, müssen alle Consumer-Projekte
ihre Regeln aktualisieren. Bisher manueller Prozess.

## Entscheidung

`forge-web broadcast-update` sendet GitHub Workflow-Dispatch an alle
registrierten Consumer-Repos. Jeder Consumer muss `forge-sync.yml` haben.

**Authentifizierung:** `GITHUB_TOKEN` environment variable (Personal Access Token
mit `repo` und `workflow` Scope, oder GitHub App Installation Token).

**Workflow-Input:** `forge_web_version` — Consumer kann Version pinnen oder überschreiben.

## Alternativen verworfen

| Alternative | Warum verworfen |
|-------------|-----------------|
| npm publish hook | Nur für npm-Packages, nicht für private Repos |
| Webhook-basiert | Erfordert externen Service / Server |
| Manual PR per Consumer | Nicht skalierbar bei vielen Consumers |

## Konsequenzen

- **Positiv:** Vollautomatisch, skalierbar auf 100+ Consumer-Repos
- **Positiv:** `--dry-run` für Preview ohne API-Calls
- **Negativ:** GITHUB_TOKEN muss gepflegt werden (Expiry-Risiko)
- **Negativ:** Abhängig von GitHub Actions (kein GitLab/Bitbucket-Support)
```

---

## Sub-Track F — `docs/architecture.md` MOD

Füge nach der bestehenden Architektur-Beschreibung hinzu:

```markdown
## Phase 2 — Production-Hardening (v1.1.0 bis v1.6.0)

Phase 2 ergänzt das Bootstrap-Framework um Production-Readiness-Features:

### Template-Hardening (W-14, W-15)
- **Security-Headers** in `next.config.ts` (CSP, HSTS, X-Frame-Options)
- **Rate-Limiting Skeleton** in `src/middleware.ts`
- **Error-Boundaries** (`error.tsx`, `global-error.tsx`, `loading.tsx`)
- **Prisma Schema** mit tenantId als Pflichtfeld (Multi-Tenancy)
- **Structured Logging** mit pino + PII-Redaction (ADR-W008)

### Quality-Engine-Erweiterungen (W-16, W-17)
- **Layer A Extensions** (Hard-Checks): Security-Headers, $queryRaw-Sanitization, PII-in-Logs
- **Layer E Extensions** (Advisory): Rate-Limiting auf API-Routen, Prisma ohne tenantId-Filter
- Whitelist-Mechanismus: `// forge-web-whitelist: <reason>`

### Broadcast + Consumer-Registry (W-18, W-20)
- `forge-web broadcast-update` — GitHub Workflow-Dispatch an alle Consumer (ADR-W011)
- `forge-web consumers add/list/remove` — CRUD für `forge-web.config.json` (ADR-W009)

### Sync Conflict-Resolution (W-19)
- `detectConflicts()` — erkennt lokale Änderungen in forge-managed Dateien
- Exit-Code 4 + `docs/forge-web-deviations.md` (ADR-W010)
- `ratchet-check` CI-Job — verhindert Maturity-Level-Rückschritt
```

---

## Sub-Track G — `README.md` MOD

Ergänze im `## Commands` Abschnitt:

```markdown
### forge-web broadcast-update

Sendet GitHub Workflow-Dispatch an alle registrierten Consumer-Repos:

```bash
forge-web broadcast-update                    # Alle Consumer benachrichtigen
forge-web broadcast-update --dry-run          # Preview ohne API-Calls
forge-web broadcast-update --config path/to/forge-web.config.json
```

Benötigt: `GITHUB_TOKEN` mit `repo` + `workflow` Scope.

### forge-web consumers

Verwaltet die Consumer-Repository-Registry (`forge-web.config.json`):

```bash
forge-web consumers add --owner acme-corp --repo saas-frontend
forge-web consumers list
forge-web consumers remove --owner acme-corp --repo saas-frontend
```
```

---

## Sub-Track H — Tests `tests/unit/commands/consumers.test.ts` NEU

```typescript
// tests/unit/commands/consumers.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { addConsumer, listConsumers, removeConsumer } from '../../../src/commands/consumers.js';

let tmpDir: string;
let configPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-web-consumers-'));
  configPath = path.join(tmpDir, 'forge-web.config.json');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('listConsumers', () => {
  it('gibt leeres Array zurück wenn config nicht existiert', () => {
    const result = listConsumers(configPath);
    expect(result).toEqual([]);
  });

  it('gibt registrierte Consumers zurück', () => {
    fs.writeFileSync(
      configPath,
      JSON.stringify({ consumers: [{ owner: 'test-org', repo: 'test-repo' }] })
    );
    const result = listConsumers(configPath);
    expect(result).toHaveLength(1);
    expect(result[0].owner).toBe('test-org');
  });
});

describe('addConsumer', () => {
  it('fügt neuen Consumer hinzu', () => {
    const result = addConsumer({ owner: 'acme', repo: 'frontend' }, configPath);
    expect(result.added).toBe(true);
    const consumers = listConsumers(configPath);
    expect(consumers).toHaveLength(1);
    expect(consumers[0].repo).toBe('frontend');
  });

  it('lehnt Duplikate ab', () => {
    addConsumer({ owner: 'acme', repo: 'frontend' }, configPath);
    const result = addConsumer({ owner: 'acme', repo: 'frontend' }, configPath);
    expect(result.added).toBe(false);
    expect(result.reason).toContain('already registered');
    expect(listConsumers(configPath)).toHaveLength(1);
  });

  it('erhält bestehende Config-Felder beim Hinzufügen', () => {
    fs.writeFileSync(configPath, JSON.stringify({ version: '1.0.0' }));
    addConsumer({ owner: 'acme', repo: 'frontend' }, configPath);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    expect(config['version']).toBe('1.0.0');
    expect((config['consumers'] as unknown[]).length).toBe(1);
  });
});

describe('removeConsumer', () => {
  it('entfernt existierenden Consumer', () => {
    addConsumer({ owner: 'acme', repo: 'frontend' }, configPath);
    const result = removeConsumer('acme', 'frontend', configPath);
    expect(result.removed).toBe(true);
    expect(listConsumers(configPath)).toHaveLength(0);
  });

  it('gibt not-found zurück für nicht-existierenden Consumer', () => {
    const result = removeConsumer('nonexistent', 'repo', configPath);
    expect(result.removed).toBe(false);
    expect(result.reason).toContain('not found');
  });
});
```

---

## Sub-Track I — CHANGELOG.md MOD

```markdown
## [1.6.0] - YYYY-MM-DD  ← Phase-2-Abschluss

### Added
- Consumer-Registry + Phase-2-Abschluss (W-20)
  - `forge-web consumers add/list/remove` — CRUD für Consumer-Registry in forge-web.config.json
  - `docs/adr/ADR-W009.md` — Consumer-Registry-Entscheidung
  - `docs/adr/ADR-W010.md` — Sync Conflict-Resolution
  - `docs/adr/ADR-W011.md` — broadcast-update Mechanismus
  - `docs/architecture.md`: Phase-2-Abschnitt
  - `README.md`: broadcast-update + consumers Commands dokumentiert

### Phase-2-Abschluss

ForgeWeb Phase 2 (v1.1.0 – v1.6.0) abgeschlossen.

**Slices:** W-14 bis W-20 (7 Slices, ~35 neue Tests)
**Neue Commands:** `broadcast-update`, `consumers add/list/remove`
**Template:** Security-hardened, Data-Layer (Prisma + pino)
**Quality:** 5 neue AST-Checks (3 Hard + 2 Advisory)
**Governance:** Conflict-Resolution, Deviations-Doc, Ratchet CI
```

---

## Sub-Track J — Phase-End-Check (E-1)

Vor dem Commit: Alle Phase-2-Slices in `ROADMAP.md` auf `✅ Abgeschlossen` setzen:

```powershell
# Prüfe alle W-14 bis W-20 im ROADMAP
Select-String "W-1[4-9]|W-20" ROADMAP.md | Select-String "Abgeschlossen"
# → muss 7 Treffer liefern
```

---

## Acceptance Checklist

- [ ] `src/commands/consumers.ts` exportiert `addConsumer`, `listConsumers`, `removeConsumer`
- [ ] `bin/forge-web.ts` hat `consumers add`, `list`, `remove` Sub-Commands
- [ ] `docs/adr/ADR-W009.md`, `ADR-W010.md`, `ADR-W011.md` existieren
- [ ] `docs/architecture.md` hat Phase-2-Abschnitt
- [ ] `README.md` dokumentiert `broadcast-update` + `consumers`
- [ ] Tests: ≥ 4 neue Tests für consumers.ts, alle grün
- [ ] Alle Tests aller Slices grün (keine Regression)
- [ ] `npm run typecheck` → 0 Fehler
- [ ] `npm run lint` → 0 Fehler
- [ ] Coverage ≥ 85%
- [ ] `package.json` version = 1.6.0
- [ ] ROADMAP.md: W-14 bis W-20 alle `✅ Abgeschlossen`
- [ ] `attention.md` Phase-2-Abschluss-Eintrag

---

## Validation Block

```powershell
# 1. Dateien vorhanden
@("src/commands/consumers.ts",
  "docs/adr/ADR-W009.md", "docs/adr/ADR-W010.md", "docs/adr/ADR-W011.md",
  "tests/unit/commands/consumers.test.ts") | ForEach-Object {
  if (-not (Test-Path $_)) { Write-Error "FEHLT: $_" } else { Write-Host "OK: $_" }
}

# 2. Alle Consumer-Funktionen exportiert
Select-String "export function addConsumer" src/commands/consumers.ts      # → Treffer
Select-String "export function listConsumers" src/commands/consumers.ts    # → Treffer
Select-String "export function removeConsumer" src/commands/consumers.ts   # → Treffer

# 3. consumers Sub-Commands in bin/
Select-String "consumers" bin/forge-web.ts   # → Treffer

# 4. TypeScript + Lint + ALLE Tests
npm run typecheck && npm run lint
npx vitest run
# → ALLE Tests grün (Regression-Check Phase 2)

# 5. Coverage
npm run test:coverage   # → ≥ 85%

# 6. Smoke-Tests CLI
npm run build
node dist/bin/forge-web.js consumers list --config nonexistent.json
# → "No consumers registered"
node dist/bin/forge-web.js consumers add --owner test --repo demo --config /tmp/fw-test-config.json
node dist/bin/forge-web.js consumers list --config /tmp/fw-test-config.json
# → "test/demo"
node dist/bin/forge-web.js --help | Select-String "broadcast-update|consumers"
# → 2 Treffer

# 7. ROADMAP Phase-2-Status
Select-String "W-1[4-9]|W-20" ROADMAP.md | Select-String "Abgeschlossen"
# → 7 Treffer

# 8. Version
(Get-Content package.json | ConvertFrom-Json).version   # → 1.6.0
```

**Stop-Conditions:**
- `consumers`-Sub-Command-Struktur von Commander.js: `.command('consumers')` erst erstellen,
  dann `.command('add')` etc. darauf aufrufen (nicht auf `program` direkt)
- `addConsumer` schlägt auf korruptem JSON fehl → try-catch in `readConfig` prüfen
- Regression in bestehenden Tests (sync, quality, broadcast) → Imports in `bin/forge-web.ts` prüfen

---

## CRITICAL: Sprint Closeout (Pflicht vor Commit)

> **Verbindlich seit 2026-05-15.** Lies `docs/dev-prompts/Sprint_Closeout.md`
> vollständig und führe die **4 Schritte aus, BEVOR der Auto-Commit-Block
> unten ausgeführt wird**.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Roadmap-Status aktualisieren | `docs/roadmap.md` (bzw. `ROADMAP.md`): Slice-Eintrag auf `✅ Abgeschlossen (YYYY-MM-DD, Sprint <ID>)` |
| 2 | OpenActions bereinigen | `docs/dev-prompts/OpenActions.md`: Sprint-Nachlaufblock entfernen, echte Restpunkte in sprintübergreifenden Abschnitt verschieben |
| 3 | Sprint-Prompt archivieren | `Move-Item <prompt-pfad> <archive-pfad>` — Verifikation: `git status` zeigt Rename-Eintrag (`R`) |
| 4 | CHANGELOG-Closeout-Eintrag | `CHANGELOG.md` unter `[Unreleased]`: Archivierung + Roadmap-Update + ggf. OpenActions-Cleanup explizit dokumentieren |

Vor dem ersten `git commit`-Aufruf gibt der Agent den **SPRINT CLOSEOUT-Bericht**
(`4/4 PASS · GO`) aus. Format siehe `Sprint_Closeout.md` § "Output Format".

Bei FAIL in einem Schritt: **HARD-STOP** — kein Commit, fehlenden Schritt
zuerst ausführen.

---

## Auto-Commit Block

```powershell
git add src/commands/consumers.ts
git add bin/forge-web.ts
git add docs/adr/ADR-W009.md docs/adr/ADR-W010.md docs/adr/ADR-W011.md
git add docs/architecture.md
git add README.md
git add tests/unit/commands/consumers.test.ts
git add package.json CHANGELOG.md ROADMAP.md attention.md

git commit -m "feat: W-20 Consumer-Registry + ADRs W009-W011 + Phase-2-Abschluss (v1.6.0)"
git push

# Alle Phase-2-Prompts archivieren (falls noch nicht geschehen)
Get-ChildItem prompts\Prompt_W1*.md, prompts\Prompt_W20*.md | ForEach-Object {
  Move-Item $_.FullName prompts\archive\
}
git add prompts\archive\
git commit -m "chore(prompts): Phase-2-Prompts W-14 bis W-20 archiviert"
git push
```

---

## Abschlussbericht

```
W-20 ABSCHLUSSBERICHT
=====================

✅ Slice:   W-20 — Consumer-Registry + ADRs + Phase-2-Abschluss
✅ Version: 1.5.0 → 1.6.0

CHECKS:
  Working tree clean:              ✅
  TypeScript:                      ✅ 0 Fehler
  ESLint:                          ✅ 0 Fehler
  Alle Tests (Phase-2-Regression): ✅ alle grün
  Coverage:                        ✅ ≥85%
  consumers CRUD:                  ✅
  ADR-W009/W010/W011:              ✅
  architecture.md Phase-2:         ✅
  README.md neue Commands:         ✅
  ROADMAP W-14..W-20 ✅:           ✅

DATEIEN:
  Angelegt:    src/commands/consumers.ts, docs/adr/ADR-W009..W011.md
               tests/unit/commands/consumers.test.ts
  Modifiziert: bin/forge-web.ts, docs/architecture.md, README.md
  Archiviert:  alle Phase-2-Prompts W-14 bis W-20

DRIFT: keiner

═══════════════════════════════════════════════
🏁 PHASE 2 ABGESCHLOSSEN — ForgeWeb v1.6.0

Slices:      W-14 bis W-20 (7/7 ✅)
Commands:    sync, quality, maturity, new, secrets, broadcast-update, consumers
Template:    Security-hardened, Data-Layer, Error-Handling
Quality:     Layer A-F + 5 AST-Extensions (W-16, W-17)
Governance:  Conflict-Resolution, Deviations-Doc, Ratchet CI

▶ PHASE 3 PLANUNG: PR/Issues + forge-web.config.json v2 Schema + Plugin-System?
  → Neues Handover-Dokument erstellen für Phase-3-Planung

ℹ️ Dieses Fenster kann geschlossen werden.
═══════════════════════════════════════════════
```
