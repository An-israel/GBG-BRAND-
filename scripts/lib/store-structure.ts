import fs from 'node:fs';
import path from 'node:path';

/**
 * One collection of the launch pack sitemap (config/collections.json).
 * type 'manual'   – staff tick it on the product page (and the bulk importer adds products by `tag`)
 * type 'automated' – filled by rules (only "Under £5": price below £5)
 * group – 'category' (menu "Shop" + home tiles), 'bargains' (Bargains / Clearance), 'promo' (home page lists)
 */
export interface CollectionDef {
  handle: string;
  title: string;
  group: 'category' | 'bargains' | 'promo';
  type: 'manual' | 'automated';
  tag?: string;
  parent?: string;
  tileLabel?: string;
  sortOrder?: string;
  rules?: { column: string; relation: string; condition: string }[];
  description: string;
  seoDescription: string;
}
export interface StoreStructure {
  collections: CollectionDef[];
  categoryTags: string[];
  electricalTags: string[];
}

export function loadStructure(file = path.join('config', 'collections.json')): StoreStructure {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Collection handles a product belongs in, given its CSV tags (sub-category ⇒ its main category too). */
export function collectionsForTags(structure: StoreStructure, tags: string[]): string[] {
  const out = new Set<string>();
  const byTag = new Map(structure.collections.filter((c) => c.type === 'manual' && c.tag).map((c) => [c.tag!, c]));
  for (const t of tags) {
    const c = byTag.get(t.toLowerCase());
    if (!c) continue;
    out.add(c.handle);
    if (c.parent) out.add(c.parent);
  }
  return [...out];
}
