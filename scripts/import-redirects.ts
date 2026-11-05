/**
 * Creates URL redirects from redirects/redirects.csv (columns: "Redirect from","Redirect to").
 * Idempotent: existing redirects for the same path are left alone. Same format as Shopify's
 * bulk redirect CSV import, so the file can also be uploaded in admin (Online Store → Navigation → URL redirects).
 *
 *   npm run redirects -- [redirects/redirects.csv] [--dry-run]
 */
import { parseArgs } from './lib/args.js';
import { loadConfig } from './lib/config.js';
import { readCsv } from './lib/csv.js';
import { createLogger } from './lib/logger.js';
import { ShopifyClient, checkUserErrors } from './lib/shopify.js';

const args = parseArgs();
const file = args.positional[0] || 'redirects/redirects.csv';
const log = createLogger('import-redirects');
const client = new ShopifyClient(loadConfig(), { dryRun: args.dryRun, logger: log });

async function main() {
  const existing = new Set<string>();
  for await (const r of client.paginate<any>(`query($after: String) { urlRedirects(first: 250, after: $after) { pageInfo { hasNextPage endCursor } edges { node { path } } } }`, ['urlRedirects'])) existing.add(r.path.toLowerCase());
  let created = 0, skipped = 0;
  for (const row of readCsv(file)) {
    const from = (row['Redirect from'] || '').trim();
    const to = (row['Redirect to'] || '').trim();
    if (!from || !to || from.startsWith('#')) continue;
    if (!from.startsWith('/')) { log.warn(`skip "${from}": must start with /`); skipped++; continue; }
    if (existing.has(from.toLowerCase())) { skipped++; continue; }
    const r = await client.mutate(`mutation($r: UrlRedirectInput!) { urlRedirectCreate(urlRedirect: $r) { userErrors { field message } } }`,
      { r: { path: from, target: to } }, { urlRedirectCreate: { userErrors: [] } }, `redirect ${from} → ${to}`);
    checkUserErrors(`redirect ${from}`, r.urlRedirectCreate);
    created++;
  }
  log.info(`${args.dryRun ? '[dry-run] ' : ''}created ${created}, skipped ${skipped} (already present or invalid)`);
}
main().catch((e) => { log.error(e.message); process.exit(1); });
