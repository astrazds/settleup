import { defineConfig, devices } from "@playwright/test";

const visualSnapshots = !process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
    locale: "en-AU",
    screenshot: "only-on-failure",
    timezoneId: "Australia/Melbourne",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      metadata: { visualSnapshots },
      use: {
        ...devices["Pixel 7"],
        permissions: ["clipboard-read", "clipboard-write"],
        viewport: { height: 800, width: 320 },
      },
    },
    {
      name: "desktop-chromium",
      metadata: { visualSnapshots },
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    {
      name: "desktop-firefox",
      metadata: { visualSnapshots: false },
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    {
      name: "mobile-webkit",
      metadata: { visualSnapshots: false },
      use: {
        ...devices["iPhone 13"],
      },
    },
  ],
  webServer: [
    {
      command: process.env.SETTLEUP_PREBUILT === "1" ? "npm start" : "npm run build:all && npm start",
      cwd: "../..",
      env: { SETTLEUP_DB: ":memory:", PORT: "8787" },
      port: 8787,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: "npm run preview -- --port 4173 --strictPort",
      port: 4173,
      reuseExistingServer: false,
    },
  ],
});
