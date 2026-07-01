import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration
 */
export default defineConfig({
  testDir: '.',
  testMatch: ['tests.spec.ts'],
  fullyParallel: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.APP_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
