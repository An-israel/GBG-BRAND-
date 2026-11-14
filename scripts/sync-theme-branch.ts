/**
 * Keeps the `shopify-theme` branch (the branch connected in Shopify → Themes → Import →
 * Connect from GitHub) up to date with theme/ in this repository.
 *
 * Shopify needs the theme folders (layout/, sections/, …) at the ROOT of the connected branch,
 * and it commits the client's theme-editor changes back to that branch. So this script:
 *   - mirrors every code file from theme/ into the branch folder (adds, updates, removes),
 *   - MERGES the editor files (settings_data.json, templates, section groups) so the client's
 *     logo, photos, texts and settings are kept and only new sections/settings are added,
 *   - leaves any extra template she created in the editor alone.
 *
 *   npx tsx scripts/sync-theme-branch.ts --branch-dir <checkout of shopify-theme> [--dry-run]
 *
 * Runs automatically in .github/workflows/sync-shopify-branch.yml after every push.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { isEditorFile, mergeSectionFile, mergeSettingsData, nextSyncState, parseShopifyJson, type Json, type MergeReport, type SyncState } from './lib/theme-merge.js';

const THEME_DIRS = ['assets', 'blocks', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates'];
const SYNC_FILE = 'assets/gbg-sync-state.json';

function walk(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}
const readJson = (file: string): Json | null => (fs.existsSync(file) ? parseShopifyJson(fs.readFileSync(file, 'utf8')) : null);
const inTheme = (rel: string) => THEME_DIRS.includes(rel.split('/')[0]);

export interface SyncResult { written: string[]; removed: string[]; reports: MergeReport[] }

/** Sync theme/ (repo) into a folder holding the connected branch. Pure file operations – tested. */
export function syncThemeInto(themeDir: string, branchDir: string, dryRun = false): SyncResult {
  const written: string[] = [];
  const removed: string[] = [];
  const reports: MergeReport[] = [];
  const repoFiles = walk(themeDir).filter(inTheme);
  const repoSet = new Set(repoFiles);
  const write = (rel: string, data: Buffer | string) => {
    const dest = path.join(branchDir, rel);
    const old = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (old && old.equals(buf)) return;
    written.push(rel);
    if (!dryRun) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf); }
  };

  const syncState = readJson(path.join(branchDir, SYNC_FILE)) as SyncState | null;
  const repoEditor: Record<string, Json> = {};
  for (const rel of repoFiles) {
    if (rel === SYNC_FILE) continue;
    if (isEditorFile(rel)) {
      const repo = readJson(path.join(themeDir, rel))!;
      repoEditor[rel] = repo;
      const live = readJson(path.join(branchDir, rel));
      const { result, report } = rel === 'config/settings_data.json' ? mergeSettingsData(repo, live) : mergeSectionFile(rel, repo, live, syncState?.sections?.[rel]);
      reports.push(report);
      // Only rewrite her file when something actually has to be added (keeps Shopify's formatting).
      if (!live || !report.unchanged) write(rel, JSON.stringify(result, null, 2) + '\n');
    } else {
      write(rel, fs.readFileSync(path.join(themeDir, rel)));
    }
  }
  write(SYNC_FILE, JSON.stringify(nextSyncState(syncState, repoEditor), null, 2) + '\n');

  // Code files deleted from theme/ are deleted from the branch too. Editor files that exist only
  // in the branch (templates she created in the theme editor) are kept.
  for (const rel of walk(branchDir).filter(inTheme)) {
    if (repoSet.has(rel) || rel === SYNC_FILE || isEditorFile(rel)) continue;
    removed.push(rel);
    if (!dryRun) fs.rmSync(path.join(branchDir, rel));
  }
  return { written, removed, reports };
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('scripts', 'sync-theme-branch.ts'))) {
  const args = parseArgs();
  const branchDir = String(args.flags['branch-dir'] || '');
  if (!branchDir) { console.error('Usage: npx tsx scripts/sync-theme-branch.ts --branch-dir <folder> [--dry-run]'); process.exit(2); }
  const res = syncThemeInto(path.resolve(String(args.flags.theme || 'theme')), path.resolve(branchDir), args.dryRun);
  for (const r of res.reports.filter((x) => !x.unchanged)) {
    if (r.newFile) console.log(`+ ${r.file}: new template`);
    if (r.addedSections.length) console.log(`+ ${r.file}: new section(s) ${r.addedSections.join(', ')}`);
    if (r.addedSettings.length) console.log(`+ ${r.file}: new setting(s) ${r.addedSettings.join(', ')}`);
    if (r.renamed?.length) console.log(`~ ${r.file}: ${r.renamed.join('; ')}`);
  }
  console.log(`${args.dryRun ? '[dry run] would write' : 'wrote'} ${res.written.length} file(s), ${args.dryRun ? 'would remove' : 'removed'} ${res.removed.length}.`);
}
