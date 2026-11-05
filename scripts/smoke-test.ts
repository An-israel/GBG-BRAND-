/**
 * Post-deploy health check (ENGINEERING #56). Hits key pages on the live domain or a
 * preview URL and checks status, key elements and that "DBS" never appears.
 *
 *   SMOKE_BASE_URL=https://www.gbgbargainshop.co.uk npm run smoke
 *   npm run smoke -- --base "https://xxxx.myshopify.com" --preview-theme 123456789
 */
import { parseArgs } from './lib/args.js';
import { createLogger } from './lib/logger.js';

const args = parseArgs();
const base = String(args.flags.base || process.env.SMOKE_BASE_URL || 'https://www.gbgbargainshop.co.uk').replace(/\/$/, '');
const theme = args.flags['preview-theme'] ? `preview_theme_id=${args.flags['preview-theme']}` : '';
const log = createLogger('smoke-test');
const withTheme = (p: string) => (theme ? `${p}${p.includes('?') ? '&' : '?'}${theme}` : p);

interface Check { name: string; path: string; expect: RegExp[] }
const checks: Check[] = [
  { name: 'Home', path: '/', expect: [/<header class="header"/, /GBG/i] },
  { name: 'All products', path: '/collections/all', expect: [/class="product-grid"|No products match/] },
  { name: 'Search', path: '/search?q=bag', expect: [/search-page/] },
  { name: 'Cart', path: '/cart', expect: [/Your basket/] },
  { name: 'Sitemap', path: '/sitemap.xml', expect: [/<sitemapindex|<urlset/] },
  { name: 'Robots', path: '/robots.txt', expect: [/Sitemap:/i] },
];

async function get(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'GBG-smoke-test/1.0' } });
    return { status: res.status, body: await res.text(), ms: Date.now() - start };
  } finally { clearTimeout(t); }
}

async function main() {
  let failures = 0;
  // Discover one product URL from the catalogue so the product page is tested too.
  const all = await get(base + withTheme('/products.json?limit=1')).catch(() => null);
  const handle = all && all.status === 200 ? JSON.parse(all.body).products?.[0]?.handle : null;
  if (handle) checks.splice(2, 0, { name: 'Product', path: `/products/${handle}`, expect: [/data-product-form|product-form/, /application\/ld\+json/] });
  for (const c of checks) {
    const url = base + withTheme(c.path);
    try {
      const r = await get(url);
      const problems: string[] = [];
      if (r.status !== 200) problems.push(`HTTP ${r.status}`);
      for (const re of c.expect) if (!re.test(r.body)) problems.push(`missing ${re}`);
      if (/\bDBS\b/.test(r.body.replace(/<script[\s\S]*?<\/script>/g, ''))) problems.push('"DBS" found on page');
      if (problems.length) { failures++; log.error(`✗ ${c.name} ${url} – ${problems.join('; ')}`); } else log.info(`✓ ${c.name} (${r.ms}ms)`);
    } catch (e: any) { failures++; log.error(`✗ ${c.name} ${url} – ${e.message}`); }
  }
  log.info(failures ? `${failures} check(s) failed` : 'All smoke checks passed');
  process.exit(failures ? 1 : 0);
}
main();
