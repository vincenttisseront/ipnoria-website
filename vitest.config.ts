import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests unitaires du code sans Nuxt (schéma partagé, migrations). Les pages sont couvertes par tests/smoke.mjs.
export default defineConfig({
  resolve: { alias: { '#shared': fileURLToPath(new URL('./shared', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['shared/**', 'server/utils/migrate.ts', 'server/utils/markdown.ts', 'server/utils/changelog.ts', 'server/utils/booking-core.ts', 'server/utils/account-*.ts', 'server/utils/references.ts', 'server/utils/pow-core.ts', 'server/utils/og-core.ts', 'server/utils/carousel-core.ts'],
    },
  },
})
