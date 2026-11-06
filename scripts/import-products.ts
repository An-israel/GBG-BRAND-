/**
 * Imports validated products into Shopify, keyed by SKU (idempotent).
 *
 *   npm run import -- products.csv --sample 10 --dry-run   # preview the 10-product sample
 *   npm run import -- products.csv --sample 10             # 10 products as DRAFTS for owner approval
 *   npm run import -- products.csv --dry-run               # preview the full import
 *   npm run import -- products.csv                         # rows with Status=active → Active, with stock at the GBG location
 *
 * Options:
 *   --photos <dir>     prepared images folder (default prepared-images; output of npm run images)
 *   --sync-stock       on UPDATE, also overwrite the stock count (off by default: POS sales may have changed it)
 *   --force            overwrite products that staff edited in Shopify since the last import
 *
 * Safety:
 *   - every row is validated first; invalid products go to failed_rows.csv with the reason
 *   - existing products (same SKU) are UPDATED, never duplicated               ENGINEERING #14
 *   - if a product was edited in Shopify after our last import (updatedAt newer
 *     than recorded in .import-state.json) it is SKIPPED with a warning          #36, #39
 *   - images are uploaded only when the product has no photos yet
 *   - "Continue selling when out of stock" is always OFF (inventoryPolicy DENY)
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { loadConfig } from './lib/config.js';
import { readCsv, writeCsv } from './lib/csv.js';
import { createLogger } from './lib/logger.js';
import { COL, draftAltText, groupByHandle, isTrue, splitTags, validateRows, type ProductGroup, type Row } from './lib/products.js';
import { ShopifyClient, assertAllowedHost, checkUserErrors } from './lib/shopify.js';
import { loadStructure } from './lib/store-structure.js';

const args = parseArgs();
const file = args.positional[0];
if (!file) { console.error('Usage: npm run import -- <products.csv> [--sample 10] [--dry-run]'); process.exit(2); }
const sample = args.flags.sample ? Number(args.flags.sample) : 0;
const photosDir = String(args.flags.photos || 'prepared-images');
const STATE_FILE = '.import-state.json';

const log = createLogger('import-products');
const config = loadConfig();
const client = new ShopifyClient(config, { dryRun: args.dryRun, logger: log });
const structure = loadStructure();

type State = Record<string, { productId: string; updatedAt: string }>;
const state: State = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
const failed: (Row & { 'Failure reason': string })[] = [];
const summary = { created: 0, updated: 0, skipped: 0, failed: 0 };
const skippedReasons: string[] = [];

// ---- cached lookups (ENGINEERING #2, #27: no per-item lookups for shared data)
let locationId = '';
let publicationId = '';
let collectionOnlyProfileId = '';
async function warmCaches() {
  const d = await client.query(`query {
    locations(first: 50) { nodes { id name address { address1 } } }
    publications(first: 20) { nodes { id name } }
    deliveryProfiles(first: 20) { nodes { id name } }
  }`);
  const loc = d.locations.nodes.find((l: any) => l.name === config.locationName) || d.locations.nodes.find((l: any) => /m10/i.test(`${l.name} ${l.address?.address1}`));
  if (!loc) throw new Error(`Location "${config.locationName}" not found. Run npm run setup:store first.`);
  locationId = loc.id;
  publicationId = d.publications.nodes.find((p: any) => p.name === 'Online Store')?.id ?? '';
  collectionOnlyProfileId = d.deliveryProfiles.nodes.find((p: any) => p.name === 'Collection only')?.id ?? '';
  if (!collectionOnlyProfileId) log.warn('"Collection only" shipping profile not found – collection-only products cannot be protected from postal checkout until it exists.');
}

// ---- alt text reviewed by staff (prepared-images/alt-text-review.csv)
const reviewedAlt = new Map<string, string>();
const altFile = path.join(photosDir, 'alt-text-review.csv');
if (fs.existsSync(altFile)) {
  for (const r of readCsv(altFile)) reviewedAlt.set(path.basename(r.File), r['Draft alt text']);
}

function listImages(sku: string): string[] {
  const dir = path.join(photosDir, sku);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.(jpe?g|webp|png)$/i.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((f) => path.join(dir, f));
}

async function uploadImage(filePath: string): Promise<string> {
  const filename = path.basename(filePath);
  const mimeType = filename.endsWith('.webp') ? 'image/webp' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const size = fs.statSync(filePath).size;
  const d: any = await client.mutate(
    `mutation($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } } }`,
    { input: [{ filename, mimeType, resource: 'IMAGE', httpMethod: 'POST', fileSize: String(size) }] },
    { stagedUploadsCreate: { stagedTargets: [{ url: '', resourceUrl: `dry-run://${filename}`, parameters: [] }], userErrors: [] } }, `stagedUpload ${filename}`,
  );
  checkUserErrors('stagedUploadsCreate', d.stagedUploadsCreate);
  const target = d.stagedUploadsCreate.stagedTargets[0];
  if (args.dryRun) return target.resourceUrl;
  assertAllowedHost(target.url);
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([fs.readFileSync(filePath)], { type: mimeType }), filename);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const res = await fetch(target.url, { method: 'POST', body: form, signal: ctrl.signal });
    if (!res.ok) throw new Error(`image upload failed: HTTP ${res.status}`);
  } finally { clearTimeout(timer); }
  return target.resourceUrl;
}

const money = (v: string | undefined) => (v && v.trim() ? Number(v.replace(/[£,\s]/g, '')).toFixed(2) : null);

function buildInput(group: ProductGroup, status: 'ACTIVE' | 'DRAFT', isCreate: boolean) {
  const first = group.rows[0];
  const optionName = first[COL.option1Name] && first[COL.option1Name] !== 'Title' ? first[COL.option1Name] : 'Title';
  const hasOptions = optionName !== 'Title';
  const metafields = [
    ['condition', 'single_line_text_field', first[COL.condition]],
    ['condition_notes', 'multi_line_text_field', first[COL.conditionNotes]],
    ['dimensions', 'single_line_text_field', first[COL.dimensions]],
    ['colour', 'single_line_text_field', first[COL.colour]],
    ['collection_only', 'boolean', isTrue(first[COL.collectionOnly]) ? 'true' : 'false'],
    ['tested', 'single_line_text_field', first[COL.tested]],
    ['internal_notes', 'multi_line_text_field', first[COL.internalNotes]],
  ].filter(([, , v]) => v && String(v).trim()).map(([key, type, value]) => ({ namespace: 'custom', key, type, value: String(value).trim() }));

  const tags = splitTags(first[COL.tags]);
  if (isTrue(first[COL.collectionOnly]) && !tags.includes('collection-only')) tags.push('collection-only');

  return {
    title: first[COL.title].trim(),
    handle: group.handle,
    descriptionHtml: first[COL.body] || '',
    vendor: first[COL.vendor] || 'GBG Bargain Shop',
    productType: first[COL.type] || '',
    tags,
    status,
    seo: { title: first[COL.seoTitle] || null, description: first[COL.seoDescription] || null },
    productOptions: [{ name: optionName, position: 1, values: group.rows.map((r) => ({ name: hasOptions ? r[COL.option1Value] : 'Default Title' })) }],
    variants: group.rows.map((r) => ({
      optionValues: [{ optionName, name: hasOptions ? r[COL.option1Value] : 'Default Title' }],
      price: money(r[COL.price]),
      compareAtPrice: money(r[COL.compareAt]),
      barcode: r[COL.barcode] || null,
      taxable: r[COL.taxable] ? isTrue(r[COL.taxable]) : true,
      inventoryPolicy: 'DENY',
      inventoryItem: {
        sku: r[COL.sku].trim(),
        tracked: true,
        cost: money(r[COL.cost]),
        requiresShipping: true, // pickup orders still need this; collection-only is enforced by the shipping profile
        measurement: { weight: { value: Number(r[COL.grams]), unit: 'GRAMS' } },
      },
      ...(isCreate ? { inventoryQuantities: [{ locationId, name: 'available', quantity: Number(r[COL.qty] || 0) }] } : {}),
    })),
    metafields,
  };
}

async function findExisting(group: ProductGroup) {
  const sku = group.rows[0][COL.sku].trim();
  const d = await client.query(
    `query($q: String!, $h: String!) {
      productVariants(first: 1, query: $q) { nodes { product { id handle updatedAt mediaCount { count } } } }
      productByHandle(handle: $h) { id handle updatedAt mediaCount { count } }
    }`,
    { q: `sku:'${sku.replace(/'/g, "\\'")}'`, h: group.handle },
  );
  return d.productVariants.nodes[0]?.product ?? d.productByHandle ?? null;
}

async function importGroup(group: ProductGroup, status: 'ACTIVE' | 'DRAFT') {
  const first = group.rows[0];
  const sku = first[COL.sku].trim();
  const existing = await findExisting(group);
  const isCreate = !existing;

  if (existing) {
    const recorded = state[sku];
    if (!recorded && !args.flags.force) {
      throw new SkipError(`already exists in Shopify (${existing.handle}) but was not created by this importer – not overwritten. Use --force to take it over.`);
    }
    if (recorded && new Date(existing.updatedAt) > new Date(recorded.updatedAt) && !args.flags.force) {
      throw new SkipError(`edited in Shopify on ${existing.updatedAt} after the last import – staff changes kept. Use --force to overwrite.`);
    }
  }

  const input: any = buildInput(group, status, isCreate);
  const needsImages = isCreate || (existing?.mediaCount?.count ?? 0) === 0;
  if (needsImages) {
    const files = listImages(sku);
    if (!files.length) throw new Error(`no prepared images in ${path.join(photosDir, sku)} – run npm run images first`);
    input.files = [];
    for (const [i, f] of files.entries()) {
      const src = await uploadImage(f);
      input.files.push({ originalSource: src, contentType: 'IMAGE', alt: reviewedAlt.get(path.basename(f)) || draftAltText(input.title, i, first[COL.colour]) });
    }
  }

  const res = await client.mutate(
    `mutation($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
      productSet(input: $input, identifier: $identifier, synchronous: true) {
        product { id handle updatedAt variants(first: 100) { nodes { id sku inventoryItem { id } } } }
        userErrors { field message code }
      }
    }`,
    { input, identifier: existing ? { id: existing.id } : null },
    { productSet: { product: { id: existing?.id ?? `gid://shopify/Product/DRY_${sku}`, handle: group.handle, updatedAt: new Date().toISOString(), variants: { nodes: [] } }, userErrors: [] } },
    `productSet ${sku} (${isCreate ? 'create' : 'update'}, ${status})`,
  );
  checkUserErrors(`productSet ${sku}`, res.productSet);
  const product = res.productSet.product;

  if (!isCreate && args.flags['sync-stock'] && product.variants.nodes.length) {
    const quantities = product.variants.nodes.map((v: any) => {
      const row = group.rows.find((r) => r[COL.sku].trim() === v.sku);
      return row ? { inventoryItemId: v.inventoryItem.id, locationId, quantity: Number(row[COL.qty] || 0) } : null;
    }).filter(Boolean);
    const inv = await client.mutate(
      `mutation($input: InventorySetQuantitiesInput!) { inventorySetQuantities(input: $input) { userErrors { field message } } }`,
      { input: { name: 'available', reason: 'correction', ignoreCompareQuantity: true, quantities } }, { inventorySetQuantities: { userErrors: [] } }, `stock ${sku}`,
    );
    checkUserErrors(`stock ${sku}`, inv.inventorySetQuantities);
  }

  if (publicationId) {
    const pub = await client.mutate(
      `mutation($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }`,
      { id: product.id, input: [{ publicationId }] }, { publishablePublish: { userErrors: [] } }, `publish ${sku}`,
    );
    checkUserErrors(`publish ${sku}`, pub.publishablePublish);
  }

  if (isTrue(first[COL.collectionOnly]) && collectionOnlyProfileId && product.variants.nodes.length) {
    const dp = await client.mutate(
      `mutation($id: ID!, $profile: DeliveryProfileInput!) { deliveryProfileUpdate(id: $id, profile: $profile) { userErrors { field message } } }`,
      { id: collectionOnlyProfileId, profile: { variantsToAssociate: product.variants.nodes.map((v: any) => v.id) } },
      { deliveryProfileUpdate: { userErrors: [] } }, `collection-only profile ${sku}`,
    );
    checkUserErrors(`collection-only ${sku}`, dp.deliveryProfileUpdate);
  }

  if (!args.dryRun) for (const r of group.rows) state[r[COL.sku].trim()] = { productId: product.id, updatedAt: product.updatedAt };
  if (isCreate) summary.created++; else summary.updated++;
  log.info(`${isCreate ? 'CREATED' : 'UPDATED'} ${sku} ${group.handle} as ${status}`);
}

class SkipError extends Error {}

async function main() {
  log.info(`Import ${file}${sample ? ` – SAMPLE of ${sample} as drafts` : ''}${args.dryRun ? ' – DRY RUN' : ''}`);
  const rows = readCsv(file);
  const issues = validateRows(rows, { categoryTags: structure.categoryTags, electricalTags: structure.electricalTags, photosDir: undefined });
  const errorsByHandle = new Map<string, string[]>();
  for (const i of issues.filter((x) => x.level === 'error')) {
    const handle = rows[i.row - 2]?.[COL.handle] || '';
    errorsByHandle.set(handle, [...(errorsByHandle.get(handle) || []), `row ${i.row} ${i.field}: ${i.message}`]);
  }

  let groups = groupByHandle(rows);
  if (sample) groups = groups.slice(0, sample);
  await warmCaches();

  for (const g of groups) {
    const errs = errorsByHandle.get(g.handle);
    if (errs) {
      summary.failed++;
      g.rows.forEach((r) => failed.push({ ...r, 'Failure reason': `Validation: ${errs.join(' | ')}` }));
      log.warn(`FAILED ${g.handle}: validation errors`);
      continue;
    }
    const csvStatus = (g.rows[0][COL.status] || '').trim().toLowerCase();
    if (!sample && csvStatus !== 'active') {
      summary.skipped++;
      skippedReasons.push(`${g.handle}: Status is "${csvStatus || 'empty'}" – not approved yet (set Status to active once the owner approves)`);
      continue;
    }
    try {
      await importGroup(g, sample ? 'DRAFT' : 'ACTIVE');
    } catch (err: any) {
      if (err instanceof SkipError) {
        summary.skipped++;
        skippedReasons.push(`${g.handle}: ${err.message}`);
        log.warn(`SKIPPED ${g.handle}: ${err.message}`);
      } else {
        summary.failed++;
        g.rows.forEach((r) => failed.push({ ...r, 'Failure reason': err.message }));
        log.error(`FAILED ${g.handle}: ${err.message}`);
      }
    }
  }

  if (!args.dryRun) fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  if (failed.length) {
    writeCsv('failed_rows.csv', failed, [...Object.keys(rows[0] || {}), 'Failure reason']);
    log.warn(`${failed.length} row(s) written to failed_rows.csv – fix them and run the import again.`);
  }
  fs.mkdirSync('reports', { recursive: true });
  const report = [
    `# Import report – ${new Date().toLocaleString('en-GB')}`,
    `File: ${file}${sample ? ` (sample of ${sample}, imported as drafts)` : ''}${args.dryRun ? ' – DRY RUN, nothing changed' : ''}`,
    '', `| Created | Updated | Skipped | Failed |`, `|---|---|---|---|`, `| ${summary.created} | ${summary.updated} | ${summary.skipped} | ${summary.failed} |`,
    '', skippedReasons.length ? '## Skipped\n' + skippedReasons.map((s) => `- ${s}`).join('\n') : '',
    failed.length ? '\n## Failed\nSee failed_rows.csv (last column explains each problem).' : '',
  ].join('\n');
  const reportFile = path.join('reports', `import-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
  fs.writeFileSync(reportFile, report);
  log.info(`created ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}, failed ${summary.failed}. Report: ${reportFile}`);
  process.exit(summary.failed ? 1 : 0);
}

main().catch((err) => { log.error(err.stack || err.message); process.exit(1); });
