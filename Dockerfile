FROM node:20-alpine AS base
RUN corepack enable pnpm

# Abhängigkeiten installieren
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm prisma generate
RUN pnpm build

# Produktions-Image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Standalone-Output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma für Migrationen
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
