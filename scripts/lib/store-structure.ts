import fs from 'node:fs';
import path from 'node:path';

export interface CollectionDef {
  handle: string;
  title: string;
  parent?: string;
  sortOrder?: string;
  rules: { column: string; relation: string; condition: string }[];
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
