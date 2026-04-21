import { defineConfig, devices } from "@playwright/test";

const apiPort = process.env.PLAYWRIGHT_API_PORT ?? "3011";
const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? "4173";
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://cuidarte:cuidarte_dev_password@localhost:5433/cuidarte";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: webBaseUrl,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @cuidarte/api start:e2e",
      url: `${apiBaseUrl}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
        PORT: apiPort,
        SESSION_COOKIE_NAME: "cuidarte_e2e_session",
        SESSION_TTL_DAYS: "1",
        WEB_ORIGIN: webBaseUrl,
      },
    },
    {
      command: `pnpm --filter @cuidarte/web exec vite --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: webBaseUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        VITE_API_URL: apiBaseUrl,
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
