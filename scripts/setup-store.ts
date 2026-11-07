/**
 * Creates the store structure from code (re-runnable, idempotent):
 *   1. product metafield definitions (with validations)
 *   2. the GBG shop location (checks / creates)
 *   3. smart collections from config/collections.json – ONLY when products match
 *   4. the "Collection only" shipping profile (no delivery zones)
 *   5. draft pages from content/pages/*.html (unpublished until approved)
 *   6. navigation menus (main-menu, footer, footer-shop) – empty collections left out
 *   7. (optional, --policies) legal policy drafts from content/policies/*.html
 *
 *   npm run setup:store -- --dry-run          # show what would happen
 *   npm run setup:store                        # do it
 *   npm run setup:store -- --only metafields,collections
 *   npm run setup:store -- --force-empty      # also create collections with no products yet (not recommended)
 *   Location: re-uses the store's only location (or --location-id <n>); --rename-location renames it to the GBG shop; --create-location adds a new one.
 *
 * The structure version is stored on the shop as metafield gbg.structure_version.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { loadConfig } from './lib/config.js';
import { createLogger } from './lib/logger.js';
import { ShopifyClient, checkUserErrors } from './lib/shopify.js';
import { loadStructure, type CollectionDef } from './lib/store-structure.js';
import { CONDITIONS, TESTED } from './lib/products.js';

export const STRUCTURE_VERSION = '1.0.0';

const args = parseArgs();
const only = typeof args.flags.only === 'string' ? new Set(args.flags.only.split(',')) : null;
const step = (name: string) => !only || only.has(name);
const log = createLogger('setup-store');
/** Past tense for real runs, "would be …" for --dry-run, so logs never claim a change that didn't happen. */
const did = (verb: string) => (args.dryRun ? `would be ${verb}` : verb);
const config = loadConfig();
const client = new ShopifyClient(config, { dryRun: args.dryRun, logger: log });
const structure = loadStructure();

// ---------------------------------------------------------------- metafields
const METAFIELDS = [
  { key: 'condition', name: 'Condition', type: 'single_line_text_field', description: 'Condition label shown as a badge with a plain-English explanation.', validations: [{ name: 'choices', value: JSON.stringify(CONDITIONS) }], filterable: true },
  { key: 'condition_notes', name: 'Condition notes', type: 'multi_line_text_field', description: 'Faults, missing parts, signs of use. Shown on the product page.' },
  { key: 'dimensions', name: 'Dimensions', type: 'single_line_text_field', description: 'Size or dimensions, e.g. 38 x 30 x 14 cm.' },
  { key: 'colour', name: 'Colour', type: 'single_line_text_field', description: 'Main colour, e.g. Tan, Navy, Multicolour. Used for the colour filter.', filterable: true },
  { key: 'collection_only', name: 'Collection only', type: 'boolean', description: 'Shows the "Collection only" badge. Real enforcement: the "Collection only" shipping profile.', filterable: true },
  { key: 'tested', name: 'Tested', type: 'single_line_text_field', description: 'Required for electricals.', validations: [{ name: 'choices', value: JSON.stringify(TESTED) }] },
  { key: 'internal_notes', name: 'Internal notes', type: 'multi_line_text_field', description: 'Staff only – never shown on the website.', internal: true },
];

async function setupMetafields() {
  const data = await client.query(`query { metafieldDefinitions(first: 100, ownerType: PRODUCT, namespace: "custom") { nodes { id key } } }`);
  const existing = new Set<string>(data.metafieldDefinitions.nodes.map((n: any) => n.key));
  for (const m of METAFIELDS) {
    if (existing.has(m.key)) { log.info(`metafield custom.${m.key}: exists – skipped`); continue; }
    const definition: any = {
      name: m.name, namespace: 'custom', key: m.key, type: m.type, ownerType: 'PRODUCT', description: m.description,
      validations: m.validations ?? [], pin: true,
      access: m.internal ? { storefront: 'NONE' } : { storefront: 'PUBLIC_READ' },
    };
    if (m.filterable) definition.capabilities = { adminFilterable: { enabled: true } };
    const res = await client.mutate(
      `mutation($definition: MetafieldDefinitionInput!) { metafieldDefinitionCreate(definition: $definition) { createdDefinition { id } userErrors { field message code } } }`,
      { definition }, { metafieldDefinitionCreate: { userErrors: [] } }, `metafieldDefinitionCreate custom.${m.key}`,
    );
    checkUserErrors(`custom.${m.key}`, res.metafieldDefinitionCreate);
    log.info(`metafield custom.${m.key}: ${did('created')}`);
  }
}

