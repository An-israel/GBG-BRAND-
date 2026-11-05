/**
 * Weekly health report (ENGINEERING #21 cron, #61 metrics). Lists:
 *   - sold-out products still in featured collections (Best Bargains, New Arrivals, Clearance…)
 *   - active products missing a condition label
 *   - product images missing alt text
 *   - "new-arrival" tags older than 30 days (optionally removes them with --remove-old-tags)
 *   - summary numbers (active, sold out, drafts, low stock)
 *
 *   npm run report:weekly                      # writes reports/weekly-YYYY-MM-DD.md
 *   npm run report:weekly -- --remove-old-tags --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { loadConfig } from './lib/config.js';
import { createLogger } from './lib/logger.js';
import { ShopifyClient, checkUserErrors } from './lib/shopify.js';

const FEATURED = ['bargains', 'new-arrivals', 'clearance', 'last-chance', 'under-5'];
const NEW_ARRIVAL_DAYS = 30;

const args = parseArgs();
const log = createLogger('weekly-report');
const client = new ShopifyClient(loadConfig(), { dryRun: args.dryRun, logger: log });

const PRODUCTS = `query($after: String) {
  products(first: 100, after: $after, query: "status:active OR status:draft") {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id title handle status createdAt tags totalInventory tracksInventory
      condition: metafield(namespace: "custom", key: "condition") { value }
      media(first: 10) { nodes { alt mediaContentType } }
      collections(first: 20) { nodes { handle } }
    } }
  }
}`;

async function main() {
  const soldOutFeatured: string[] = [];
  const noCondition: string[] = [];
  const noAlt: string[] = [];
  const oldNew: { id: string; title: string; created: string }[] = [];
  const lowStock: string[] = [];
  let active = 0, drafts = 0, soldOut = 0;
  const cutoff = Date.now() - NEW_ARRIVAL_DAYS * 86400_000;

  for await (const p of client.paginate<any>(PRODUCTS, ['products'])) {
    const label = `${p.title} (/products/${p.handle})`;
    if (p.status === 'DRAFT') { drafts++; continue; }
    active++;
    const out = p.tracksInventory && p.totalInventory <= 0;
    if (out) soldOut++;
    if (p.tracksInventory && p.totalInventory === 1) lowStock.push(label);
    const featuredIn = p.collections.nodes.map((c: any) => c.handle).filter((h: string) => FEATURED.includes(h));
    if (out && featuredIn.length) soldOutFeatured.push(`${label} – in ${featuredIn.join(', ')}`);
    if (!p.condition?.value) noCondition.push(label);
    const missing = p.media.nodes.filter((m: any) => m.mediaContentType === 'IMAGE' && !(m.alt || '').trim()).length;
    if (missing) noAlt.push(`${label} – ${missing} image(s)`);
    if (p.tags.includes('new-arrival') && new Date(p.createdAt).getTime() < cutoff) oldNew.push({ id: p.id, title: label, created: p.createdAt.slice(0, 10) });
  }

  if (args.flags['remove-old-tags']) {
    for (const p of oldNew) {
      const r = await client.mutate(`mutation($id: ID!, $tags: [String!]!) { tagsRemove(id: $id, tags: $tags) { userErrors { field message } } }`,
        { id: p.id, tags: ['new-arrival'] }, { tagsRemove: { userErrors: [] } }, `tagsRemove ${p.title}`);
      checkUserErrors('tagsRemove', r.tagsRemove);
    }
    log.info(`${args.dryRun ? '[dry-run] would remove' : 'removed'} "new-arrival" from ${oldNew.length} product(s)`);
  }

  const section = (title: string, items: string[], ok: string) => `## ${title} (${items.length})\n${items.length ? items.map((i) => `- ${i}`).join('\n') : `✔ ${ok}`}\n`;
  const date = new Date().toISOString().slice(0, 10);
  const md = [
    `# GBG weekly report – ${date}`, '',
    '| Active | Sold out | Only 1 left | Drafts awaiting approval |', '|---|---|---|---|', `| ${active} | ${soldOut} | ${lowStock.length} | ${drafts} |`, '',
    section('Sold out but still in a featured collection', soldOutFeatured, 'Nothing sold out is being featured.'),
    section('Missing condition label', noCondition, 'Every product has a condition.'),
    section('Images without alt text', noAlt, 'Every image has alt text.'),
    section(`"New arrival" tags older than ${NEW_ARRIVAL_DAYS} days`, oldNew.map((p) => `${p.title} – added ${p.created}`), 'New Arrivals is fresh.'),
    section('Only 1 left (check the shelf matches)', lowStock, 'None.'),
    oldNew.length && !args.flags['remove-old-tags'] ? 'To clear old New Arrival tags run: `npm run report:weekly -- --remove-old-tags`\n' : '',
  ].join('\n');
  fs.mkdirSync('reports', { recursive: true });
  const out = path.join('reports', `weekly-${date}.md`);
  fs.writeFileSync(out, md);
  console.log(md);
  log.info(`Report written to ${out}`);
}
main().catch((e) => { log.error(e.message); process.exit(1); });
