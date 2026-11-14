/**
 * Merges the developer's theme JSON (repo) into the client's live theme JSON so a code
 * update never wipes what she set up in the theme editor (logo, photos, texts, settings).
 *
 * Rules – the client's work always wins:
 *  - settings_data.json: every value she has stays. Only settings that are NEW in this
 *    version (the key doesn't exist in her theme yet) are added, with the repo's value.
 *  - templates/*.json and sections/*-group.json:
 *      * her sections, blocks, texts, photos and order stay exactly as they are;
 *      * a section the developer ADDED in this version is inserted next to its neighbour
 *        in the repo order;
 *      * a section she deleted is NOT brought back (the sync state remembers which
 *        sections she has already been given);
 *      * a template that doesn't exist in her theme yet is added as-is.
 *
 * The sync state lives in the client's theme as assets/gbg-sync-state.json.
 */

export type Json = Record<string, any>;

export interface SyncState {
  version: number;
  /** file path -> section ids already delivered to the client's theme */
  sections: Record<string, string[]>;
}

export interface MergeReport {
  file: string;
  addedSections: string[];
  addedSettings: string[];
  renamed?: string[];
  newFile: boolean;
  unchanged: boolean;
}

/** Shopify writes an auto-generated block comment at the top of JSON templates. */
export function parseShopifyJson(text: string): Json {
  const stripped = text.replace(/^﻿/, '').replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '');
  return JSON.parse(stripped);
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * Renames made between versions. Applied to her settings so her blocks (and their photos)
 * keep working: collection handles always; a label only if she never changed it.
 * v1.2.0: categories renamed to the client mock-up.
 */
export const COLLECTION_RENAMES: Record<string, string> = {
  'bags-accessories': 'bags',
  'jewellery-watches': 'jewellery',
  fashion: 'clothing',
  'womens-fashion': 'womens-clothing',
  'mens-fashion': 'mens-clothing',
  'kids-fashion': 'kids-clothing',
  'home-kitchen': 'home-living',
  'electronics-gadgets': 'electronics',
};
export const LABEL_RENAMES: Record<string, string> = {
  Fashion: 'Clothing',
  'Home & Kitchen': 'Home & Living',
  'Bags & Accessories': 'Bags',
  'Jewellery & Watches': 'Jewellery',
  'Electronics & Gadgets': 'Electronics',
  'Visit Our Shop': 'Visit Our Liverpool Store',
};

/** Apply COLLECTION_RENAMES / LABEL_RENAMES to every section and block setting. Returns what changed. */
export function applyRenames(json: Json): string[] {
  const changes: string[] = [];
  const fix = (settings: Json | undefined, where: string) => {
    if (!settings) return;
    for (const [k, v] of Object.entries(settings)) {
      if (typeof v !== 'string') continue;
      if ((k === 'collection' || k === 'fill_collection') && COLLECTION_RENAMES[v]) {
        settings[k] = COLLECTION_RENAMES[v];
        changes.push(`${where}.${k}: ${v} → ${settings[k]}`);
      } else if ((k === 'label' || k === 'button_2_label') && LABEL_RENAMES[v]) {
        settings[k] = LABEL_RENAMES[v];
        changes.push(`${where}.${k}: ${v} → ${settings[k]}`);
      }
    }
  };
  for (const [id, sec] of Object.entries<Json>(json.sections ?? {})) {
    fix(sec.settings, id);
    for (const [bid, b] of Object.entries<Json>(sec.blocks ?? {})) fix(b.settings, `${id}/${bid}`);
  }
  return changes;
}

/** Merge one section-based JSON file (template or section group). */
export function mergeSectionFile(file: string, repo: Json, live: Json | null, delivered: string[] | undefined): { result: Json; report: MergeReport } {
  const report: MergeReport = { file, addedSections: [], addedSettings: [], newFile: false, unchanged: false };
  if (!live) {
    report.newFile = true;
    return { result: clone(repo), report };
  }
  const result = clone(live);
  result.sections = result.sections || {};
  report.renamed = applyRenames(result);
  result.order = Array.isArray(result.order) ? result.order : Object.keys(result.sections);
  // First sync of a theme that was uploaded as a zip: everything currently in the repo
  // and also in her theme counts as delivered; sections missing from her theme are new.
  const already = new Set(delivered ?? Object.keys(live.sections || {}));
  const repoOrder: string[] = Array.isArray(repo.order) ? repo.order : Object.keys(repo.sections || {});
  for (const [i, id] of repoOrder.entries()) {
    if (result.sections[id]) continue; // she has it (possibly edited) – keep hers
    if (delivered && already.has(id)) continue; // she deleted it on purpose – don't bring it back
    result.sections[id] = clone(repo.sections[id]);
    // place it after the nearest earlier repo section that she has
    let at = -1;
    for (let j = i - 1; j >= 0 && at === -1; j--) at = result.order.indexOf(repoOrder[j]);
    result.order.splice(at + 1, 0, id);
    report.addedSections.push(id);
  }
  // keep group metadata (type/name) from the repo if missing
  for (const k of ['type', 'name']) if (repo[k] !== undefined && result[k] === undefined) result[k] = repo[k];
  report.unchanged = !report.addedSections.length && !report.renamed.length;
  return { result, report };
}

/** Merge settings_data.json: her values win; only brand-new setting keys are added. */
export function mergeSettingsData(repo: Json, live: Json | null): { result: Json; report: MergeReport } {
  const report: MergeReport = { file: 'config/settings_data.json', addedSections: [], addedSettings: [], newFile: false, unchanged: false };
  if (!live) {
    report.newFile = true;
    return { result: clone(repo), report };
  }
  const result = clone(live);
  const repoCurrent = typeof repo.current === 'string' ? repo.presets?.[repo.current] ?? {} : repo.current ?? {};
  // Her current settings may be an object, or the name of a preset.
  let target: Json;
  if (typeof result.current === 'string') {
    result.presets = result.presets || {};
    result.presets[result.current] = result.presets[result.current] || {};
    target = result.presets[result.current];
  } else {
    result.current = result.current || {};
    target = result.current;
  }
  for (const [k, v] of Object.entries(repoCurrent)) {
    if (k === 'sections' || k === 'content_for_index' || k === 'blocks') continue; // legacy keys
    if (!(k in target)) {
      target[k] = clone(v);
      report.addedSettings.push(k);
    }
  }
  report.unchanged = !report.addedSettings.length;
  return { result, report };
}

/** Files that hold the client's theme-editor work (never overwritten blindly). */
export const isEditorFile = (rel: string) =>
  rel === 'config/settings_data.json' || /^templates\/(customers\/)?[^/]+\.json$/.test(rel) || /^sections\/[^/]+\.json$/.test(rel);

export function nextSyncState(prev: SyncState | null, repoFiles: Record<string, Json>): SyncState {
  const state: SyncState = { version: 1, sections: { ...(prev?.sections ?? {}) } };
  for (const [file, json] of Object.entries(repoFiles)) {
    if (file === 'config/settings_data.json') continue;
    const ids = new Set([...(state.sections[file] ?? []), ...Object.keys(json.sections ?? {})]);
    state.sections[file] = [...ids];
  }
  return state;
}
