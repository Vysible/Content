# cache-bust: 2026-06-20
FROM node:20-alpine AS base
RUN corepack enable pnpm

# Abhängigkeiten installieren + Prisma Client generieren
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json pnpm-lock.yaml* .npmrc* ./
COPY prisma ./prisma
RUN pnpm install --no-frozen-lockfile
RUN pnpm prisma generate

# Build
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS="--max-old-space-size=1536"
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# Produktions-Image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl su-exec && \
    addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Standalone-Output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# YAML-Prompts und Templates (werden von loadPrompt via fs.readFileSync gelesen)
COPY --from=builder /app/prompts ./prompts
COPY --from=builder /app/templates ./templates

# Prisma für Migrationen
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma

EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"

# Migrationen als root, dann Server als nextjs
# Prisma migrate deploy mit Retry (DB evtl. noch nicht bereit). Exit 1 wenn alle Versuche fehlschlagen.
CMD ["sh", "-c", "\
  echo '[Startup] DATABASE_URL gesetzt: '$([ -n \"$DATABASE_URL\" ] && echo 'ja' || echo 'NEIN — fehlt!'); \
  migrated=0; \
  for i in 1 2 3; do \
    echo \"[Startup] Migration Versuch $i/3...\"; \
    node node_modules/prisma/build/index.js migrate deploy 2>&1 \
      && echo '[Startup] Migration OK' && migrated=1 && break; \
    echo \"[Startup] Migration fehlgeschlagen (Versuch $i), warte 5s...\"; sleep 5; \
  done; \
  if [ \"$migrated\" = \"0\" ]; then \
    echo '[Startup] FATAL: Migration nach 3 Versuchen fehlgeschlagen'; \
    exit 1; \
  fi; \
  echo '[Startup] Starte Next.js Server...'; \
  exec su-exec nextjs node server.js"]
