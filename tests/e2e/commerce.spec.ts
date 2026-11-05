/**
 * Commerce flows – these need the real store (PREVIEW_URL) with test data:
 *   SOLD_OUT_PRODUCT_PATH       e.g. /products/sold-out-test-item
 *   COLLECTION_ONLY_PRODUCT_PATH e.g. /products/large-storage-box
 * Checkout itself (card payment, pickup-only rates) is verified by hand with the Bogus Gateway;
 * see docs/ACCEPTANCE_TESTS.md. These tests stop at the start of checkout.
 */
import { expect, test } from '@playwright/test';
import { LIVE, unlockStorefront, url } from './helpers.js';

test.skip(!LIVE, 'needs PREVIEW_URL (real Shopify preview theme)');
test.beforeEach(async ({ page }) => unlockStorefront(page));

test('home → collection → filter → product → add to basket → checkout start', async ({ page }) => {
  await page.goto(url('/'));
  await page.getByRole('link', { name: /Shop All Bargains/ }).click();
  await expect(page.locator('.collection__count')).toContainText(/product/);
  const filterBtn = page.getByRole('button', { name: 'Filter' });
  if (await filterBtn.count()) {
    await filterBtn.click();
    const box = page.locator('#FacetsDrawer input[type="checkbox"]:not([disabled])').first();
    if (await box.count()) {
      await box.check();
      await page.getByRole('button', { name: 'Show results' }).click();
      await expect(page.locator('.facets__active')).toBeVisible();
    } else {
      await page.keyboard.press('Escape');
    }
  }
  const available = page.locator('.card:not(.card--sold-out) a.card__link').first();
  await available.click();
  await page.locator('[data-add-button]').click();
  await expect(page.locator('#CartDrawer')).toBeVisible();
  await expect(page.locator('[data-cart-count]').first()).not.toHaveText('0');
  await page.getByRole('button', { name: /Checkout securely/ }).click();
  await page.waitForURL(/checkouts?|\/checkout/);
});

test('search finds products', async ({ page }) => {
  await page.goto(url('/search?q=bag'));
  await expect(page.locator('.collection__count')).toContainText(/result/);
});

test('predictive search suggests products', async ({ page }) => {
  await page.goto(url('/'));
  await page.locator('#HeaderSearch').fill('ba');
  await expect(page.locator('[data-predictive-results]')).toBeVisible({ timeout: 10_000 });
});

test('sold-out one-off cannot be added', async ({ page }) => {
  test.skip(!process.env.SOLD_OUT_PRODUCT_PATH, 'set SOLD_OUT_PRODUCT_PATH');
  await page.goto(url(process.env.SOLD_OUT_PRODUCT_PATH!));
  await expect(page.locator('[data-add-button]')).toBeDisabled();
  await expect(page.locator('[data-stock]')).toHaveText(/Sold out/);
  const res = await page.request.post(url('/cart/add.js'), { form: { id: await page.locator('[data-variant-id]').inputValue(), quantity: '1' } });
  expect(res.status()).toBe(422);
});

test('collection-only product is labelled', async ({ page }) => {
  test.skip(!process.env.COLLECTION_ONLY_PRODUCT_PATH, 'set COLLECTION_ONLY_PRODUCT_PATH');
  await page.goto(url(process.env.COLLECTION_ONLY_PRODUCT_PATH!));
  await expect(page.locator('.fulfil--collection')).toContainText(/Collection only/);
});

test('analytics pixels do not fire before cookie consent', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-GB', timezoneId: 'Europe/London' });
  const page = await context.newPage();
  const tracking: string[] = [];
  page.on('request', (r) => { if (/google-analytics\.com|googletagmanager\.com\/g\/collect|facebook\.com\/tr|analytics\.tiktok\.com/.test(r.url())) tracking.push(r.url()); });
  await unlockStorefront(page);
  await page.goto(url('/'));
  await page.waitForTimeout(4000);
  expect(tracking, 'tracking fired before consent').toHaveLength(0);
  await context.close();
});
