import type { Page } from '@playwright/test';

export const LIVE = !!process.env.PREVIEW_URL;
/** Path helper: on the real store keep ?preview_theme_id=… from PREVIEW_URL; offline uses static .html files. */
export function url(path: string, offline?: string): string {
  if (!LIVE) return offline ?? path;
  const u = new URL(process.env.PREVIEW_URL!);
  const target = new URL(path, u.origin);
  u.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  return target.toString();
}

export async function unlockStorefront(page: Page) {
  if (!LIVE || !process.env.STOREFRONT_PASSWORD) return;
  await page.goto(url('/password'));
  if (await page.locator('input[name="password"]').count()) {
    await page.locator('summary').first().click().catch(() => {});
    await page.fill('input[name="password"]', process.env.STOREFRONT_PASSWORD);
    await page.locator('form button[type="submit"]').first().click();
  }
}
