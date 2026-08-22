import { defineConfig, devices } from '@playwright/test';

const isContinuousIntegration = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isContinuousIntegration,
  reporter: isContinuousIntegration ? 'line' : 'list',
  retries: isContinuousIntegration ? 2 : 0,
  timeout: 15_000,
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  ...(isContinuousIntegration ? { workers: 1 } : {}),
  projects: [
    {
      name: 'chromium',
      use: devices['Desktop Chrome'],
    },
  ],
});