// ---------------------------------------------------------------- location
let locationId: string | null = null;
const GBG_ADDRESS = { address1: 'Unit M10, Stanley Meat Market', address2: 'Prescot Road', city: 'Liverpool', zip: 'L13 3AS', countryCode: 'GB', phone: '+447344670317' };
async function setupLocation() {
  const data = await client.query(`query { locations(first: 50) { nodes { id name isActive fulfillsOnlineOrders address { address1 zip } } } }`);
  const found = data.locations.nodes.find((l: any) => l.name === config.locationName)
    || data.locations.nodes.find((l: any) => /m10/i.test(`${l.name} ${l.address?.address1}`));
  if (found) {
    locationId = found.id;
    log.info(`location: using "${found.name}" (${found.id}), active=${found.isActive}, fulfils online orders=${found.fulfillsOnlineOrders}`);
    return;
  }
  const active = data.locations.nodes.filter((l: any) => l.isActive);
  const chosen = typeof args.flags['location-id'] === 'string' ? data.locations.nodes.find((l: any) => l.id.endsWith(String(args.flags['location-id']))) : null;
  const reuse = chosen || (active.length === 1 ? active[0] : null);
  if (reuse && !args.flags['create-location']) {
    // Re-use the store's existing location (e.g. the old DBS one) so stock is never split.
    locationId = reuse.id;
    if (args.flags['rename-location']) {
      const res = await client.mutate(
        `mutation($id: ID!, $input: LocationEditInput!) { locationEdit(id: $id, input: $input) { location { id name } userErrors { field message } } }`,
        { id: reuse.id, input: { name: config.locationName, fulfillsOnlineOrders: true, address: GBG_ADDRESS } },
        { locationEdit: { location: { id: reuse.id }, userErrors: [] } }, 'locationEdit',
      );
      checkUserErrors('locationEdit', res.locationEdit);
      log.info(`location: "${reuse.name}" ${did('renamed')} to "${config.locationName}" with the Unit M10 address`);
    } else {
      log.warn(`location: re-using the existing location "${reuse.name}" (${reuse.id}) instead of creating a second one. Add --rename-location to rename it to "${config.locationName}" and set the Unit M10 address.`);
    }
    return;
  }
  if (!args.flags['create-location']) {
    log.error(`location: ${active.length} locations found and none is the GBG shop: ${active.map((l: any) => `"${l.name}" (${l.id.split('/').pop()})`).join(', ')}. Re-run with --location-id <number> to choose one, or --create-location to add a new one. Location-dependent steps are skipped.`);
    return;
  }
  log.info(`location: "${config.locationName}" not found – ${did('created')} (--create-location)`);
  const res = await client.mutate(
    `mutation($input: LocationAddInput!) { locationAdd(input: $input) { location { id name } userErrors { field message } } }`,
    { input: { name: config.locationName, fulfillsOnlineOrders: true, address: GBG_ADDRESS } },
    { locationAdd: { location: { id: 'gid://shopify/Location/DRY_RUN', name: config.locationName }, userErrors: [] } }, 'locationAdd',
  );
  checkUserErrors('locationAdd', res.locationAdd);
  locationId = res.locationAdd.location.id;
  log.info(`location: ${did('created')} ${locationId}. Enable local pickup for it in Settings → Shipping and delivery (see docs/STORE_SETUP_CHECKLIST.md).`);
}

// ---------------------------------------------------------------- collections
const collectionIds = new Map<string, string>(); // handle -> id (cache, ENGINEERING #2)

async function matchCount(c: CollectionDef): Promise<number> {
  let total = 0;
  for (const r of c.rules) {
    if (r.column === 'TAG') {
      const d = await client.query(`query($q: String!) { productsCount(query: $q) { count } }`, { q: `tag:'${r.condition}'` });
      total = Math.max(total, d.productsCount.count);
    } else if (r.column === 'VARIANT_INVENTORY') {
      const d = await client.query(`query($q: String!) { productsCount(query: $q) { count } }`, { q: `inventory_total:${r.condition}` });
      total = Math.max(total, d.productsCount.count);
    } else if (r.column === 'VARIANT_PRICE' && r.relation === 'LESS_THAN') {
      const d = await client.query(`query($q: String!) { productVariantsCount(query: $q) { count } }`, { q: `price:<${r.condition}` });
      total = Math.max(total, d.productVariantsCount.count);
    }
  }
  return total;
}

async function onlineStorePublicationId(): Promise<string | null> {
  const d = await client.query(`query { publications(first: 20) { nodes { id name } } }`);
  const p = d.publications.nodes.find((n: any) => n.name === 'Online Store');
  return p ? p.id : null;
}

