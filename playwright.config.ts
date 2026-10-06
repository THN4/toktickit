import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Lab 2 End-to-End and Responsive tests
 */
export default defineConfig({
  testDir: './e2e',
  // Lab 2 browser tests still target the pre-auth requester selector, removed
  // when Lab 3 introduced server-backed sessions. Their API/component suites
  // remain covered; current browser regressions live in Lab 3/4.
  testIgnore: ['**/*.real.spec.ts', '**/lab-02/**'],
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: {
    command: 'npm.cmd --prefix client run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});

