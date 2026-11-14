import { describe, expect, it } from 'vitest';
import { isEditorFile, mergeSectionFile, mergeSettingsData, nextSyncState, parseShopifyJson } from '../../scripts/lib/theme-merge.js';

const repoIndex = {
  sections: {
    hero: { type: 'hero', settings: { heading: 'Big bargains. Small prices.' } },
    'value-strip': { type: 'value-strip', settings: {} },
    promos: { type: 'promo-tiles', settings: {} }, // new in this version
    categories: { type: 'category-grid', settings: { heading: 'Shop by category' } },
  },
  order: ['hero', 'value-strip', 'promos', 'categories'],
};
const herIndex = {
  sections: {
    hero: { type: 'hero', settings: { heading: 'Mega bargains!' }, blocks: { img: { type: 'image', settings: { image: 'shopify://shop_images/her-photo.jpg' } } }, block_order: ['img'] },
    'value-strip': { type: 'value-strip', settings: {} },
    categories: { type: 'category-grid', settings: { heading: 'Our departments' } },
    'her-own-section': { type: 'rich-text', settings: {} },
  },
  order: ['hero', 'value-strip', 'categories', 'her-own-section'],
};

describe('theme update merge – her work always wins', () => {
  it('keeps her texts and photos', () => {
    const { result } = mergeSectionFile('templates/index.json', repoIndex, herIndex, undefined);
    expect(result.sections.hero.settings.heading).toBe('Mega bargains!');
    expect(result.sections.hero.blocks.img.settings.image).toBe('shopify://shop_images/her-photo.jpg');
    expect(result.sections.categories.settings.heading).toBe('Our departments');
    expect(result.sections['her-own-section']).toBeTruthy();
  });
  it('adds a section that is new in this version, next to its neighbour', () => {
    const { result, report } = mergeSectionFile('templates/index.json', repoIndex, herIndex, ['hero', 'value-strip', 'categories']);
    expect(report.addedSections).toEqual(['promos']);
    expect(result.order).toEqual(['hero', 'value-strip', 'promos', 'categories', 'her-own-section']);
  });
  it('does not bring back a section she deleted', () => {
    const deletedPromos = { ...herIndex, sections: { ...herIndex.sections }, order: [...herIndex.order] };
    const { result } = mergeSectionFile('templates/index.json', repoIndex, deletedPromos, ['hero', 'value-strip', 'promos', 'categories']);
    expect(result.sections.promos).toBeUndefined();
  });
  it('adds a template she does not have yet', () => {
    const { result, report } = mergeSectionFile('templates/page.new.json', repoIndex, null, undefined);
    expect(report.newFile).toBe(true);
    expect(result).toEqual(repoIndex);
  });
  it('settings: keeps her values, adds only brand-new settings', () => {
    const repo = { current: 'Default', presets: { Default: { logo_width: 150, claim_fast_track: true, free_delivery_threshold: 80 } } };
    const her = { current: { logo: 'shopify://shop_images/gbg-logo.png', logo_width: 220 } };
    const { result, report } = mergeSettingsData(repo, her);
    expect(result.current.logo).toBe('shopify://shop_images/gbg-logo.png');
    expect(result.current.logo_width).toBe(220);
    expect(result.current.claim_fast_track).toBe(true);
    expect(report.addedSettings).toEqual(['claim_fast_track', 'free_delivery_threshold']);
  });
  it('settings stored as a named preset are handled too', () => {
    const { result } = mergeSettingsData({ current: { a: 1, b: 2 } }, { current: 'Default', presets: { Default: { a: 9 } } });
    expect(result.presets.Default).toEqual({ a: 9, b: 2 });
  });
  it('reads Shopify JSON with its auto-generated comment', () => {
    expect(parseShopifyJson('/*\n * auto-generated\n */\n{"order":[]}')).toEqual({ order: [] });
  });
  it('knows which files are her editor files', () => {
    expect(isEditorFile('config/settings_data.json')).toBe(true);
    expect(isEditorFile('templates/index.json')).toBe(true);
    expect(isEditorFile('sections/header-group.json')).toBe(true);
    expect(isEditorFile('sections/hero.liquid')).toBe(false);
    expect(isEditorFile('assets/base.css')).toBe(false);
  });
  it('remembers delivered sections between updates', () => {
    const s = nextSyncState({ version: 1, sections: { 'templates/index.json': ['old'] } }, { 'templates/index.json': repoIndex });
    expect(s.sections['templates/index.json']).toEqual(['old', 'hero', 'value-strip', 'promos', 'categories']);
  });
});

describe('renames between versions', () => {
  it('moves her category blocks to the new collection names and keeps her photos', () => {
    const live = { sections: { categories: { type: 'category-grid', settings: {}, blocks: {
      a: { type: 'category', settings: { collection: 'bags-accessories', label: 'Bags', image: 'shopify://shop_images/her-bags.jpg' } },
      b: { type: 'category', settings: { collection: 'fashion', label: 'Fashion' } },
      c: { type: 'category', settings: { collection: 'home-kitchen', label: 'Our homeware' } },
    } } }, order: ['categories'] };
    const { result, report } = mergeSectionFile('templates/index.json', live, live, ['categories']);
    const b = result.sections.categories.blocks;
    expect(b.a.settings).toEqual({ collection: 'bags', label: 'Bags', image: 'shopify://shop_images/her-bags.jpg' });
    expect(b.b.settings).toEqual({ collection: 'clothing', label: 'Clothing' });
    expect(b.c.settings).toEqual({ collection: 'home-living', label: 'Our homeware' }); // her own label kept
    expect(report.renamed?.length).toBe(4);
  });
});