async function setupCollections() {
  const publicationId = await onlineStorePublicationId();
  if (!publicationId) log.warn('Online Store publication not found – collections will not be published automatically.');
  for (const c of structure.collections) {
    const existing = await client.query(`query($h: String!) { collectionByHandle(handle: $h) { id title productsCount { count } } }`, { h: c.handle });
    if (existing.collectionByHandle) {
      collectionIds.set(c.handle, existing.collectionByHandle.id);
      log.info(`collection ${c.handle}: exists (${existing.collectionByHandle.productsCount?.count ?? '?'} products) – skipped`);
      continue;
    }
    const count = await matchCount(c);
    if (count === 0 && !args.flags['force-empty']) {
      log.info(`collection ${c.handle}: no matching products yet – NOT created (never create empty collections). Re-run after import.`);
      continue;
    }
    const input = {
      title: c.title, handle: c.handle, descriptionHtml: `<p>${c.description}</p>`,
      sortOrder: c.sortOrder || 'BEST_SELLING',
      ruleSet: { appliedDisjunctively: !!c.disjunctive, rules: c.rules },
      seo: { title: `${c.title} | GBG Bargain Shop`, description: c.seoDescription },
    };
    const res = await client.mutate(
      `mutation($input: CollectionInput!) { collectionCreate(input: $input) { collection { id handle } userErrors { field message } } }`,
      { input }, { collectionCreate: { collection: { id: `gid://shopify/Collection/DRY_${c.handle}`, handle: c.handle }, userErrors: [] } }, `collectionCreate ${c.handle}`,
    );
    checkUserErrors(`collection ${c.handle}`, res.collectionCreate);
    const id = res.collectionCreate.collection.id;
    collectionIds.set(c.handle, id);
    if (publicationId) {
      const pub = await client.mutate(
        `mutation($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }`,
        { id, input: [{ publicationId }] }, { publishablePublish: { userErrors: [] } }, `publish ${c.handle}`,
      );
      checkUserErrors(`publish ${c.handle}`, pub.publishablePublish);
    }
    log.info(`collection ${c.handle}: ${did('created')} (${count} matching products) and published`);
  }
}

// ---------------------------------------------------------------- shipping profile
async function setupCollectionOnlyProfile() {
  const d = await client.query(`query { deliveryProfiles(first: 20) { nodes { id name } } }`);
  const existing = d.deliveryProfiles.nodes.find((p: any) => p.name === 'Collection only');
  if (existing) { log.info(`shipping profile "Collection only": exists (${existing.id})`); return; }
  if (!locationId) { log.warn('shipping profile: no location id – run the location step first.'); return; }
  try {
    const res = await client.mutate(
      `mutation($profile: DeliveryProfileInput!) { deliveryProfileCreate(profile: $profile) { profile { id name } userErrors { field message } } }`,
      { profile: { name: 'Collection only', locationGroupsToCreate: [{ locations: [locationId], zonesToCreate: [] }] } },
      { deliveryProfileCreate: { profile: { id: 'gid://shopify/DeliveryProfile/DRY_RUN' }, userErrors: [] } }, 'deliveryProfileCreate',
    );
    checkUserErrors('deliveryProfileCreate', res.deliveryProfileCreate);
    log.info(`shipping profile "Collection only": ${did('created')} with NO delivery zones, so these products can only be picked up.`);
  } catch (err: any) {
    log.warn(`shipping profile: could not create by API (${err.message}). Create it by hand – docs/STORE_SETUP_CHECKLIST.md §Delivery.`);
  }
}

// ---------------------------------------------------------------- pages
const PAGES = [
  { handle: 'about', title: 'About GBG Bargain Shop', file: 'about.html' },
  { handle: 'visit-our-shop', title: 'Visit Our Shop', file: 'visit-our-shop.html', templateSuffix: 'visit' },
  { handle: 'contact', title: 'Contact us', file: 'contact.html', templateSuffix: 'contact' },
  { handle: 'faqs', title: 'FAQs', file: 'faqs.html', templateSuffix: 'faq' },
  { handle: 'click-and-collect', title: 'Click & Collect', file: 'click-and-collect.html' },
  { handle: 'shipping-delivery', title: 'Shipping & Delivery', file: 'shipping-delivery.html' },
  { handle: 'cookie-policy', title: 'Cookie Policy', file: 'cookie-policy.html' },
];
const pageIds = new Map<string, string>(); // only pages customers can see (published)
const hiddenPages: string[] = [];

