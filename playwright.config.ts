import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  workers: 1,
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  webServer: {
    command: 'SETTLEUP_DATABASE_PATH=.data/smoke.sqlite npm run dev -- --port 8791',
    url: 'http://127.0.0.1:8791',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  use: {
    baseURL: 'http://127.0.0.1:8791',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'critical',
      testMatch: /event-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'extended',
      testMatch: /realtime-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
