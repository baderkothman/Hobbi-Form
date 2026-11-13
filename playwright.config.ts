import { defineConfig, devices } from "@playwright/test";

const PORT = 3210;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Browser submissions are mocked so tests never write to the real Sheet.
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      RATE_LIMIT_SECRET: "e2e-only-not-a-real-secret",
      GOOGLE_SHEET_ID: "",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "",
      GOOGLE_PRIVATE_KEY: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
