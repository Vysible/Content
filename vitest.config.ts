import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['__tests__/setup.ts'],
    exclude: ['__tests__/e2e/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Nur Module, für die Tests vorhanden sind (Sprint 2 Baseline).
      // Nach jedem Sprint mit neuen Testmodulen erweitern.
      include: [
        'lib/crypto/aes.ts',
        'lib/generation/themes-schema.ts',
        'lib/compliance/hwg-gate.ts',
        'lib/utils/retry.ts',
        'app/api/generate/start/route.ts',
      ],
      exclude:    ['**/*.d.ts'],
      thresholds: { lines: 60, functions: 60, branches: 60 },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
