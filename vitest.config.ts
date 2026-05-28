import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      'cloudflare:workers': fileURLToPath(new URL('./test/cloudflare-workers.ts', import.meta.url))
    }
  },
  test: {
    include: ['src/**/*.test.ts']
  }
})
