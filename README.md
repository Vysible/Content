# Vysible — KI-Content-Plattform für Arztpraxen

> Vollautomatische Content-Pakete (Blog, Newsletter, Social Media) aus einer Praxis-URL.  
> Agentur-intern · Single-Tenant · DACH · HWG-konform

---

## Für alle, die mit diesem Repository arbeiten

### Was ist Vysible?

Vysible ist ein internes Web-Tool für eine Marketingagentur. Es nimmt die Website einer Arzt- oder Zahnarztpraxis, analysiert sie mit KI, und erstellt daraus fertige Texte für sechs Monate: Blog-Artikel, Newsletter und Social-Media-Posts — auf Knopfdruck, in 10–15 Minuten.

**Das Problem, das es löst:** Früher hat ein Mitarbeiter für jede Praxis manuell Themen recherchiert, Texte geschrieben und Bilder ausgewählt. Das hat Tage gedauert und skaliert nicht.

**Was Vysible liefert:** URL eingeben, KI-Schlüssel konfigurieren, auf "Generieren" klicken. Die KI liest die Praxis-Website, plant 6 Monate Content, schreibt alle Texte und liefert alles als ZIP oder direkt als Social-Media-Entwurf.

---

## Erste Schritte (Kochbuch für Nicht-Techniker)

### Voraussetzungen

