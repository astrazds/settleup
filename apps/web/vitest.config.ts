import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["app/**/*.test.{ts,tsx}"],
    setupFiles: ["./app/test/setup.ts"],
  },
});
