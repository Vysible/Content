# CLAUDE.md — Vysible

## What is this?

Vysible is a browser-based AI content automation platform for medical and dental practices in the DACH region. Single-tenant, agency-internal. Generates 6-month content packages (blog, newsletter, social media, WordPress drafts, Klick-Tipp campaigns) from a practice URL + positioning document.

## Status

**Phase A — UI prototype** (current). Single-file `index.html` served via nginx.
**Phase B — full app** (planned). Next.js 14 + Auth.js v5 + Prisma + Postgres per `plan.md`.

## Tech Stack

| Layer | Phase A | Phase B (planned) |
|---|---|---|
| Frontend | Single-file HTML + Tailwind CDN | Next.js 14 App Router + Tailwind + shadcn/ui |
| Backend | — | Next.js API routes, Auth.js v5 |
| DB | — | SQLite (dev) / PostgreSQL (prod) |
| Web server | nginx 1.27-alpine | Node 20 + Next.js |
| Container | Docker | Docker Compose |
| Deploy | Coolify on Hostinger VPS | Coolify on Hostinger VPS |
| SSL | Traefik + Let's Encrypt | Traefik + Let's Encrypt |
| DNS | Cloudflare (proxied A-record) | Cloudflare (proxied A-record) |

## File structure

```
/
├── index.html       Single-file prototype (login, dashboard, wizard, results, KPIs, analytics)
├── Dockerfile       nginx:1.27-alpine + index.html
├── nginx.conf       Static serving + /healthz endpoint + security headers
├── plan.md          Full implementation plan v6.1 (Phase B)
├── CLAUDE.md        This file
└── README.md        Quick start
```

## Deployment

- **Repo:** `Torsten-Kohnert/torsten-vysible` (private)
- **Production:** `https://vysible.torsten-kohnert.de` (Coolify auto-deploys on push to `main`)
- **DNS:** A-record `vysible` → `72.62.156.161` (Cloudflare proxied)
- **SSL:** Traefik + Let's Encrypt (automatic)

## Conventions

Follows `~/Documents/Claude/Dev Ops/code-style-guide.md`:
- German UI text, English code/identifiers
- No `var`, always `const`/`let`
- `console.log('[Vysible]', ...)` with project prefix
- AES-256 for any future API keys (Phase B)
- No PII in logs — IDs only

## Phase A → Phase B migration plan

When Phase B starts (next slice = Slice 4: API-Key Manager), replace `index.html` + nginx with Next.js app in the same repo. Coolify pipeline stays. DNS stays. Domain stays.

## Known limitations (Phase A)

- Static UI only — no real auth, no real API calls, no DB
- Tailwind via CDN (Phase B will compile Tailwind natively)
- Example data hard-coded (Zahnzentrum Warendorf as validation persona)
