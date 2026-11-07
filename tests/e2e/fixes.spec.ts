/**
 * Regression tests for the inspection-report fixes (docs/INSPECTION_REPORT.md).
 * Offline preview only – they use known sample data and simulated Shopify responses.
 */
import { expect, test } from '@playwright/test';
import { LIVE } from './helpers.js';

test.skip(LIVE, 'offline regression tests (sample data)');

const drawer = (count: number) => `<div id="CartDrawerContents" data-cart-contents data-count="${count}">${count ? '<p>items</p>' : '<div class="empty-state"><h2>Your basket is empty</h2></div>'}</div>`;

test('#5 delivery and collection claims are hidden when switched off', async ({ page }) => {
  await page.goto('/product-claims-off');
  await expect(page.locator('.product__fulfilment')).not.toContainText('UK delivery');
  await expect(page.locator('.product__tax')).toHaveCount(0); // #11 no VAT line without a VAT number
  await page.goto('/index-claims-off');
  await expect(page.locator('.visit')).not.toContainText('Click & Collect');
  await page.goto('/product');
  await expect(page.locator('.product__fulfilment')).toContainText('UK delivery'); // shown when switched on
});

test('#8 several announcements take turns on phones', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  await page.route('**/index', async (r) => {
    const res = await r.fetch();
    let body = await res.text();
    body = body.replace('class="announcement"', 'class="announcement announcement--multi"')
      .replace(/(<p class="announcement__msg is-active"[\s\S]*?<\/p>)/, '$1<p class="announcement__msg">Second message</p><p class="announcement__msg">Third message</p>')
      .replace('<div class="announcement__msgs" aria-live="off">', '<div class="announcement__msgs" aria-live="off">')
      .replace(/(<\/div>\s*<\/div>\s*<\/div>\s*<div id="shopify-section-header")/, '<button type="button" class="announcement__next" data-announcement-next aria-label="Show next announcement">›</button>$1');
    await r.fulfill({ response: res, body });
  });
  await page.goto('/index');
  const visible = () => page.locator('.announcement__msg:visible');
  await expect(visible()).toHaveCount(1);
  const first = await visible().innerText();
  await page.getByRole('button', { name: 'Show next announcement' }).click();
  await expect(visible()).toHaveCount(1);
  expect(await visible().innerText()).not.toBe(first);
});

test('#9 "Forgotten your password?" opens the reset box', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('#recover')).toBeHidden();
  await page.getByRole('link', { name: 'Forgotten your password?' }).click();
  await expect(page.locator('#recover')).toBeVisible();
  await expect(page.locator('#recover input[type=email]')).toBeFocused();
});

test('#10 saved address country is pre-selected', async ({ page }) => {
  await page.route('**/index', async (r) => {
    const res = await r.fetch();
    const body = (await res.text()).replace('<main id="MainContent"', '<select id="TestCountry" data-default="United Kingdom"><option value="Afghanistan">Afghanistan</option><option value="United Kingdom">United Kingdom</option></select><main id="MainContent"');
    await r.fulfill({ response: res, body });
  });
  await page.goto('/index');
  await expect(page.locator('#TestCountry')).toHaveValue('United Kingdom');
});

test('#16 search sort offers only what Shopify search supports, with full labels', async ({ page }) => {
  await page.goto('/search-results');
  const opts = await page.locator('#SortBy option').allInnerTexts();
  expect(opts).toEqual(['Most relevant', 'Price: low to high', 'Price: high to low']);
});

test('#17 load more keeps the page address', async ({ page }) => {
  await page.route('**/collection?page=2*', (r) => r.fulfill({ contentType: 'text/html', body: '<ul id="ProductGrid-main"><li class="product-grid__item"><article class="card"><a class="card__link" href="/x">New A</a></article></li></ul>' }));
  await page.goto('/collection');
  await page.evaluate(() => {
    const grid = document.querySelector('[data-product-grid]')!; grid.id = 'ProductGrid-main';
    const wrap = document.createElement('div'); wrap.setAttribute('data-load-more-wrap', '');
    wrap.innerHTML = '<a href="/collection?page=2" data-load-more data-grid="ProductGrid-main" data-section="main">Load more</a>';
    grid.after(wrap);
  });
  await page.locator('[data-load-more]').click();
  await expect(page.locator('#ProductGrid-main > li')).toHaveCount(4);
  expect(new URL(page.url()).search).toBe('');
});

