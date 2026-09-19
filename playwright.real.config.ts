import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/lab-03",
  testMatch: /\.real\.spec\.ts$/,
  timeout: 45_000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-real" }]],
  globalSetup: "./e2e/lab-03/real.global-setup.ts",
  use: { baseURL: "http://localhost:5173", trace: "on-first-retry", screenshot: "only-on-failure" },
  projects: [{ name: "real-desktop-chrome", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } }],
  webServer: [
    { command: "npm.cmd --prefix server run dev", url: "http://localhost:3000/api/health", reuseExistingServer: !process.env.CI, timeout: 30_000 },
    { command: "npm.cmd --prefix client run dev -- --port 5173", url: "http://localhost:5173", reuseExistingServer: !process.env.CI, timeout: 30_000 },
  ],
});
