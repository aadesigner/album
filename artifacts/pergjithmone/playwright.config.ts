import { defineConfig, devices } from '@playwright/test';

// When running in the Replit environment, use the pre-installed Chromium
// binary that ships with the workspace instead of Playwright's own download.
if (process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH =
    process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE;
}

// The base URL must point at the running pergjithmone dev server.
// Set PLAYWRIGHT_BASE_URL in the environment before running the suite,
// e.g.:  PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm test:e2e
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