test('#18 emptied basket hides "Continue shopping"', async ({ page }) => {
  await page.route('**/cart/change.js', (r) => r.fulfill({ json: { sections: { 'cart-drawer': drawer(0) } } }));
  await page.goto('/cart-full');
  await page.locator('[data-cart-page] [data-remove]').first().click();
  await expect(page.locator('.cart-page__continue')).toBeHidden();
});

test('#19 fast double tap on + adds up to one request for the final quantity', async ({ page }) => {
  const sent: number[] = [];
  await page.route('**/cart/change.js', async (r) => { sent.push(JSON.parse(r.request().postData()!).quantity); await r.fulfill({ json: { sections: { 'cart-drawer': drawer(3) } } }); });
  await page.goto('/cart-full');
  const plus = page.locator('[data-cart-page] [data-qty-change="1"]').first();
  await plus.click(); await plus.click();
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0]).toBe(3);
});

test('#23 desktop menus open on hover', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop only');
  await page.goto('/index');
  await page.locator('.nav__details summary').first().hover();
  await expect(page.locator('.nav__details[open]')).toHaveCount(1);
  await page.mouse.move(700, 600);
  await expect(page.locator('.nav__details[open]')).toHaveCount(0);
});

test('#36 size picker: sold-out size disables the button, another size re-enables it', async ({ page }) => {
  await page.goto('/product-variants');
  await page.locator('label.option__label', { hasText: /^\s*6/ }).click();
  await expect(page.locator('[data-add-button]')).toBeDisabled();
  await expect(page.locator('[data-stock]')).toHaveText(/Sold out/);
  await page.locator('label.option__label', { hasText: /^\s*7/ }).click();
  await expect(page.locator('[data-add-button]')).toBeEnabled();
  await expect(page).toHaveURL(/variant=/);
});

test('#38 desktop: filters are a sidebar and a tick applies at once', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop only');
  await page.goto('/collection');
  const panel = page.locator('#FacetsDrawer');
  await expect(panel).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filter' })).toBeHidden();
  const box = panel.locator('input[type=checkbox]:not([disabled])').first();
  const [req] = await Promise.all([page.waitForRequest((r) => r.url().includes('filter.')), box.check()]);
  expect(req.url()).toContain('filter.');
});

test('#38 phones: filters stay in the pop-out drawer', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  await page.goto('/collection');
  await expect(page.locator('#FacetsDrawer')).toBeHidden();
  await page.getByRole('button', { name: 'Filter' }).click();
  await expect(page.locator('#FacetsDrawer')).toBeVisible();
});

test('#19 tapping + then Remove straight away never brings the item back', async ({ page }) => {
  const sent: number[] = [];
  await page.route('**/cart/change.js', async (r) => { sent.push(JSON.parse(r.request().postData()!).quantity); await r.fulfill({ json: { sections: { 'cart-drawer': drawer(0) } } }); });
  await page.goto('/cart-full');
  await page.locator('[data-cart-page] [data-qty-change="1"]').first().click();
  await page.locator('[data-cart-page] [data-remove]').first().click();
  await page.waitForTimeout(700);
  expect(sent).toEqual([0]);
});

test('#7 browser also hides a message once its (normalised) end date has passed', async ({ page }) => {
  await page.route('**/index', async (r) => {
    const res = await r.fetch();
    const body = (await res.text()).replace('class="announcement__msg is-active"', 'class="announcement__msg is-active" data-end="2020-01-01"');
    await r.fulfill({ response: res, body });
  });
  await page.goto('/index');
  await expect(page.locator('.announcement')).toHaveCount(0);
});
