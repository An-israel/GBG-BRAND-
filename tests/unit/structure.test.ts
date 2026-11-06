import { describe, expect, it } from 'vitest';
import { applyLastChanceRule, type StoreStructure } from '../../scripts/lib/store-structure.js';

const make = (flag: boolean): StoreStructure => ({
  categoryTags: [], electricalTags: [], lastChanceIncludesStockOfOne: flag,
  collections: [{ handle: 'last-chance', title: 'Last Chance', description: '', seoDescription: '', rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'last-chance' }] }],
});

describe('Last Chance collection rule', () => {
  it('is tag-only by default', () => {
    const c = applyLastChanceRule(make(false)).collections[0];
    expect(c.rules).toHaveLength(1);
    expect(c.disjunctive).toBeFalsy();
  });
  it('adds "inventory = 1" as an OR rule when switched on', () => {
    const c = applyLastChanceRule(make(true)).collections[0];
    expect(c.rules).toContainEqual({ column: 'VARIANT_INVENTORY', relation: 'EQUALS', condition: '1' });
    expect(c.disjunctive).toBe(true);
  });
});
