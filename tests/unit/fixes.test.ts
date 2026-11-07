// Regression tests for the inspection-report fixes (docs/INSPECTION_REPORT.md).
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { Liquid } from 'liquidjs';
import { COL, canonicalChoice, CONDITIONS, parseMoney, validateRows, type Row } from '../../scripts/lib/products.js';
import { isHeic, naturalSort } from '../../scripts/prepare-images.js';

const opts = { categoryTags: ['bags', 'handbags'], electricalTags: ['electronics'] };
const base = (over: Partial<Row> = {}): Row => ({
  [COL.handle]: 'tan-tote-bag', [COL.title]: 'Tan faux-leather tote bag', [COL.tags]: 'bags', [COL.colour]: 'Tan',
  [COL.sku]: 'GBG-1', [COL.price]: '12.99', [COL.grams]: '600', [COL.qty]: '1', [COL.condition]: 'New', ...over,
});
const errs = (rows: Row[]) => validateRows(rows, opts).filter((i) => i.level === 'error');

describe('#1 prices', () => {
  it('reads UK prices', () => {
    expect(parseMoney('12.99')).toBe(12.99);
    expect(parseMoney('£4')).toBe(4);
    expect(parseMoney('1,299.00')).toBe(1299);
  });
  it('never reads "12,99" as £1,299', () => {
    expect(parseMoney('12,99')).toBeNaN();
    const e = errs([base({ [COL.price]: '12,99' })]);
    expect(e.some((i) => /comma for pence/.test(i.message))).toBe(true);
  });
  it('rejects text in prices', () => expect(parseMoney('12.99p')).toBeNaN());
});

describe('#2 products with two options', () => {
  const v = (sku: string, a: string, b: string, first = false): Row => ({
    [COL.handle]: 'two-bag', [COL.sku]: sku, [COL.option1Value]: a, [COL.option2Value]: b, [COL.price]: '9.99', [COL.grams]: '100', [COL.qty]: '1',
    ...(first ? { [COL.title]: 'Two option bag example', [COL.tags]: 'bags', [COL.colour]: 'Red', [COL.condition]: 'New', [COL.option1Name]: 'Size', [COL.option2Name]: 'Colour' } : {}),
  });
  it('accepts different combinations', () => expect(errs([v('A', 'S', 'Red', true), v('B', 'S', 'Blue'), v('C', 'M', 'Red')])).toEqual([]));
  it('rejects a repeated combination', () => {
    expect(errs([v('A', 'S', 'Red', true), v('B', 'S', 'Red')]).some((i) => /Same options/.test(i.message))).toBe(true);
  });
  it('rejects a missing option value', () => {
    expect(errs([v('A', 'S', 'Red', true), v('B', 'M', '')]).some((i) => /Missing value for option "Colour"/.test(i.message))).toBe(true);
  });
});

describe('#32 forgiving spelling, strict content', () => {
  it('corrects capital letters with a warning', () => {
    expect(canonicalChoice('new WITH tags', CONDITIONS)).toBe('New with tags');
    const issues = validateRows([base({ [COL.condition]: 'new with tags' })], opts);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(issues.some((i) => /will be saved as "New with tags"/.test(i.message))).toBe(true);
  });
  it('rejects HTML in titles', () => expect(errs([base({ [COL.title]: '<b>Tan</b> tote bag in faux leather' })]).some((i) => /HTML/.test(i.message))).toBe(true));
});

describe('#3 / #4 photos', () => {
  it('orders IMG_9 before IMG_10', () => expect(['IMG_10.jpg', 'IMG_9.jpg', 'IMG_1.jpg'].sort(naturalSort)).toEqual(['IMG_1.jpg', 'IMG_9.jpg', 'IMG_10.jpg']));
  it('recognises iPhone HEIC files by their content', () => {
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(16)]);
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(isHeic(heic)).toBe(true);
    expect(isHeic(jpg)).toBe(false);
  });
});

// ---------- Liquid: announcement bar end dates (#7) ----------
const liquid = new Liquid({ root: ['theme/sections'], partials: 'theme/snippets', extname: '.liquid' });
liquid.registerTag('schema', { parse(_t: any, remain: any[]) { while (remain.length) { if (remain.shift().name === 'endschema') return; } }, render() { return ''; } });
const announce = (end_date: string) => liquid.renderFile('announcement-bar', {
  section: { id: 'a', blocks: [{ id: 'b', type: 'message', shopify_attributes: '', settings: { text: 'Hello shoppers', link: '', end_date } }] },
}, { globals: { request: { design_mode: false } } });

describe('#7 announcement end dates', () => {
  it('hides a message whose date has passed (both formats)', async () => {
    expect(await announce('2020-01-01')).not.toContain('Hello shoppers');
    expect(await announce('01/01/2020')).not.toContain('Hello shoppers');
  });
  it('keeps a future message and normalises the date', async () => {
    const html = await announce('5/12/2099');
    expect(html).toContain('Hello shoppers');
    expect(html).toContain('data-end="2099-12-05"');
  });
  it('a date it cannot read never hides the message', async () => {
    const html = await announce('next friday');
    expect(html).toContain('Hello shoppers');
    expect(html).not.toContain('data-end');
  });
});

describe('#12 / #20 / #25 emails', () => {
  const files = fs.readdirSync('notifications').filter((f) => f.endsWith('.liquid'));
  it('no public placeholders, no promise of a missing unsubscribe link', () => {
    for (const f of files) {
      const s = fs.readFileSync(`notifications/${f}`, 'utf8');
      expect(s, f).not.toMatch(/TO CONFIRM/);
      expect(s, f).not.toMatch(/unsubscribe link below/i);
      expect(s, f).toMatch(/shop\.email_logo_url != blank/);
    }
  });
});

describe('#25 FAQ page has no public placeholders', () => {
  it('page.faq.json is clean', () => expect(fs.readFileSync('theme/templates/page.faq.json', 'utf8')).not.toMatch(/TO CONFIRM|FOR APPROVAL/));
});
