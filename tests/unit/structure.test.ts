import { describe, expect, it } from 'vitest';
import { collectionsForTags, loadStructure } from '../../scripts/lib/store-structure.js';

const s = loadStructure();
const handles = new Set(s.collections.map((c) => c.handle));

describe('launch pack category structure (config/collections.json)', () => {
  it('has every sitemap category and sub-category', () => {
    const titles = (parent?: string) => s.collections.filter((c) => c.group === 'category' && c.parent === parent).map((c) => c.title);
    expect(titles(undefined)).toEqual(['Bags & Accessories', 'Shoes', 'Jewellery & Watches', 'Fashion', 'Home & Kitchen', 'Electronics & Gadgets', 'Beauty & Personal Care']);
    expect(titles('bags-accessories')).toEqual(['Handbags', 'Backpacks', 'Purses', 'Travel']);
    expect(titles('shoes')).toEqual(['Women', 'Men', 'Kids']);
    expect(titles('jewellery-watches')).toEqual(['Earrings', 'Necklaces', 'Bracelets', 'Watches']);
    expect(titles('fashion')).toEqual(['Women', 'Men', 'Kids']);
    expect(titles('home-kitchen')).toEqual(['Cookware', 'Storage', 'Household Essentials']);
    expect(titles('electronics-gadgets')).toEqual(['Speakers', 'Small Electronics', 'Accessories']);
    expect(s.collections.filter((c) => c.group === 'bargains').map((c) => c.title)).toEqual(['Under £5', 'Clearance', 'Last Chance']);
    expect(handles.has('new-arrivals')).toBe(true);
  });
  it('every parent exists, handles and tags are unique, only Under £5 is automated', () => {
    for (const c of s.collections) if (c.parent) expect(handles.has(c.parent), c.handle).toBe(true);
    expect(handles.size).toBe(s.collections.length);
    const tags = s.collections.filter((c) => c.tag).map((c) => c.tag);
    expect(new Set(tags).size).toBe(tags.length);
    expect(s.collections.filter((c) => c.type === 'automated').map((c) => c.handle)).toEqual(['under-5']);
  });
  it('a CSV tag puts the product in its sub-category and its main category', () => {
    expect(collectionsForTags(s, ['handbags'])).toEqual(['handbags', 'bags-accessories']);
    expect(collectionsForTags(s, ['Bags', 'clearance', 'nonsense'])).toEqual(['bags-accessories', 'clearance']);
  });
});
