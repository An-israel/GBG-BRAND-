import { describe, expect, it } from 'vitest';
import { COL, validateRows, groupByHandle, draftAltText, type Row } from '../../scripts/lib/products.js';
import { readCsv } from '../../scripts/lib/csv.js';

const opts = { categoryTags: ['bags', 'handbags', 'electronics', 'speakers'], electricalTags: ['electronics', 'speakers'] };
const base = (over: Partial<Row> = {}): Row => ({
  [COL.handle]: 'tan-tote-bag', [COL.title]: 'Tan faux-leather tote bag', [COL.tags]: 'bags, handbags',
  [COL.sku]: 'GBG-1', [COL.price]: '12.99', [COL.grams]: '600', [COL.qty]: '1', [COL.policy]: 'deny', [COL.tracker]: 'shopify',
  [COL.condition]: 'New', ...over,
});
const errors = (rows: Row[]) => validateRows(rows, opts).filter((i) => i.level === 'error');

describe('validateRows', () => {
  it('accepts a correct row', () => expect(errors([base()])).toEqual([]));
  it('accepts the shipped CSV template', () => {
    const issues = validateRows(readCsv('templates/gbg_products_template.csv'), { categoryTags: ['bags', 'handbags', 'shoes', 'womens-shoes', 'electronics', 'speakers'], electricalTags: ['electronics', 'speakers'] });
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
  });
  it('rejects duplicate SKUs', () => {
    const e = errors([base(), base({ [COL.handle]: 'other-bag-item', [COL.title]: 'Another bag item here' })]);
    expect(e.some((i) => i.field === COL.sku && /more than once/.test(i.message))).toBe(true);
  });
  it('requires price and weight', () => {
    const e = errors([base({ [COL.price]: '', [COL.grams]: '0' })]);
    expect(e.map((i) => i.field)).toEqual(expect.arrayContaining([COL.price, COL.grams]));
  });
  it('rejects an invalid condition', () => {
    expect(errors([base({ [COL.condition]: 'Like new' })]).some((i) => i.field === COL.condition)).toBe(true);
  });
  it('requires tested for electricals', () => {
    expect(errors([base({ [COL.tags]: 'electronics, speakers' })]).some((i) => i.field === COL.tested)).toBe(true);
    expect(errors([base({ [COL.tags]: 'electronics, speakers', [COL.tested]: 'Tested working' })])).toEqual([]);
  });
  it('rejects a compare-at price that is not higher than the price', () => {
    expect(errors([base({ [COL.compareAt]: '12.99' })]).some((i) => i.field === COL.compareAt)).toBe(true);
    expect(errors([base({ [COL.compareAt]: '19.99' })])).toEqual([]);
  });
  it('rejects DBS text anywhere except internal notes', () => {
    expect(errors([base({ [COL.body]: '<p>From DBS Accessories</p>' })]).some((i) => /DBS/.test(i.message))).toBe(true);
    expect(errors([base({ [COL.internalNotes]: 'old DBS stock' })])).toEqual([]);
  });
  it('checks title length', () => {
    expect(errors([base({ [COL.title]: 'Bag' })]).some((i) => i.field === COL.title)).toBe(true);
    expect(errors([base({ [COL.title]: 'x'.repeat(121) })]).some((i) => i.field === COL.title)).toBe(true);
  });
  it('requires a category tag that maps to a collection', () => {
    expect(errors([base({ [COL.tags]: 'random' })]).some((i) => i.field === COL.tags)).toBe(true);
  });
  it('forbids overselling', () => {
    expect(errors([base({ [COL.policy]: 'continue' })]).some((i) => i.field === COL.policy)).toBe(true);
  });
  it('checks photo folders when a photos dir is given', () => {
    const e = validateRows([base()], { ...opts, photosDir: 'does-not-exist' });
    expect(e.some((i) => i.field === 'Photos')).toBe(true);
  });
  it('validates variant rows that only carry variant fields', () => {
    const rows = [base({ [COL.option1Name]: 'Size', [COL.option1Value]: '5' }), { [COL.handle]: 'tan-tote-bag', [COL.option1Value]: '6', [COL.sku]: 'GBG-2', [COL.price]: '12.99', [COL.grams]: '600', [COL.qty]: '1' }];
    expect(errors(rows)).toEqual([]);
    expect(groupByHandle(rows)[0].rows).toHaveLength(2);
  });
});

describe('draftAltText', () => {
  it('describes title, colour and angle', () => {
    expect(draftAltText('Leather tote bag', 0, 'Tan')).toBe('Leather tote bag – Tan – front view');
    expect(draftAltText('Tan tote bag', 1, 'tan')).toBe('Tan tote bag – side view');
  });
});

describe('colour and Last Chance rules', () => {
  it('warns when a bag has no colour, but does not block the import', () => {
    const issues = validateRows([base()], opts);
    expect(issues.some((i) => i.field === COL.colour && i.level === 'warning')).toBe(true);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(validateRows([base({ [COL.colour]: 'Tan' })], opts).some((i) => i.field === COL.colour)).toBe(false);
  });
});
