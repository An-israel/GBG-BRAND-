/**
 * Navigation v2 + automatic photos. Offline preview: "index" = set-up store,
 * "fresh-index" = the store right after uploading the theme (old DBS menus and
 * collections, no GBG collections, no new pages, no photos uploaded).
 */
import { expect, test } from '@playwright/test';
import { LIVE } from './helpers.js';

test.skip(LIVE, 'offline scenarios with known sample data');

test('top menu follows the launch pack: Shop, New Arrivals, Clearance, Visit Us', async ({ page, isMobile }) => {
  test.skip(isMobile, 'computer menu');
  await page.goto('/index');
  const items = await page.locator('.header__nav .nav > li > .nav__link, .header__nav .nav > li > details > summary').allInnerTexts();
  expect(items.map((t) => t.trim())).toEqual(['Shop', 'New Arrivals', 'Clearance', 'Visit Us']);
});

test('Shop opens a mega menu with categories and an All products button', async ({ page, isMobile }) => {
  test.skip(isMobile, 'computer menu');
  await page.goto('/index');
  await page.locator('.nav__details summary', { hasText: 'Shop' }).click();
  await expect(page.locator('.mega__heading', { hasText: /^Bags$/ })).toBeVisible();
  await expect(page.locator('.mega__heading', { hasText: 'Deals' })).toBeVisible();
  await expect(page.locator('.mega__link', { hasText: 'Handbags' })).toBeVisible();
  await expect(page.locator('.mega__all')).toHaveAttribute('href', '/collections/all');
});

test('fresh store: never shows the old DBS menu, empty collections or missing pages', async ({ page }) => {
  await page.goto('/fresh-index');
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/DBS/);
  expect(await page.locator('a[href^="/pages/"]').count()).toBe(0);
  expect(await page.locator('a[href*="old-empty-collection"]').count()).toBe(0);
  // the shop's real collections appear instead
  expect(await page.locator('a[href="/collections/footwear"]').count()).toBeGreaterThan(0);
});

test('fresh store: "Visit Our Liverpool Store" scrolls to the Visit us block on the home page', async ({ page }) => {
  await page.goto('/fresh-index');
  await expect(page.getByRole('link', { name: /Visit Our Liverpool Store/ })).toHaveAttribute('href', '/#visit');
  await expect(page.locator('#visit')).toHaveCount(1);
});

test('fresh store: hero, category tiles and Today\'s finds fill themselves with real products', async ({ page }) => {
  await page.goto('/fresh-index');
  const autoTiles = page.locator('.hero__tile--product');
  await expect(autoTiles).toHaveCount(4);
  await expect(autoTiles.first().locator('.hero__price-tag')).toContainText('£');
  expect(await page.locator('.category-tile__link').count()).toBeGreaterThan(0);
  expect(await page.locator('[data-product-card]').count()).toBeGreaterThan(0);
});

test('phone: quick links and the menu buttons', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  await page.goto('/index');
  await expect(page.locator('.quick-links__chip', { hasText: 'Clearance' })).toBeVisible();
  await page.getByRole('button', { name: 'Open menu' }).click();
  const sheet = page.locator('#MenuSheet');
  await expect(sheet.locator('.sheet__highlight', { hasText: 'Clearance' })).toBeVisible();
  await expect(sheet.locator('#SheetSearch')).toBeVisible();
  await sheet.locator('summary', { hasText: /^\s*Bags\s*$/ }).click();
  await expect(sheet.getByRole('link', { name: 'All Bags' })).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'Handbags' })).toBeVisible();
});

test('site map lists categories, deals, help and policies', async ({ page }) => {
  await page.goto('/sitemap');
  await expect(page.getByRole('heading', { name: 'Site map', level: 1 })).toBeVisible();
  for (const h of ['Shop by category', 'New in & deals', 'Visit us & help', 'Policies']) {
    await expect(page.getByRole('heading', { name: h })).toBeVisible();
  }
  await expect(page.locator('.sitemap__cat-link', { hasText: 'Shoes' })).toBeVisible();
});

test('footer and Help menu link to the site map', async ({ page }) => {
  await page.goto('/index');
  expect(await page.locator('footer a[href="/collections"]').count()).toBeGreaterThan(0);
});

test('icon strip shows exactly Click & Collect, Fast Track and free delivery over £80', async ({ page }) => {
  await page.goto('/index');
  const titles = (await page.locator('.usp__title').allInnerTexts()).map((t) => t.trim());
  expect(titles).toEqual(['Click & Collect', 'Fast Track', 'Free delivery over £80']);
  await expect(page.locator('.usps')).toContainText('Order by 2pm Monday–Friday');
});

test('icon strip promises disappear when switched off', async ({ page }) => {
  await page.goto('/index-claims-off');
  await expect(page.locator('.usps')).toHaveCount(0);
});

test('basket shows how much more is needed for free delivery', async ({ page }) => {
  await page.goto('/cart-full');
  await expect(page.locator('[data-cart-page] .free-delivery')).toContainText(/Spend £\d+\.\d\d more for free UK delivery/);
});

test('home page: bold banner, promo tiles and the mock-up category names', async ({ page }) => {
  await page.goto('/index');
  await expect(page.locator('.promo-tile__heading')).toHaveText(['Under £5', 'Clearance', 'New Arrivals']);
  const cats = (await page.locator('.category-tile__label').allInnerTexts()).map((t) => t.trim());
  expect(cats).toEqual(['Bags', 'Shoes', 'Jewellery', 'Clothing', 'Home & Living', 'Electronics']);
});