async function setupPages() {
  for (const p of PAGES) {
    const d = await client.query(`query($q: String!) { pages(first: 1, query: $q) { nodes { id handle isPublished } } }`, { q: `handle:${p.handle}` });
    const found = d.pages.nodes.find((n: any) => n.handle === p.handle);
    if (found) { if (found.isPublished) pageIds.set(p.handle, found.id); else hiddenPages.push(p.handle); log.info(`page ${p.handle}: exists – skipped (edit it in Shopify admin)`); continue; }
    const body = fs.readFileSync(path.join('content', 'pages', p.file), 'utf8');
    const res = await client.mutate(
      `mutation($page: PageCreateInput!) { pageCreate(page: $page) { page { id handle } userErrors { field message } } }`,
      { page: { title: p.title, handle: p.handle, body, isPublished: false, templateSuffix: p.templateSuffix ?? null } },
      { pageCreate: { page: { id: `gid://shopify/Page/DRY_${p.handle}`, handle: p.handle }, userErrors: [] } }, `pageCreate ${p.handle}`,
    );
    checkUserErrors(`page ${p.handle}`, res.pageCreate);
    hiddenPages.push(p.handle); // hidden until approved, so not linked in menus yet
    log.info(`page ${p.handle}: ${did('created')} as a HIDDEN draft – publish it after owner approval, then run: npm run setup:store -- --only menus`);
  }
}

// ---------------------------------------------------------------- menus
type MenuItem = { title: string; type: string; resourceId?: string; url?: string; items?: MenuItem[] };
const col = (handle: string, title?: string, items: MenuItem[] = []): MenuItem | null => {
  const id = collectionIds.get(handle);
  const def = structure.collections.find((c) => c.handle === handle);
  return id ? { title: title || def?.title || handle, type: 'COLLECTION', resourceId: id, items } : null;
};
const page = (handle: string, title: string): MenuItem | null => (pageIds.get(handle) ? { title, type: 'PAGE', resourceId: pageIds.get(handle) } : null);
const url = (title: string, u: string): MenuItem => ({ title, type: 'HTTP', url: u });
const clean = (items: (MenuItem | null)[]) => items.filter(Boolean) as MenuItem[];

function categoryItem(handle: string): MenuItem | null {
  const children = clean(structure.collections.filter((c) => c.parent === handle).map((c) => col(c.handle)));
  return col(handle, undefined, children);
}

async function upsertMenu(handle: string, title: string, items: MenuItem[]) {
  const d = await client.query(`query { menus(first: 50) { nodes { id handle } } }`);
  const existing = d.menus.nodes.find((m: any) => m.handle === handle);
  if (existing) {
    const res = await client.mutate(
      `mutation($id: ID!, $title: String!, $handle: String, $items: [MenuItemUpdateInput!]!) { menuUpdate(id: $id, title: $title, handle: $handle, items: $items) { menu { id } userErrors { field message } } }`,
      { id: existing.id, title, handle, items }, { menuUpdate: { userErrors: [] } }, `menuUpdate ${handle}`,
    );
    checkUserErrors(`menu ${handle}`, res.menuUpdate);
    log.info(`menu ${handle}: ${did('updated')} (${items.length} top-level items)`);
  } else {
    const res = await client.mutate(
      `mutation($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) { menuCreate(title: $title, handle: $handle, items: $items) { menu { id } userErrors { field message } } }`,
      { title, handle, items }, { menuCreate: { userErrors: [] } }, `menuCreate ${handle}`,
    );
    checkUserErrors(`menu ${handle}`, res.menuCreate);
    log.info(`menu ${handle}: ${did('created')} (${items.length} top-level items)`);
  }
}

