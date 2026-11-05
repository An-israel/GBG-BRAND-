// Screenshots interactive states: mobile menu sheet, basket drawer, filter drawer, sticky add-to-basket bar.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const server = spawn('node', [path.join(here, 'serve.mjs')], { env: { ...process.env, PORT: '4399' } });
await new Promise((r) => setTimeout(r, 600));
const base = 'http://localhost:4399';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 5'] });
const page = await ctx.newPage();
const shot = (n) => page.screenshot({ path: path.join(here, 'screens', `state-${n}.png`) });

await page.goto(`${base}/index`);
await page.getByRole('button', { name: 'Open menu' }).click();
await page.locator('#MenuSheet summary').first().click();
await page.waitForTimeout(400); await shot('menu-sheet');

await page.goto(`${base}/collection`);
await page.getByRole('button', { name: 'Filter' }).click();
await page.waitForTimeout(400); await shot('filter-drawer');

await page.goto(`${base}/cart-full`);
await page.evaluate(() => document.getElementById('CartDrawer').showModal());
await page.waitForTimeout(400); await shot('cart-drawer');

await page.goto(`${base}/product`);
await page.mouse.wheel(0, 1400);
await page.waitForTimeout(600); await shot('sticky-atc');

await page.goto(`${base}/product-electrical`);
await page.mouse.wheel(0, 500);
await page.waitForTimeout(400); await shot('product-electrical');

await browser.close();
server.kill();
console.log('states captured');
