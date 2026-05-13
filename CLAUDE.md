# CLAUDE.md — Vysible

## Was ist das?

Vysible ist eine browser-basierte KI-Content-Automationsplattform für Arzt- und Zahnarztpraxen im DACH-Raum. Single-Tenant, agentur-intern. Generiert 6-Monats-Content-Pakete (Blog, Newsletter, Social Media, WordPress-Drafts, Klick-Tipp-Kampagnen) aus einer Praxis-URL + Positionierungsdokument.

## Status

**Phase B — Slice 4 abgeschlossen.** Next.js 14 App Router + Auth.js v5 + Prisma + PostgreSQL.
**Nächster Schritt:** Slice 11 (Scraper-Service).

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS (nativ, kein CDN) |
| Auth | Auth.js v5 (Credentials), bcrypt 12 Rounds |
| DB | PostgreSQL (prod + dev via Docker) |
| ORM | Prisma 5 |
| KI | Anthropic SDK + OpenAI SDK |
| Verschlüsselung | AES-256-GCM für API-Keys |
| Container | Docker / Docker Compose |
| Deploy | Coolify auf Hostinger VPS |
| SSL/Proxy | Cloudflare Tunnel (kein offener Port) |

## Dateistruktur

```
/
├── app/
│   ├── (auth)/login/           Login-Seite
│   ├── (dashboard)/            Geschützter Bereich
│   │   ├── page.tsx            Dashboard
│   │   └── settings/api-keys/  API-Key-Manager (Slice 4 ✅)
│   └── api/
│       ├── auth/[...nextauth]/ Auth.js Handler
│       └── api-keys/           CRUD + Test-Calls
├── components/
│   ├── api-keys/               ApiKeyList, ApiKeyForm
│   └── layout/                 Sidebar, Header
├── lib/
│   ├── auth/session.ts         requireAuth / requireAdmin
│   ├── crypto/aes.ts           AES-256-GCM Ver-/Entschlüsselung
│   ├── ai/client.ts            Anthropic- + OpenAI-Client
│   ├── costs/tracker.ts        CostEntry in DB schreiben
│   └── db.ts                   Prisma-Singleton
├── config/model-prices.ts      Token-Preise (einzige Quelle)
├── prompts/*.yaml              KI-Prompts (nie im TypeScript-Code)
├── prisma/schema.prisma        DB-Schema
├── auth.ts                     Auth.js Konfiguration (Node.js)
├── auth.config.ts              Auth.js Konfiguration (Edge)
├── middleware.ts               Route-Schutz
└── plan.md                     Vollständiger Implementierungsplan v6.1
```

## Deployment

- **Repo:** `vysible/content`
- **Production:** `https://vysible.online` (Coolify auto-deploys on push to `main`)
- **DNS:** A-record `vysible.online` → VPS

## Konventionen

Folgt `~/Documents/Claude/Dev Ops/code-style-guide.md`:
- Deutsche UI-Texte, englische Code-Bezeichner
- Kein `var`, immer `const`/`let`
- `console.log('[Vysible]', ...)` mit Projekt-Prefix
- AES-256-GCM für alle API-Keys
- Kein PII in Logs — nur IDs

## Sicherheits-Constraints

- **API-Keys:** AES-256-GCM verschlüsselt, `encryptedKey` wird nie als Klartext zurückgegeben
- **Passwörter:** bcrypt 12 Rounds
- **Sessions:** JWT (1h) + Cookie maxAge 30 Tage, HTTP-only
- **Route-Schutz:** `middleware.ts` schützt alle Routen außer `/login` und `/api/auth/*`

## Phase-Übersicht

| Phase | Status | Nächster Schritt |
|---|---|---|
| **0** Foundation | ✅ | — |
| **1** Core MVP | 🔄 Slice 4 ✅ | **Slice 11 (Scraper-Service)** |
| **2** Collaboration | ⬜ | — |
| **3** Erweiterungen | ⬜ | — |
| **4** Quality & Scale | ⬜ | — |

Vollständiger Plan: `plan.md`
