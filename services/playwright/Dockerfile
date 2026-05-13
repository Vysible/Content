# Offizielles Playwright-Image mit Chromium vorinstalliert
FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src/ ./src/
RUN npx tsc

EXPOSE 3001
ENV PORT=3001
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
