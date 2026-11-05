import { expect, test } from '@playwright/test';
import { LIVE, unlockStorefront, url } from './helpers.js';

test.beforeEach(async ({ page }) => unlockStorefront(page));

test('home page shows brand, hero and categories', async ({ page }) => {
  await page.goto(url('/', '/index'));
  await expect(page.locator('h1')).toContainText('Big bargains');
  await expect(page.getByRole('link', { name: /Shop All Bargains/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Visit Our Shop/ }).first()).toBeVisible();
});

test('no "DBS" text on any key page (brand crawler)', async ({ page }) => {
  const paths = LIVE ? ['/', '/collections/all', '/search?q=bag', '/cart', '/pages/visit-our-shop', '/pages/faqs', '/pages/contact', '/404-check']
    : ['/index', '/collection', '/product', '/cart', '/search-empty', '/visit', '/faq', '/contact', '/404'];
  const seen = new Set<string>();
  for (const p of paths) {
    await page.goto(url(p, p));
    const text = await page.locator('body').innerText();
    expect(text, `DBS found on ${p}`).not.toMatch(/\bDBS\b|GBG Wholesale Hub/i);
    const title = await page.title();
    expect(title).not.toMatch(/\bDBS\b/i);
    // Crawl one level of internal links on the home page
    if (p === paths[0] && LIVE) {
      for (const href of await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!))) {
        if (seen.size > 40 || seen.has(href) || href.startsWith('/cart') || href.startsWith('/account')) continue;
        seen.add(href);
        const res = await page.request.get(url(href));
        expect(await res.text(), `DBS found on ${href}`).not.toMatch(/>[^<]*\bDBS\b[^<]*</i);
      }
    }
  }
});

test('mobile menu opens as a bottom sheet and closes', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto(url('/', '/index'));
  await page.getByRole('button', { name: 'Open menu' }).click();
  const sheet = page.locator('#MenuSheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'New Arrivals' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
});

test('empty collections are hidden from navigation', async ({ page }) => {
  await page.goto(url('/', '/index'));
  const hrefs = await page.locator('header a[href*="/collections/"], #MenuSheet a[href*="/collections/"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')));
  if (!LIVE) {
    // Mock data: Beauty, Travel, Men's/Kids' shoes and Bracelets have no products.
    for (const empty of ['beauty-personal-care', 'travel', 'mens-shoes', 'kids-shoes', 'bracelets']) {
      expect(hrefs.some((h) => h?.endsWith(`/collections/${empty}`))).toBe(false);
    }
    return;
  }
  for (const h of [...new Set(hrefs)].slice(0, 30)) {
    const res = await page.request.get(url(`${h}/products.json?limit=1`));
    const body = await res.json();
    expect(body.products.length, `${h} is empty but linked in the menu`).toBeGreaterThan(0);
  }
});

test('newsletter has clear consent wording and no pre-ticked box', async ({ page }) => {
  await page.goto(url('/', '/index'));
  const form = page.locator('form.newsletter-form').first();
  await expect(form).toContainText(/agree to receive marketing emails/i);
  await expect(form).toContainText(/unsubscribe at any time/i);
  expect(await form.locator('input[type="checkbox"]:checked').count()).toBe(0);
});

test('tap targets in the header are at least 44px', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto(url('/', '/index'));
  for (const name of ['Open menu', /Basket/]) {
    const box = await page.getByRole(name === 'Open menu' ? 'button' : 'link', { name }).first().boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
});

test('no horizontal scrolling on any page', async ({ page }) => {
  for (const p of LIVE ? ['/', '/collections/all', '/cart'] : ['/index', '/collection', '/product', '/cart-full', '/visit']) {
    await page.goto(url(p, p));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${p} scrolls sideways`).toBeLessThanOrEqual(0);
  }
});

test('product page has price, condition, structured data and honest stock', async ({ page }) => {
  await page.goto(LIVE ? url('/collections/all') : '/product');
  if (LIVE) await page.locator('a.card__link').first().click();
  await expect(page.locator('.product__title')).toBeVisible();
  await expect(page.locator('[data-product-price] .price')).toContainText('£');
  await expect(page.locator('[data-stock]')).toHaveText(/In stock|Only 1 left|Sold out/);
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  const product = ld.map((t) => JSON.parse(t)).find((j) => j['@type'] === 'Product');
  expect(product).toBeTruthy();
  expect(product.offers[0].priceCurrency).toBe('GBP');
  expect(product.offers[0].itemCondition).toMatch(/schema.org\/(New|Used)Condition/);
});

test('the map does not load until asked (no third-party request before consent)', async ({ page }) => {
  const google: string[] = [];
  page.on('request', (r) => { if (/google\.com\/maps/.test(r.url())) google.push(r.url()); });
  await page.goto(url('/pages/visit-our-shop', '/visit'));
  await page.waitForTimeout(500);
  expect(google).toHaveLength(0);
  await page.getByRole('button', { name: 'Show map' }).click();
  await expect(page.locator('[data-map] iframe')).toHaveAttribute('src', /google\.com\/maps/);
});

test('empty search has a helpful on-brand state', async ({ page }) => {
  await page.goto(url('/search?q=zzzxxyy-no-results', '/search-empty'));
  await expect(page.getByRole('heading', { name: 'No results found' })).toBeVisible();
  await expect(page.locator('.empty-state__actions a').first()).toBeVisible();
});

test('sticky add-to-basket bar appears once the main button scrolls away', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto(LIVE ? url('/collections/all') : '/product');
  if (LIVE) await page.locator('.card:not(.card--sold-out) a.card__link').first().click();
  const bar = page.locator('[data-sticky-atc]');
  await expect(bar).not.toHaveClass(/is-visible/);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(bar).toHaveClass(/is-visible/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).not.toHaveClass(/is-visible/);
});
