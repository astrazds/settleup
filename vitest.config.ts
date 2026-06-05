import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/server.ts',
        'src/ui/generated-client.ts',
        'dist/**',
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