Du brauchst auf deinem Rechner:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (kostenlos)
- [Node.js 20+](https://nodejs.org/) (LTS-Version)
- [Git](https://git-scm.com/)
- Einen Anthropic-API-Schlüssel (für die KI-Generierung)

### Schritt 1: Projekt herunterladen

Öffne eine Eingabeaufforderung (Terminal / PowerShell) und gib ein:

```bash
git clone <repo-url>
cd Vys_MarkMng
```

### Schritt 2: Konfigurationsdatei anlegen

Kopiere die Beispieldatei und fülle sie aus:

```bash
cp .env.example .env
```

Öffne `.env` in einem Texteditor und ersetze die Platzhalter:

```
# Datenbank — so lassen (Docker übernimmt das)
DATABASE_URL="postgresql://vysible:vysible@localhost:5432/vysible"

# Sicherheitsschlüssel — zufälligen Text eintragen (min. 32 Zeichen)
NEXTAUTH_SECRET="irgendein-langer-zufaelliger-text-hier"

# Verschlüsselungsschlüssel — genau 64 Hex-Zeichen (siehe Hinweis unten)
ENCRYPTION_SECRET="<64-hex-zeichen>"
```

> **Tipp:** Einen sicheren `ENCRYPTION_SECRET` generierst du so:  
> Gib in PowerShell ein: `[System.BitConverter]::ToString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) -replace '-',''`

### Schritt 3: Abhängigkeiten installieren

```bash
npm install -g pnpm
pnpm install
```

### Schritt 4: Datenbank starten

```bash
docker compose up -d
```

Docker startet jetzt PostgreSQL im Hintergrund. Das dauert beim ersten Mal ca. 1 Minute.

### Schritt 5: Datenbank einrichten

```bash
pnpm db:migrate   # Tabellen anlegen
pnpm db:seed      # Admin-Benutzer anlegen
```

### Schritt 6: App starten

```bash
pnpm dev
```

Öffne im Browser: **http://localhost:3000**

Login: `admin@vysible.de` / `admin123`

> **Wichtig:** Passwort nach dem ersten Login ändern!

### Schritt 7: KI-Schlüssel hinterlegen

1. Einloggen → Einstellungen → API-Keys
2. Anthropic-Schlüssel eintragen (beginnt mit `sk-ant-...`)
3. Optional: OpenAI, DataForSEO, Canva

Ab jetzt kannst du Projekte anlegen und Content generieren.

---

## Sage deiner KI (Cursor / Windsurf / Claude)...

Wenn du die KI-IDE für die Weiterentwicklung nutzt, füge am Anfang jedes neuen Chats folgendes ein:

```
Lies zuerst: AGENTS.md, docs/architecture.md, docs/roadmap.md, docs/decisions.md
Projektkontext ist vollständig in diesen Dateien beschrieben.
Forge-Regeln in .windsurf/rules/ sind verbindlich.
```

Entwicklungsprompts für einzelne Features findest du in `docs/dev-prompts/`.

---

## Häufige Probleme

| Problem | Lösung |
|---|---|
| "Database connection failed" | `docker compose up -d` ausführen, 30 Sek. warten |
| "Kein aktiver Anthropic-Key" | Einstellungen → API-Keys → Schlüssel eintragen |
| "Scraper nicht erreichbar" | `docker compose up -d` prüfen, Playwright-Container läuft? |
| Login funktioniert nicht | `pnpm db:seed` erneut ausführen |
| Port 3000 belegt | `$env:PORT=3001; pnpm dev` |

---

## Produktionsbetrieb (Coolify / Hostinger VPS)

```
Internet → Cloudflare Tunnel → vysible.cloud → Coolify → Next.js App
                                                        → PostgreSQL
                                                        → Playwright-Service
```

Deployments laufen automatisch bei jedem Push auf `main`. Keine manuelle SSH-Intervention nötig.

**Environment Variables** werden im Coolify-Dashboard gesetzt — nie in Git committen.

---

---

## Technische Dokumentation

### Architektur

Vollständige Systemarchitektur: [`docs/architecture.md`](docs/architecture.md)  
Architekturentscheidungen (ADRs): [`docs/decisions.md`](docs/decisions.md)  
Sprint-Planung & Roadmap: [`docs/roadmap.md`](docs/roadmap.md)  
Forge-Regelabweichungen: [`docs/forge-web-deviations.md`](docs/forge-web-deviations.md)

### Tech-Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js 14 App Router, TypeScript strict |
| Styling | Tailwind CSS |
| Auth | Auth.js v5 (Credentials), bcrypt 12 Rounds, JWT |
| Datenbank | PostgreSQL 16 via Prisma 5 |
| KI | Anthropic Claude + OpenAI (provider-agnostisch) |
| Scraping | Playwright (eigener Docker-Container, 512 MB cap) |
| Streaming | Server-Sent Events (SSE) |
| Verschlüsselung | AES-256-GCM für alle API-Keys |
| E-Mail | nodemailer (SMTP, eigene SmtpConfig-Tabelle) |
| Export | DOCX + PDF + XLSX + ZIP |
| Paketmanager | pnpm 9 |
| Governance | Forge-Web 2.2.0, Maturity: DEVELOPMENT |

### Projektstruktur

```
app/              Next.js App Router (Seiten + API-Routes)
  (auth)/         Login
  (dashboard)/    Geschützter Agentur-Bereich
  api/generate/   Generierungs-Pipeline (start, stream, status, retry)
lib/
  ai/             Anthropic/OpenAI Clients
  crypto/aes.ts   AES-256-GCM (einzige Crypto-Stelle)
  generation/     Pipeline, Job-Store (DB-backed), Themes, Texts, SSE
  scraper/        HTTP-Client → Playwright-Service
  email/mailer.ts SMTP-Versand mit withRetry
  utils/retry.ts  Gemeinsamer Retry-Wrapper (exponentieller Backoff)
prompts/          KI-Prompts als YAML (nie im TypeScript-Code)
templates/        Fachgebiet-Templates (Zahnarzt, KFO, Gynäkologie)
prisma/           Schema + Migrations
services/         Playwright-Microservice (eigenständig)
docs/             Architektur, ADRs, Roadmap, Governance
  dev-prompts/    Cursor/Windsurf-Entwicklungsprompts (Vibe-Coding)
```

### Alle Befehle

| Befehl | Beschreibung |
|---|---|
| `pnpm dev` | Entwicklungsserver (http://localhost:3000) |
| `pnpm build` | Produktions-Build |
| `pnpm lint` | ESLint ausführen |
| `pnpm db:migrate` | Neue Migration erstellen und anwenden |
| `pnpm db:deploy` | Migrationen anwenden (Produktion) |
| `pnpm db:push` | Schema direkt pushen (nur Dev, keine Migration) |
| `pnpm db:seed` | Admin-User anlegen |
| `pnpm db:studio` | Prisma Studio (DB-Browser) auf Port 5555 |
| `docker compose up -d` | PostgreSQL + Playwright starten |
| `docker compose down` | Container stoppen |

### Sicherheitshinweise

- API-Keys werden AES-256-GCM verschlüsselt gespeichert — nie im Klartext
- `.env` niemals committen (steht in `.gitignore`)
- `ENCRYPTION_SECRET` und `NEXTAUTH_SECRET` niemals teilen
- Passwörter: bcrypt mit 12 Rounds
- Alle Routen außer `/login` und `/api/healthz` sind auth-geschützt

### Wichtige Hinweise für die Migration zur Produktion

1. `DATABASE_URL` in Coolify setzen — nie in `.env` committen
2. `prisma migrate deploy` (nicht `dev`) für Produktions-Migrationen
3. `SMTP`-Konfiguration über Einstellungen → SMTP in der App hinterlegen
4. Playwright-Service läuft als separater Container — `mem_limit: 512m` nicht erhöhen ohne VPS-Kapazitätsprüfung
