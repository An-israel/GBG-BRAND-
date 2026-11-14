import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { syncThemeInto } from '../../scripts/sync-theme-branch.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gbg-branch-'));
const put = (dir: string, rel: string, data: unknown) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), typeof data === 'string' ? data : JSON.stringify(data)); };
const get = (dir: string, rel: string) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''));

describe('shopify-theme branch sync', () => {
  it('first sync creates a valid theme at the branch root', () => {
    const repo = tmp(); const branch = tmp();
    put(repo, 'layout/theme.liquid', '<html></html>');
    put(repo, 'templates/index.json', { sections: { hero: { type: 'hero', settings: {} } }, order: ['hero'] });
    put(repo, 'config/settings_data.json', { current: 'Default', presets: { Default: { a: 1 } } });
    syncThemeInto(repo, branch);
    expect(fs.existsSync(path.join(branch, 'layout/theme.liquid'))).toBe(true);
    expect(fs.existsSync(path.join(branch, 'assets/gbg-sync-state.json'))).toBe(true);
    expect(fs.existsSync(path.join(branch, 'theme'))).toBe(false);
  });

  it('later syncs update code, keep her editor work and her own templates, remove deleted code', () => {
    const repo = tmp(); const branch = tmp();
    put(repo, 'layout/theme.liquid', 'v1');
    put(repo, 'snippets/old.liquid', 'old');
    put(repo, 'templates/index.json', { sections: { hero: { type: 'hero', settings: { heading: 'Ours' } } }, order: ['hero'] });
    put(repo, 'config/settings_data.json', { current: { logo_width: 150 } });
    syncThemeInto(repo, branch);
    // she edits in Shopify (Shopify commits these to the branch, with its comment header)
    put(branch, 'templates/index.json', '/* Shopify */\n' + JSON.stringify({ sections: { hero: { type: 'hero', settings: { heading: 'Hers' } } }, order: ['hero'] }));
    put(branch, 'config/settings_data.json', { current: { logo_width: 220, logo: 'shopify://shop_images/logo.png' } });
    put(branch, 'templates/page.her-page.json', { sections: {}, order: [] });
    // next developer version
    put(repo, 'layout/theme.liquid', 'v2');
    fs.rmSync(path.join(repo, 'snippets/old.liquid'));
    put(repo, 'templates/index.json', { sections: { hero: { type: 'hero', settings: { heading: 'Ours' } }, promos: { type: 'promo-tiles', settings: {} } }, order: ['hero', 'promos'] });
    put(repo, 'config/settings_data.json', { current: { logo_width: 150, claim_fast_track: true } });
    const res = syncThemeInto(repo, branch);
    expect(fs.readFileSync(path.join(branch, 'layout/theme.liquid'), 'utf8')).toBe('v2');
    expect(res.removed).toContain('snippets/old.liquid');
    const idx = get(branch, 'templates/index.json');
    expect(idx.sections.hero.settings.heading).toBe('Hers');
    expect(idx.order).toEqual(['hero', 'promos']);
    const s = get(branch, 'config/settings_data.json');
    expect(s.current).toEqual({ logo_width: 220, logo: 'shopify://shop_images/logo.png', claim_fast_track: true });
    expect(fs.existsSync(path.join(branch, 'templates/page.her-page.json'))).toBe(true);
  });

  it('does not touch her files when nothing new has to be added', () => {
    const repo = tmp(); const branch = tmp();
    put(repo, 'templates/index.json', { sections: { hero: { type: 'hero', settings: {} } }, order: ['hero'] });
    syncThemeInto(repo, branch);
    const herText = '/* Shopify */\n{"sections":{"hero":{"type":"hero","settings":{"heading":"Hers"}}},"order":["hero"]}';
    put(branch, 'templates/index.json', herText);
    const res = syncThemeInto(repo, branch);
    expect(res.written).not.toContain('templates/index.json');
    expect(fs.readFileSync(path.join(branch, 'templates/index.json'), 'utf8')).toBe(herText);
  });
});
