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

# Migrationen als root, dann Server als nextjs.
# P3009 (fehlgeschlagene Migration durch manuell angelegte Tabellen) wird automatisch aufgelöst.
CMD ["sh", "-c", "\
  echo '[Startup] DATABASE_URL gesetzt: '$([ -n \"$DATABASE_URL\" ] && echo 'ja' || echo 'NEIN — fehlt!'); \
  PRISMA='node node_modules/prisma/build/index.js'; \
  migrated=0; \
  for i in 1 2 3; do \
    echo \"[Startup] Migration Versuch $i/3...\"; \
    output=$($PRISMA migrate deploy 2>&1); \
    echo \"$output\"; \
    if echo \"$output\" | grep -qE 'No pending migrations|migrations found and applied|Migration OK'; then \
      echo '[Startup] Migration OK'; migrated=1; break; \
    elif echo \"$output\" | grep -q 'P3009'; then \
      failed=$(echo \"$output\" | grep -oE '[0-9]{14}_[a-zA-Z_]+' | head -1); \
      if [ -n \"$failed\" ]; then \
        echo \"[Startup] P3009 — markiere '$failed' als applied...\"; \
        $PRISMA migrate resolve --applied \"$failed\" 2>&1; \
      fi; \
    elif ! echo \"$output\" | grep -qE 'Error|failed'; then \
      echo '[Startup] Migration OK'; migrated=1; break; \
    fi; \
    echo \"[Startup] Migration fehlgeschlagen (Versuch $i), warte 5s...\"; sleep 5; \
  done; \
  if [ \"$migrated\" = \"0\" ]; then \
    echo '[Startup] FATAL: Migration nach 3 Versuchen fehlgeschlagen'; \
    exit 1; \
  fi; \
  echo '[Startup] Starte Next.js Server...'; \
  exec su-exec nextjs node server.js"]
