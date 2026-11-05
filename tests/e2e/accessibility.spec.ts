import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { LIVE, unlockStorefront, url } from './helpers.js';

test.beforeEach(async ({ page }) => unlockStorefront(page));

const pages = LIVE
  ? ['/', '/collections/all', '/cart', '/search?q=bag', '/pages/visit-our-shop', '/pages/contact']
  : ['/index', '/collection', '/product', '/product-variants', '/cart-full', '/search-empty', '/visit', '/faq', '/contact', '/404'];

for (const p of pages) {
  test(`WCAG 2.2 AA – ${p}`, async ({ page }) => {
    await page.goto(url(p, p));
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible')));
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .exclude('#shopify-pc__banner') // Shopify's own cookie banner
      .analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''));
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`)).toEqual([]);
  });
}
