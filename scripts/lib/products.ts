/**
 * Product CSV format + validation rules (pure functions – unit tested).
 *
 * The CSV matches Shopify's product CSV format, so it can also be imported
 * through Shopify admin. GBG extra fields use Shopify's own metafield column
 * syntax: "Label (product.metafields.custom.key)".
 */
import fs from 'node:fs';
import path from 'node:path';

export const CONDITIONS = ['New', 'New with tags', 'Open box', 'Customer return', 'Used', 'Unchecked'] as const;
export const TESTED = ['Tested working', 'Untested', 'Not applicable'] as const;

export const COL = {
  handle: 'Handle',
  title: 'Title',
  body: 'Body (HTML)',
  vendor: 'Vendor',
  category: 'Product Category',
  type: 'Type',
  tags: 'Tags',
  published: 'Published',
  option1Name: 'Option1 Name',
  option1Value: 'Option1 Value',
  option2Name: 'Option2 Name',
  option2Value: 'Option2 Value',
  sku: 'Variant SKU',
  grams: 'Variant Grams',
  tracker: 'Variant Inventory Tracker',
  qty: 'Variant Inventory Qty',
  policy: 'Variant Inventory Policy',
  fulfillment: 'Variant Fulfillment Service',
  price: 'Variant Price',
  compareAt: 'Variant Compare At Price',
  requiresShipping: 'Variant Requires Shipping',
  taxable: 'Variant Taxable',
  barcode: 'Variant Barcode',
  imageSrc: 'Image Src',
  imagePosition: 'Image Position',
  imageAlt: 'Image Alt Text',
  giftCard: 'Gift Card',
  seoTitle: 'SEO Title',
  seoDescription: 'SEO Description',
  weightUnit: 'Variant Weight Unit',
  cost: 'Cost per item',
  status: 'Status',
  condition: 'Condition (product.metafields.custom.condition)',
  conditionNotes: 'Condition notes (product.metafields.custom.condition_notes)',
  dimensions: 'Dimensions (product.metafields.custom.dimensions)',
  colour: 'Colour (product.metafields.custom.colour)',
  collectionOnly: 'Collection only (product.metafields.custom.collection_only)',
  tested: 'Tested (product.metafields.custom.tested)',
  internalNotes: 'Internal notes (product.metafields.custom.internal_notes)',
} as const;

export const HEADERS: string[] = Object.values(COL);

export type Row = Record<string, string>;

export interface Issue {
  row: number; // 1-based data row number as shown in a spreadsheet (header = row 1)
  sku: string;
  field: string;
  level: 'error' | 'warning';
  message: string;
}

export interface ValidateOptions {
  categoryTags: string[];
  electricalTags: string[];
  photosDir?: string; // when set, checks photos/<SKU>/ has at least one image
}

const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;
const COLOUR_EXPECTED = new Set(['bags', 'shoes', 'fashion', 'handbags', 'backpacks', 'purses', 'womens-shoes', 'mens-shoes', 'kids-shoes', 'womens-fashion', 'mens-fashion', 'kids-fashion']);
const DBS_RE = /\bdbs\b/i;

