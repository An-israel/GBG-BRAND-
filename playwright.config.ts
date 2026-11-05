import { defineConfig, devices } from '@playwright/test';

/**
 * PREVIEW_URL set   → tests run against the Shopify preview theme (full suite, incl. cart/checkout).
 * PREVIEW_URL unset → tests run against the offline design preview (layout, a11y, content rules only).
 */
const preview = process.env.PREVIEW_URL;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: preview || 'http://localhost:4321', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile-android', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-iphone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: preview ? undefined : { command: 'node tools/preview/render.mjs && node tools/preview/serve.mjs', url: 'http://localhost:4321', reuseExistingServer: true },
});
