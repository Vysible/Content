# Offizielles Playwright-Image mit Chromium vorinstalliert
FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src/ ./src/

EXPOSE 3001
ENV PORT=3001

CMD ["npx", "ts-node", "src/index.ts"]