export const splitTags = (t: string | undefined) => (t || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
export const isTrue = (v: string | undefined) => /^(true|yes|y|1)$/i.test((v || '').trim());
const num = (v: string | undefined) => (v === undefined || v.trim() === '' ? NaN : Number(v.replace(/[£,\s]/g, '')));

/** A row that only carries an extra image (Shopify CSV style) has a handle but no SKU/title. */
export const isImageOnlyRow = (r: Row) => !r[COL.title] && !r[COL.sku] && !r[COL.option1Value] && !!r[COL.handle];

export function validateRows(rows: Row[], opts: ValidateOptions): Issue[] {
  const issues: Issue[] = [];
  const seenSku = new Map<string, number>();
  const titleByHandle = new Map<string, string>();
  const tagsByHandle = new Map<string, string[]>();
  const categories = new Set(opts.categoryTags.map((t) => t.toLowerCase()));
  const electrical = new Set(opts.electricalTags.map((t) => t.toLowerCase()));

  rows.forEach((r, i) => {
    const rowNo = i + 2;
    const sku = (r[COL.sku] || '').trim();
    const add = (field: string, level: Issue['level'], message: string) => issues.push({ row: rowNo, sku, field, level, message });
    const handle = (r[COL.handle] || '').trim();

    // DBS text must never appear anywhere (brief §7.5, §15).
    for (const [k, v] of Object.entries(r)) {
      if (k === COL.internalNotes) continue;
      if (v && DBS_RE.test(v)) add(k, 'error', 'Contains "DBS" – the old brand must not appear on GBG listings.');
    }
    if (!handle) add(COL.handle, 'error', 'Handle is required (lower-case words joined by hyphens, e.g. tan-tote-bag).');
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(handle)) add(COL.handle, 'error', 'Handle must be lower-case letters, numbers and hyphens only.');
    if (isImageOnlyRow(r)) return;

    // First row of a product carries the product-level fields.
    const isFirstOfProduct = !titleByHandle.has(handle);
    if (isFirstOfProduct) {
      const title = (r[COL.title] || '').trim();
      titleByHandle.set(handle, title);
      if (!title) add(COL.title, 'error', 'Title is required.');
      else if (title.length < 10) add(COL.title, 'error', `Title is too short (${title.length} characters). Describe the item: colour, material, type, size.`);
      else if (title.length > 120) add(COL.title, 'error', `Title is too long (${title.length} characters, max 120).`);
      else if (title.length > 70) add(COL.title, 'warning', `Title is ${title.length} characters – search results cut off after about 70.`);
      if (/genuine|designer|authentic|original brand/i.test(title + ' ' + (r[COL.body] || ''))) {
        add(COL.title, 'warning', 'Authenticity wording found ("genuine", "designer", "authentic"). Only use it if the owner can prove it.');
      }

      const tags = splitTags(r[COL.tags]);
      tagsByHandle.set(handle, tags);
      if (!tags.some((t) => categories.has(t))) {
        add(COL.tags, 'error', `No category tag. Add at least one of: ${[...categories].slice(0, 8).join(', ')}…`);
      }

      const condition = (r[COL.condition] || '').trim();
      if (!condition) add(COL.condition, 'error', `Condition is required: ${CONDITIONS.join(' / ')}.`);
      else if (!(CONDITIONS as readonly string[]).includes(condition)) add(COL.condition, 'error', `"${condition}" is not a valid condition. Use exactly one of: ${CONDITIONS.join(' / ')}.`);
      else if (['Customer return', 'Used', 'Unchecked', 'Open box'].includes(condition) && !(r[COL.conditionNotes] || '').trim()) {
        add(COL.conditionNotes, 'warning', `Condition is "${condition}" – describe any faults, missing parts or wear in Condition notes.`);
      }

      const tested = (r[COL.tested] || '').trim();
      const isElectrical = tags.some((t) => electrical.has(t));
      if (tested && !(TESTED as readonly string[]).includes(tested)) add(COL.tested, 'error', `"${tested}" is not valid. Use: ${TESTED.join(' / ')}.`);
      if (isElectrical && !tested) add(COL.tested, 'error', 'Electrical item: "Tested" must be filled in (Tested working / Untested / Not applicable).');
      if (isElectrical && tested === 'Not applicable') add(COL.tested, 'warning', 'Electrical item marked "Not applicable" – check this is right.');

      const colour = (r[COL.colour] || '').trim();
      if (colour && (colour.length > 30 || /[,;/]/.test(colour) && colour.split(/[,;/]/).length > 3)) {
        add(COL.colour, 'warning', 'Colour should be a short main colour name (e.g. "Tan", "Navy", "Multicolour") so the colour filter stays tidy.');
      }
      if (!colour && tags.some((t) => COLOUR_EXPECTED.has(t))) {
        add(COL.colour, 'warning', 'Add the main colour – shoppers can filter bags, shoes and clothing by colour.');
      }

      const co = (r[COL.collectionOnly] || '').trim();
      if (co && !/^(true|false)$/i.test(co)) add(COL.collectionOnly, 'error', 'Collection only must be TRUE or FALSE.');

      const status = (r[COL.status] || '').trim().toLowerCase();
      if (status && !['active', 'draft', 'archived'].includes(status)) add(COL.status, 'error', 'Status must be active, draft or archived.');

      if (opts.photosDir && sku) {
        const dir = path.join(opts.photosDir, sku);
        const ok = fs.existsSync(dir) && fs.readdirSync(dir).some((f) => IMAGE_EXT.test(f));
        if (!ok) add('Photos', 'error', `No photos found in ${dir}/ – put the item's photos in a folder named exactly after the SKU.`);
      }
    }

    // Variant-level checks (every row)
    if (!sku) add(COL.sku, 'error', 'SKU is required and must be unique.');
    else if (seenSku.has(sku)) add(COL.sku, 'error', `SKU "${sku}" is used more than once (also on row ${seenSku.get(sku)}).`);
    else seenSku.set(sku, rowNo);

    const price = num(r[COL.price]);
    if (Number.isNaN(price) || price <= 0) add(COL.price, 'error', 'Price is required and must be more than 0 (e.g. 4.99).');
    const compare = num(r[COL.compareAt]);
    if (!Number.isNaN(compare) && !Number.isNaN(price) && compare <= price) {
      add(COL.compareAt, 'error', 'Compare-at ("was") price must be higher than the price – or leave it empty. Only use a genuine, provable was-price.');
    }
    const grams = num(r[COL.grams]);
    if (Number.isNaN(grams) || grams <= 0) add(COL.grams, 'error', 'Weight in grams is required for delivery prices (weigh it, packaging included).');

    const qty = num(r[COL.qty]);
    if (Number.isNaN(qty) || !Number.isInteger(qty) || qty < 0) add(COL.qty, 'error', 'Stock quantity must be a whole number (0 or more).');
    const policy = (r[COL.policy] || 'deny').trim().toLowerCase();
    if (policy !== 'deny') add(COL.policy, 'error', 'Inventory policy must be "deny" – overselling is switched off for every product.');
    const tracker = (r[COL.tracker] || 'shopify').trim().toLowerCase();
    if (tracker !== 'shopify') add(COL.tracker, 'error', 'Inventory tracker must be "shopify" so stock is tracked.');
    const cost = num(r[COL.cost]);
    if (r[COL.cost] && (Number.isNaN(cost) || cost < 0)) add(COL.cost, 'error', 'Cost per item must be a number.');
  });
  return issues;
}

