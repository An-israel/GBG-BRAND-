// Offline design preview: renders the real theme Liquid with mock data
// (tools/preview/data.mjs) using liquidjs plus small stand-ins for Shopify
// filters/tags. It is a design-review tool, NOT a replacement for
// `shopify theme dev` – checkout, cart APIs and search do not run here.
//
// Usage: node tools/preview/render.mjs  → writes tools/preview/out/*.html
import { Liquid } from 'liquidjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products, collections, linklists, pages } from './data.mjs';
import { images } from './mock-images.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const themeDir = path.resolve(here, '../../theme');
const outDir = path.join(here, 'out');
fs.mkdirSync(path.join(outDir, 'preview-images'), { recursive: true });
for (const [name, svg] of Object.entries(images)) fs.writeFileSync(path.join(outDir, 'preview-images', `${name}.svg`), svg);
fs.cpSync(path.join(themeDir, 'assets'), path.join(outDir, 'assets'), { recursive: true });

const liquid = new Liquid({ root: [path.join(themeDir, 'sections')], partials: path.join(themeDir, 'snippets'), extname: '.liquid', jsTruthy: false, strictFilters: true });

// ---------- helpers ----------
const kw = (args) => Object.fromEntries(args.filter(Array.isArray));
const money = (c) => (c == null ? '' : `£${(Number(c) / 100).toFixed(2)}`);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// ---------- Shopify filter stand-ins ----------
const filters = {
  money, money_with_currency: (c) => `${money(c)} GBP`, money_without_currency: (c) => (Number(c) / 100).toFixed(2),
  asset_url: (n) => `/assets/${n}`, shopify_asset_url: (n) => `/assets/${n}`,
  stylesheet_tag: (u) => `<link rel="stylesheet" href="${u}">`,
  preload_tag: (u, ...a) => { const o = kw(a); return `<link rel="preload" href="${u}" as="${o.as}" type="${o.type || ''}" crossorigin>`; },
  image_url: (i) => (i && typeof i === 'object' ? i.src : i),
  image_tag: (src, ...a) => {
    const o = kw(a);
    const attrs = Object.entries(o).filter(([k]) => !['widths', 'preload'].includes(k)).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
    return `<img src="${src}" ${attrs.includes('width=') ? '' : 'width="600" height="600"'} ${attrs.includes('alt=') ? '' : 'alt=""'} ${attrs}>`;
  },
  placeholder_svg_tag: (n, cls) => `<svg class="${cls || ''}" viewBox="0 0 100 100"><rect width="100" height="100"/></svg>`,
  payment_type_svg_tag: (t) => `<svg class="payment-icon" viewBox="0 0 38 24"><rect width="38" height="24" rx="3" fill="#fff"/><text x="19" y="15" font-size="7" text-anchor="middle" fill="#0B1F3A" font-family="Arial">${t.slice(0, 6)}</text></svg>`,
  t: (k) => k, handle: (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  pluralize: (n, a, b) => (Number(n) === 1 ? a : b),
  default_errors: () => '', format_address: () => '', format_code: (s) => s, media_tag: () => '', default_pagination: () => '',
  link_to: (t, u) => `<a href="${u}">${t}</a>`,
};
for (const [k, f] of Object.entries(filters)) liquid.registerFilter(k, f);

// ---------- Shopify tag stand-ins ----------
function blockTag(name, open) {
  liquid.registerTag(name, {
    parse(token, remain) {
      this.args = token.args; this.tpls = [];
      const stream = this.liquid.parser.parseStream(remain)
        .on(`tag:end${name}`, () => stream.stop())
        .on('template', (t) => this.tpls.push(t))
        .on('end', () => { throw new Error(`${name} not closed`); });
      stream.start();
    },
    * render(ctx, emitter) {
      const extra = open(this.args, ctx);
      ctx.push(extra.scope || {});
      const html = yield this.liquid.renderer.renderTemplates(this.tpls, ctx);
      ctx.pop();
      emitter.write((extra.before || '') + html + (extra.after || ''));
    },
  });
}
blockTag('form', (args) => {
  const type = (args.match(/'([a-z_]+)'/) || [])[1];
  const cls = (args.match(/class: '([^']+)'/) || [])[1] || '';
  const id = (args.match(/id: '([^']+)'/) || [])[1] || '';
  const action = { product: '/cart/add', customer: '/contact#newsletter', contact: '/contact' }[type] || '/account';
  // Pass through data-* / novalidate attributes the same way Shopify's form tag does.
  const extra = [...args.matchAll(/([a-z][\w-]*): '([^']*)'/g)].filter(([, k]) => !['class', 'id'].includes(k)).map(([, k, v]) => ` ${k}="${v}"`).join('');
  return { scope: { form: { errors: null, 'posted_successfully?': false } }, before: `<form method="post" action="${action}" class="${cls}" id="${id}"${extra}>`, after: '</form>' };
});
blockTag('paginate', () => ({ scope: { paginate: { next: null, pages: 1, current_offset: 0 } } }));
liquid.registerTag('schema', {
  parse(token, remain) { while (remain.length) { const t = remain.shift(); if (t.name === 'endschema') return; } },
  render() { return ''; },
});

// ---------- sections ----------
function schemaOf(type) {
  const src = fs.readFileSync(path.join(themeDir, 'sections', `${type}.liquid`), 'utf8');
  const m = src.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  return m ? JSON.parse(m[1]) : { settings: [] };
}
const defaults = (list = []) => Object.fromEntries(list.filter((s) => 'default' in s).map((s) => [s.id, s.default]));
// Section settings point at handles; resolve them against the data of the page being
// rendered (so the "fresh store" scenario only sees its own collections/menus/pages).
let current = { collections, linklists, pages };
function resolve(value, def) {
  if (def && def.type === 'collection' && typeof value === 'string') return current.collections[value] || null;
  if (def && def.type === 'link_list' && typeof value === 'string') return current.linklists[value] || null;
  if (def && def.type === 'page' && typeof value === 'string') return current.pages[value] || null;
  return value;
}
function buildSettings(schemaSettings, values) {
  const out = defaults(schemaSettings);
  for (const s of schemaSettings || []) {
    if (s.id && s.id in (values || {})) out[s.id] = values[s.id];
    if (s.id) out[s.id] = resolve(out[s.id], s) ?? (['image_picker', 'url', 'page', 'collection'].includes(s.type) ? null : out[s.id]);
  }
  return out;
}
let sectionIndex = 0;
async function renderSection(id, data, globals) {
  current = { collections: globals.collections || collections, linklists: globals.linklists || linklists, pages: globals.pages || pages };
  const schema = schemaOf(data.type);
  const blocks = (data.block_order || []).map((bid) => {
    const b = data.blocks[bid];
    const bs = (schema.blocks || []).find((x) => x.type === b.type) || {};
    const settings = buildSettings(bs.settings, b.settings);
    // Preview-only: fill hero photo slots with sample product images.
    if (data.type === 'hero' && b.type === 'image' && !settings.image && !globals.__noHeroMock) {
      const pick = ['handbag', 'trainers', 'watch', 'mug'][data.block_order.indexOf(bid) % 4];
      settings.image = { src: `/preview-images/${pick}.svg`, alt: `Sample ${pick}`, aspect_ratio: 1 };
      settings.price_label = { handbag: '£12.99', trainers: '£15.00', watch: '£11.99', mug: '£2.50' }[pick];
    }
    return { id: bid, type: b.type, settings, shopify_attributes: '' };
  });
  sectionIndex += 1;
  const section = { id: `${id}`, index: sectionIndex, settings: buildSettings(schema.settings, data.settings), blocks };
  const html = await liquid.renderFile(data.type, { section }, { globals });
  return `<div id="shopify-section-${id}" class="shopify-section ${schema.class || ''}">${html}</div>`;
}
async function renderGroup(name, globals) {
  const g = JSON.parse(fs.readFileSync(path.join(themeDir, 'sections', `${name}.json`), 'utf8'));
  let out = '';
  for (const id of g.order) out += await renderSection(id, g.sections[id], globals);
  return out;
}
liquid.registerTag('sections', {
  parse(token) { this.name = token.args.replace(/['"]/g, '').trim(); },
  * render(ctx, emitter) { emitter.write(yield renderGroup(this.name, ctx.globals)); },
});

// ---------- settings ----------
const settingsSchema = JSON.parse(fs.readFileSync(path.join(themeDir, 'config/settings_schema.json'), 'utf8'));
const settingsData = JSON.parse(fs.readFileSync(path.join(themeDir, 'config/settings_data.json'), 'utf8'));
const allSettingDefs = settingsSchema.flatMap((g) => g.settings || []);
const settings = buildSettings(allSettingDefs, { ...settingsData.presets.Default,
  // Preview-only: show every optional feature so the design can be reviewed.
  whatsapp_enabled: true, claim_uk_delivery: true, claim_free_collection: true,
});

// ---------- pages ----------
const policies = ['Refund policy', 'Privacy policy', 'Terms of service', 'Shipping policy'].map((t) => ({ title: t, url: `/policies/${t.toLowerCase().replace(/ /g, '-')}` }));
// Shopify lets themes both loop over `collections` and look one up by handle; an array
// with named properties behaves the same way in liquidjs.
const asShopifyList = (obj) => Object.assign(Object.values(obj), obj);
const base = {
  settings, collections: asShopifyList(collections), linklists, pages,
  shop: { name: 'GBG Bargain Shop', url: '/', customer_accounts_enabled: true, enabled_payment_types: ['visa', 'master', 'apple_pay', 'google_pay'], policies, privacy_policy: policies[1], refund_policy: policies[0], shipping_policy: policies[3], description: 'Big bargains. Small prices.' },
  routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', search_url: '/search', predictive_search_url: '/search/suggest', product_recommendations_url: '/recommendations/products', all_products_collection_url: '/collections/all', account_url: '/account', account_login_url: '/account/login', account_register_url: '/account/register', account_logout_url: '/account/logout', account_addresses_url: '/account/addresses', collections_url: '/collections' },
  cart: { item_count: 0, items: [], total_price: 0, currency: { iso_code: 'GBP' }, taxes_included: true, cart_level_discount_applications: [] },
  canonical_url: 'https://www.gbgbargainshop.co.uk/', current_page: 1, current_tags: null, customer: null,
  content_for_header: '', all_country_option_tags: '',
};

async function renderTemplate(name, extra, file) {
  sectionIndex = 0;
  const globals = { ...base, ...extra };
  const tpl = JSON.parse(fs.readFileSync(path.join(themeDir, 'templates', `${name}.json`), 'utf8'));
  let content = '';
  for (const id of tpl.order) content += await renderSection(id, tpl.sections[id], globals);
  const layout = fs.readFileSync(path.join(themeDir, 'layout/theme.liquid'), 'utf8');
  const html = await liquid.parseAndRender(layout, { content_for_layout: content }, { globals });
  fs.writeFileSync(path.join(outDir, file), html);
  console.log(`rendered ${file}`);
}

const req = (page_type, extra = {}) => ({ request: { page_type, design_mode: false, origin: 'https://www.gbgbargainshop.co.uk', locale: { iso_code: 'en' } }, ...extra });
const productPage = products[0];
await renderTemplate('index', { ...req('index'), page_title: 'GBG Bargain Shop' }, 'index.html');
await renderTemplate('collection', { ...req('collection'), collection: collections.bags, page_title: 'Bags & Accessories' }, 'collection.html');
await renderTemplate('product', { ...req('product'), product: productPage, collection: collections.bags, page_title: productPage.title, recommendations: { performed: true, products_count: 4, products: products.slice(5, 9) } }, 'product.html');
await renderTemplate('product', { ...req('product'), product: products[3], page_title: products[3].title, recommendations: { performed: false } }, 'product-variants.html');
await renderTemplate('product', { ...req('product'), product: products[11], page_title: products[11].title, recommendations: { performed: false } }, 'product-electrical.html');
await renderTemplate('product', { ...req('product'), product: products[10], page_title: products[10].title, recommendations: { performed: false } }, 'product-collection-only.html');
await renderTemplate('cart', { ...req('cart'), page_title: 'Your basket' }, 'cart.html');
await renderTemplate('search', { ...req('search'), search: { performed: true, terms: 'sofa', results_count: 0, results: [], filters: [] }, page_title: 'Search' }, 'search-empty.html');
await renderTemplate('404', { ...req('404'), page_title: 'Page not found' }, '404.html');
await renderTemplate('page.visit', { ...req('page'), page: pages['visit-our-shop'], page_title: 'Visit Our Shop' }, 'visit.html');
await renderTemplate('page.faq', { ...req('page'), page: pages.faqs, page_title: 'FAQs' }, 'faq.html');
await renderTemplate('page.contact', { ...req('page'), page: pages.contact, page_title: 'Contact us' }, 'contact.html');
// Cart drawer with items, rendered on the collection page
const cartFull = { ...base.cart, item_count: 2, total_price: 1749, items: [
  { key: 'a', url: products[0].url, image: products[0].featured_media.preview_image, product: products[0], variant: products[0].variants[0], quantity: 1, original_line_price: 1299, final_line_price: 1299 },
  { key: 'b', url: products[10].url, image: products[10].featured_media.preview_image, product: products[10], variant: products[10].variants[0], quantity: 1, original_line_price: 450, final_line_price: 450 },
] };
await renderTemplate('cart', { ...req('cart'), cart: cartFull, page_title: 'Your basket' }, 'cart-full.html');
// Same product with the delivery/collection claims switched OFF (honesty check) and no VAT number.
{
  const off = { ...settings, claim_uk_delivery: false, claim_free_collection: false, claim_free_delivery: false, claim_fast_track: false, vat_number: '' };
  await renderTemplate('product', { ...req('product'), settings: off, product: products[0], collection: collections.bags, page_title: products[0].title, recommendations: { performed: false } }, 'product-claims-off.html');
  await renderTemplate('index', { ...req('index'), settings: off, page_title: 'GBG Bargain Shop' }, 'index-claims-off.html');
}
// Account login (password-reset box) and a search with results + filters.
await renderTemplate('customers/login', { ...req('customers/login'), page_title: 'Log in' }, 'login.html');
{
  const results = products.slice(0, 6).map((p) => ({ ...p, object_type: 'product' }));
  const search = { performed: true, terms: 'bag', results_count: results.length, results, sort_by: 'relevance', default_sort_by: 'relevance', filters: collections.all.filters };
  await renderTemplate('search', { ...req('search'), search, page_title: 'Search: bag' }, 'search-results.html');
}

// Site map (/collections)
await renderTemplate('list-collections', { ...req('list-collections'), page_title: 'Site map' }, 'sitemap.html');

// ---------- "Fresh store" scenario: what the client sees right after uploading the theme ----------
// Old DBS menus and collections still in the store, none of the GBG collections, no new pages,
// no photos uploaded in the theme editor.
{
  const p = products.slice(0, 8);
  const mk = (handle, title, prods) => ({ ...collections.all, handle, title, url: `/collections/${handle}`, products: prods, products_count: prods.length, all_products_count: prods.length, featured_image: null, description: '' });
  const fresh = asShopifyList({
    all: mk('all', 'All products', p),
    'dbs-summer-picks': mk('dbs-summer-picks', 'Handbags', p.slice(0, 3)),
    'footwear': mk('footwear', 'Footwear', p.slice(3, 5)),
    'old-empty-collection': mk('old-empty-collection', 'Old empty collection', []),
    'gifts': mk('gifts', 'Gifts & jewellery', p.slice(5, 8)),
  });
  const dbsMenu = { links: [{ title: 'DBS Home', url: '/', type: 'frontpage_link', links: [] }, { title: 'DBS Sale', url: '/collections/dbs-sale', type: 'collection_link', object: { products_count: 0 }, links: [] }] };
  const freshGlobals = { collections: fresh, pages: {}, linklists: { 'main-menu': dbsMenu, footer: dbsMenu, 'footer-shop': dbsMenu } };
  await renderTemplate('index', { ...req('index'), ...freshGlobals, page_title: 'GBG Bargain Shop', __noHeroMock: true }, 'fresh-index.html');
  await renderTemplate('list-collections', { ...req('list-collections'), ...freshGlobals, page_title: 'Site map' }, 'fresh-sitemap.html');
}
