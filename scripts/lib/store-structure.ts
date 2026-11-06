import fs from 'node:fs';
import path from 'node:path';

export interface CollectionDef {
  handle: string;
  title: string;
  parent?: string;
  sortOrder?: string;
  disjunctive?: boolean; // true = match ANY rule (OR)
  rules: { column: string; relation: string; condition: string }[];
  description: string;
  seoDescription: string;
}
export interface StoreStructure {
  collections: CollectionDef[];
  categoryTags: string[];
  electricalTags: string[];
  lastChanceIncludesStockOfOne?: boolean;
}

export function loadStructure(file = path.join('config', 'collections.json')): StoreStructure {
  const s: StoreStructure = JSON.parse(fs.readFileSync(file, 'utf8'));
  return applyLastChanceRule(s);
}

/** Brief §5.2: Last Chance = tag `last-chance`, OR (opt-in) inventory of exactly 1. */
export function applyLastChanceRule(s: StoreStructure): StoreStructure {
  if (!s.lastChanceIncludesStockOfOne) return s;
  const c = s.collections.find((x) => x.handle === 'last-chance');
  if (c && !c.rules.some((r) => r.column === 'VARIANT_INVENTORY')) {
    c.rules.push({ column: 'VARIANT_INVENTORY', relation: 'EQUALS', condition: '1' });
    c.disjunctive = true;
  }
  return s;
}