export interface ProductGroup {
  handle: string;
  rows: Row[]; // variant rows (first row also holds product fields)
  firstRowNumber: number;
}

/** Groups CSV rows into products by Handle, skipping image-only rows. */
export function groupByHandle(rows: Row[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();
  rows.forEach((r, i) => {
    const handle = (r[COL.handle] || '').trim();
    if (!handle || isImageOnlyRow(r)) return;
    if (!map.has(handle)) map.set(handle, { handle, rows: [], firstRowNumber: i + 2 });
    map.get(handle)!.rows.push(r);
  });
  return [...map.values()];
}

/** Draft alt text from title, colour and angle – always flagged for human review. */
export function draftAltText(title: string, index: number, colour?: string): string {
  const angles = ['front view', 'side view', 'back view', 'detail', 'label', 'close-up of condition'];
  const angle = angles[index] ?? `view ${index + 1}`;
  return [title, colour && !title.toLowerCase().includes(colour.toLowerCase()) ? colour : '', angle].filter(Boolean).join(' – ');
}

export function formatIssues(issues: Issue[]): string {
  if (!issues.length) return 'No problems found. ✔';
  const lines = issues
    .sort((a, b) => a.row - b.row || (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))
    .map((i) => `Row ${i.row}${i.sku ? ` (SKU ${i.sku})` : ''} – ${i.level.toUpperCase()} – ${i.field}: ${i.message}`);
  const e = issues.filter((i) => i.level === 'error').length;
  const w = issues.length - e;
  return `${lines.join('\n')}\n\n${e} error(s), ${w} warning(s). Fix every ERROR before importing.`;
}