async function setupMenus() {
  // Make sure we know about every existing collection and page, even if earlier steps were skipped.
  for (const c of structure.collections) {
    if (collectionIds.has(c.handle)) continue;
    const d = await client.query(`query($h: String!) { collectionByHandle(handle: $h) { id productsCount { count } } }`, { h: c.handle });
    if (d.collectionByHandle && (d.collectionByHandle.productsCount?.count ?? 0) > 0) collectionIds.set(c.handle, d.collectionByHandle.id);
  }
  for (const p of PAGES) {
    if (pageIds.has(p.handle)) continue;
    if (hiddenPages.includes(p.handle)) continue;
    const d = await client.query(`query($q: String!) { pages(first: 1, query: $q) { nodes { id handle isPublished } } }`, { q: `handle:${p.handle}` });
    const f = d.pages.nodes.find((n: any) => n.handle === p.handle);
    if (f && f.isPublished) pageIds.set(p.handle, f.id);
    else if (f) hiddenPages.push(p.handle);
  }
  const shopChildren = clean([
    categoryItem('bags-accessories'), categoryItem('shoes'), categoryItem('jewellery-watches'), categoryItem('fashion'),
    categoryItem('home-kitchen'), categoryItem('electronics-gadgets'), categoryItem('beauty-personal-care'),
    url('Shop all', '/collections/all'),
  ]);
  const main = clean([
    { title: 'Shop', type: 'HTTP', url: '/collections/all', items: shopChildren },
    col('new-arrivals'),
    col('bargains', 'Bargains', clean([col('under-5'), col('clearance'), col('last-chance')])) ?? col('under-5', 'Bargains'),
    col('clearance'),
    page('visit-our-shop', 'Visit Our Shop'),
    { title: 'Help', type: 'HTTP', url: pageIds.has('contact') ? '/pages/contact' : '/policies/refund-policy', items: clean([page('contact', 'Contact us'), page('faqs', 'FAQs'), url('Delivery', '/policies/shipping-policy'), url('Returns & refunds', '/policies/refund-policy'), url('Privacy', '/policies/privacy-policy'), url('Terms', '/policies/terms-of-service')]) },
  ]);
  const footer = clean([page('contact', 'Contact us'), page('faqs', 'FAQs'), page('shipping-delivery', 'Delivery'), page('click-and-collect', 'Click & Collect'), url('Returns & refunds', '/policies/refund-policy'), page('about', 'About us')]);
  const footerShop = clean([col('bags-accessories'), col('shoes'), col('jewellery-watches'), col('home-kitchen'), col('electronics-gadgets'), col('new-arrivals'), col('clearance')]);
  if (hiddenPages.length) log.warn(`menus: left out hidden pages (customers would get "page not found"): ${[...new Set(hiddenPages)].join(', ')}. Publish them, then run: npm run setup:store -- --only menus`);
  await upsertMenu('main-menu', 'Main menu', main);
  await upsertMenu('footer', 'Customer care', footer);
  await upsertMenu('footer-shop', 'Shop', footerShop);
}

// ---------------------------------------------------------------- policies (opt-in)
async function setupPolicies() {
  if (!args.flags.policies) { log.info('policies: skipped (add --policies after the owner/legal approve the drafts in content/policies/)'); return; }
  const map: Record<string, string> = { REFUND_POLICY: 'refund-policy.html', PRIVACY_POLICY: 'privacy-policy.html', TERMS_OF_SERVICE: 'terms-of-service.html', SHIPPING_POLICY: 'shipping-policy.html' };
  for (const [type, file] of Object.entries(map)) {
    const body = fs.readFileSync(path.join('content', 'policies', file), 'utf8');
    if (/\[TO CONFIRM/.test(body)) log.warn(`policy ${type}: still contains [TO CONFIRM] placeholders – fix before publishing!`);
    const res = await client.mutate(
      `mutation($shopPolicy: ShopPolicyInput!) { shopPolicyUpdate(shopPolicy: $shopPolicy) { shopPolicy { id } userErrors { field message } } }`,
      { shopPolicy: { type, body } }, { shopPolicyUpdate: { userErrors: [] } }, `shopPolicyUpdate ${type}`,
    );
    checkUserErrors(`policy ${type}`, res.shopPolicyUpdate);
    log.info(`policy ${type}: ${did('updated')}`);
  }
}

async function recordVersion() {
  const d = await client.query(`query { shop { id } }`);
  const res = await client.mutate(
    `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }`,
    { m: [{ ownerId: d.shop.id, namespace: 'gbg', key: 'structure_version', type: 'single_line_text_field', value: STRUCTURE_VERSION }] },
    { metafieldsSet: { userErrors: [] } }, 'record structure version',
  );
  checkUserErrors('structure version', res.metafieldsSet);
  log.info(`structure version ${STRUCTURE_VERSION} ${did('recorded')} on the shop`);
}

try {
  log.info(`Setting up ${config.storeDomain}${args.dryRun ? ' – DRY RUN, nothing will change' : ''}`);
  if (step('metafields')) await setupMetafields();
  if (step('location') || step('shipping')) await setupLocation();
  if (step('collections')) await setupCollections();
  if (step('shipping')) await setupCollectionOnlyProfile();
  if (step('pages')) await setupPages();
  if (step('menus')) await setupMenus();
  if (step('policies')) await setupPolicies();
  await recordVersion();
  log.info(`Finished. Log: ${log.file}`);
} catch (err: any) {
  log.error(err.message);
  process.exit(1);
}
