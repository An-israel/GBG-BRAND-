/**
 * Exports store data to backup/YYYY-MM-DD/ (ENGINEERING #84). Read-only – safe to run any time.
 * Run before launch (brief §11.1) and monthly afterwards.
 *
 *   npm run backup
 *
 * Exports: products (JSON + Shopify-format CSV), collections, pages, blogs/articles, menus,
 * URL redirects, discount codes, metafield definitions, locations, and customer METADATA only
 * (counts + marketing-consent breakdown – no personal data). The theme is backed up with
 * `shopify theme pull` (see README). Installed apps and notification templates cannot be read
 * by the Admin API: record them by hand in backup/YYYY-MM-DD/MANUAL.md (template created here).
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { loadConfig } from './lib/config.js';
import { createLogger } from './lib/logger.js';
import { writeCsv } from './lib/csv.js';
import { ShopifyClient } from './lib/shopify.js';

parseArgs();
const log = createLogger('backup-export');
const client = new ShopifyClient(loadConfig(), { logger: log });
const dir = path.join('backup', new Date().toISOString().slice(0, 10));
fs.mkdirSync(dir, { recursive: true });
const save = (name: string, data: unknown) => { fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2)); log.info(`saved ${name}`); };

async function all(query: string, p: string[]) { const out: any[] = []; for await (const n of client.paginate(query, p)) out.push(n); return out; }

async function main() {
  const products = await all(`query($after: String) { products(first: 50, after: $after) { pageInfo { hasNextPage endCursor } edges { node {
    id handle title status vendor productType tags descriptionHtml createdAt updatedAt
    seo { title description }
    metafields(first: 20) { nodes { namespace key type value } }
    media(first: 20) { nodes { ... on MediaImage { image { url altText } } } }
    variants(first: 100) { nodes { id sku title price compareAtPrice barcode inventoryQuantity inventoryPolicy
      inventoryItem { unitCost { amount } measurement { weight { value unit } } } } }
  } } } }`, ['products']);
  save('products.json', products);
  const csvRows = products.flatMap((p: any) => p.variants.nodes.map((v: any, i: number) => ({
    Handle: p.handle, Title: i === 0 ? p.title : '', Status: p.status.toLowerCase(), Tags: p.tags.join(', '),
    'Variant SKU': v.sku, 'Option1 Value': v.title, 'Variant Price': v.price, 'Variant Compare At Price': v.compareAtPrice ?? '',
    'Variant Inventory Qty': v.inventoryQuantity, 'Variant Grams': v.inventoryItem?.measurement?.weight?.value ?? '', 'Cost per item': v.inventoryItem?.unitCost?.amount ?? '',
  })));
  if (csvRows.length) writeCsv(path.join(dir, 'products.csv'), csvRows);

  save('collections.json', await all(`query($after: String) { collections(first: 100, after: $after) { pageInfo { hasNextPage endCursor } edges { node { id handle title descriptionHtml sortOrder ruleSet { appliedDisjunctively rules { column relation condition } } seo { title description } } } } }`, ['collections']));
  save('pages.json', await all(`query($after: String) { pages(first: 100, after: $after) { pageInfo { hasNextPage endCursor } edges { node { id handle title body isPublished templateSuffix } } } }`, ['pages']));
  save('blogs.json', await all(`query($after: String) { blogs(first: 50, after: $after) { pageInfo { hasNextPage endCursor } edges { node { id handle title articles(first: 100) { nodes { id handle title body isPublished } } } } } }`, ['blogs']));
  save('menus.json', (await client.query(`query { menus(first: 50) { nodes { id handle title items { title url type items { title url type items { title url type } } } } } }`)).menus.nodes);
  const redirects = await all(`query($after: String) { urlRedirects(first: 250, after: $after) { pageInfo { hasNextPage endCursor } edges { node { id path target } } } }`, ['urlRedirects']);
  save('redirects.json', redirects);
  if (redirects.length) writeCsv(path.join(dir, 'redirects.csv'), redirects.map((r: any) => ({ 'Redirect from': r.path, 'Redirect to': r.target })));
  save('discounts.json', await all(`query($after: String) { codeDiscountNodes(first: 100, after: $after) { pageInfo { hasNextPage endCursor } edges { node { id codeDiscount { __typename ... on DiscountCodeBasic { title status startsAt endsAt codes(first: 5) { nodes { code } } } ... on DiscountCodeFreeShipping { title status codes(first: 5) { nodes { code } } } } } } } }`, ['codeDiscountNodes']));
  save('metafield-definitions.json', (await client.query(`query { metafieldDefinitions(first: 100, ownerType: PRODUCT) { nodes { namespace key name type { name } validations { name value } } } }`)).metafieldDefinitions.nodes);
  save('locations.json', (await client.query(`query { locations(first: 50) { nodes { id name isActive fulfillsOnlineOrders address { address1 address2 city zip } } } }`)).locations.nodes);
  const shop = await client.query(`query { shop { name email contactEmail myshopifyDomain primaryDomain { url } currencyCode taxesIncluded } }`);
  save('shop.json', shop.shop);
  const consent: Record<string, number> = {};
  let customers = 0;
  for await (const c of client.paginate<any>(`query($after: String) { customers(first: 250, after: $after) { pageInfo { hasNextPage endCursor } edges { node { defaultEmailAddress { marketingState } } } } }`, ['customers'])) {
    customers++;
    const s = c.defaultEmailAddress?.marketingState || 'NO_EMAIL';
    consent[s] = (consent[s] || 0) + 1;
  }
  save('customers-metadata.json', { customers, emailMarketingState: consent, note: 'Counts only – no personal data exported.' });
  fs.writeFileSync(path.join(dir, 'MANUAL.md'), `# Manual backup items – ${path.basename(dir)}\n\nThe Admin API cannot export these. Record them by hand:\n\n- [ ] Theme: \`shopify theme pull --store <store> --theme <live theme id> --path ${dir}/theme\`\n- [ ] Installed apps and monthly charges (Settings → Apps and sales channels):\n\n| App | Monthly cost | Used for | Keep? |\n|---|---|---|---|\n|  |  |  |  |\n\n- [ ] Notification templates (Settings → Notifications): copy any customised template into ${dir}/notifications/\n- [ ] Checkout and customer-account branding screenshots\n- [ ] Payment, shipping, tax and pickup settings screenshots\n`);
  log.info(`Backup complete: ${dir}`);
}
main().catch((e) => { log.error(e.message); process.exit(1); });
