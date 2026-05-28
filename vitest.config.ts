import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      'cloudflare:workers': fileURLToPath(new URL('./test/cloudflare-workers.ts', import.meta.url))
    }
  },
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'worker-configuration.d.ts',
        'dist-dry-run/**',
        'docs/**'
      ],
      thresholds: {
        statements: 84,
        branches: 62,
        functions: 87,
        lines: 84
      }
    }
  }
})
