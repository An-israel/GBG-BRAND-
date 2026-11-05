// Screenshots the offline preview at 360, 390, 768 and 1440px (brief §3.6).
// Usage: node tools/preview/render.mjs && node tools/preview/screenshots.mjs [page ...]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'out');
const shotDir = path.join(here, 'screens');
fs.mkdirSync(shotDir, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(outDir, p);
  if (!file.startsWith(outDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const port = server.address().port;

const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['index', 'collection', 'product', 'product-variants', 'product-electrical', 'product-collection-only', 'cart-full', 'cart', 'search-empty', '404', 'visit', 'faq', 'contact'];
const widths = [360, 390, 768, 1440];
const browser = await chromium.launch();
for (const name of pages) {
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: w < 800 ? 800 : 900 }, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${port}/${name}.html`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible')));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) console.warn(`  ! ${name} @${w}px overflows horizontally by ${overflow}px`);
    await page.screenshot({ path: path.join(shotDir, `${name}-${w}.png`), fullPage: true });
    await page.close();
  }
  console.log(`shot ${name}`);
}
await browser.close();
server.close();
