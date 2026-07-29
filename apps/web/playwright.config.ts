import { defineConfig, devices } from "@playwright/test";

const databasePath = ":memory:";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
    locale: "en-AU",
    permissions: ["clipboard-read", "clipboard-write"],
    screenshot: "only-on-failure",
    timezoneId: "Australia/Melbourne",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
        viewport: { height: 800, width: 320 },
      },
    },
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command:
      `npm run build:web && ` +
      `concurrently --kill-others --names api,web ` +
      `"SETTLEUP_DB=${databasePath} npm run dev:api:watch" ` +
      `"npm run preview --workspace @settleup/web -- --port 4173"`,
    cwd: "../..",
    port: 4173,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
