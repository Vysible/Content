# Vysible – KI-Content-Automationsplattform

Browser-basierte KI-Plattform zur Erstellung von Content-Marketing-Paketen für Arzt- und Zahnarztpraxen.

## Quick Start (5 Befehle)

```bash
git clone <repo>
cp .env.example .env          # Secrets eintragen (NEXTAUTH_SECRET, ENCRYPTION_SECRET)
pnpm install
docker compose up -d          # PostgreSQL starten
pnpm dev                      # App auf http://localhost:3000
```

Standard-Login nach `pnpm db:seed`: `admin@vysible.de` / `admin123`

## Prod-Deploy via Coolify

Coolify-Dashboard → Neues Projekt → GitHub-Repo verbinden → Environment Variables setzen → Deploy.

## Befehle

| Befehl | Beschreibung |
|---|---|
| `pnpm dev` | Entwicklungsserver |
| `pnpm build` | Produktions-Build |
| `pnpm db:push` | Schema zu DB pushen (Dev) |
| `pnpm db:migrate` | Migration erstellen |
| `pnpm db:seed` | Admin-User anlegen |
| `pnpm db:studio` | Prisma Studio öffnen |
