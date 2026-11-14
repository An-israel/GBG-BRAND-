/**
 * Updates the client's EXISTING Shopify theme with the latest code – without wiping what she
 * has done in the theme editor (logo, banner photos, category photos, texts, settings).
 *
 *   npm run theme:update -- --theme <theme id> --dry-run      # show what would change
 *   npm run theme:update -- --theme <theme id>                 # update an unpublished theme
 *   npm run theme:update -- --theme <theme id> --allow-live    # update the published (live) theme
 *
 * Store and login: --store <shop>.myshopify.com (or SHOPIFY_FLAG_STORE / SHOPIFY_STORE_DOMAIN), and
 * either a browser login (`shopify theme list` once) or a Theme Access password in
 * SHOPIFY_CLI_THEME_TOKEN (used by GitHub Actions).
 *
 * How it works:
 *  1. pulls her theme-editor files (settings_data.json, templates, section groups) and saves a backup
 *     in backup/theme-json/<date>/
 *  2. merges: her choices always win; only sections/settings that are new in this version are added
 *     (scripts/lib/theme-merge.ts)
 *  3. pushes code + merged files into the same theme (--nodelete: nothing of hers is removed)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { createLogger } from './lib/logger.js';
import { isEditorFile, mergeSectionFile, mergeSettingsData, nextSyncState, parseShopifyJson, type Json, type MergeReport, type SyncState } from './lib/theme-merge.js';

const args = parseArgs();
const themeId = String(args.flags.theme || process.env.SHOPIFY_THEME_ID || '');
const store = String(args.flags.store || process.env.SHOPIFY_FLAG_STORE || process.env.SHOPIFY_STORE_DOMAIN || '');
const allowLive = !!args.flags['allow-live'];
const themeDir = path.resolve(String(args.flags.path || 'theme'));
const log = createLogger('theme-update');
const SYNC_FILE = 'assets/gbg-sync-state.json';

if (!themeId || !store) {
  console.error('Usage: npm run theme:update -- --theme <theme id> --store <shop>.myshopify.com [--dry-run] [--allow-live]');
  console.error('The theme id is the number in the address bar when you open Online Store → Themes → Customize.');
  process.exit(2);
}

/** Shopify CLI: the global `shopify` command if installed, otherwise via npx. */
function shopify(cliArgs: string[]): void {
  const hasGlobal = spawnSync('shopify', ['version'], { stdio: 'ignore', shell: process.platform === 'win32' }).status === 0;
  const [cmd, pre] = hasGlobal ? ['shopify', [] as string[]] : ['npx', ['-y', '@shopify/cli@5']];
  const full = [...pre, ...cliArgs, '--store', store, '--no-input'];
  log.info(`> ${cmd} ${full.join(' ')}`);
  const r = spawnSync(cmd, full, { stdio: 'inherit', shell: process.platform === 'win32', env: process.env });
  if (r.status !== 0) throw new Error(`Shopify CLI failed (${cliArgs.slice(0, 2).join(' ')}). Check the theme id, store and login.`);
}

function walk(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}
const readJson = (file: string): Json | null => (fs.existsSync(file) ? parseShopifyJson(fs.readFileSync(file, 'utf8')) : null);

async function main() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'gbg-theme-update-'));
  const liveDir = path.join(work, 'live');
  const outDir = path.join(work, 'out');
  fs.mkdirSync(liveDir, { recursive: true });

  // 1. Her editor files + our sync state
  log.info(`Reading the client's theme-editor work from theme ${themeId} on ${store}…`);
  shopify(['theme', 'pull', '--theme', themeId, '--path', liveDir,
    '--only', 'config/settings_data.json', '--only', 'templates/*.json', '--only', 'templates/customers/*.json',
    '--only', 'sections/*.json', '--only', SYNC_FILE]);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join('backup', 'theme-json', `${themeId}-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.cpSync(liveDir, backupDir, { recursive: true });
  log.info(`Backup of her editor files: ${backupDir}`);

  // 2. Build the upload: code from the repo, editor files merged
  fs.cpSync(themeDir, outDir, { recursive: true });
  const syncState = readJson(path.join(liveDir, SYNC_FILE)) as SyncState | null;
  const repoEditorFiles: Record<string, Json> = {};
  const reports: MergeReport[] = [];
  for (const rel of walk(themeDir).filter(isEditorFile)) {
    const repo = readJson(path.join(themeDir, rel))!;
    repoEditorFiles[rel] = repo;
    const live = readJson(path.join(liveDir, rel));
    const { result, report } = rel === 'config/settings_data.json'
      ? mergeSettingsData(repo, live)
      : mergeSectionFile(rel, repo, live, syncState?.sections?.[rel]);
    reports.push(report);
    fs.writeFileSync(path.join(outDir, rel), JSON.stringify(result, null, 2));
  }
  fs.writeFileSync(path.join(outDir, SYNC_FILE), JSON.stringify(nextSyncState(syncState, repoEditorFiles), null, 2));

  // 3. Report
  const changed = reports.filter((r) => !r.unchanged);
  log.info(`Her editor work is kept in ${reports.length} file(s).`);
  for (const r of changed) {
    if (r.newFile) log.info(`  + ${r.file}: new template`);
    if (r.addedSections.length) log.info(`  + ${r.file}: new section(s) ${r.addedSections.join(', ')}`);
    if (r.addedSettings.length) log.info(`  + ${r.file}: new setting(s) ${r.addedSettings.join(', ')}`);
    if (r.renamed?.length) log.info(`  ~ ${r.file}: updated to new names ${r.renamed.join('; ')}`);
  }
  if (!changed.length) log.info('  No new sections or settings – code update only.');

  if (args.dryRun) {
    log.info(`DRY RUN – nothing uploaded. Prepared files: ${outDir}`);
    return;
  }

  // 4. Push code + merged editor files into the same theme. --nodelete keeps anything only she has.
  const push = ['theme', 'push', '--theme', themeId, '--path', outDir, '--nodelete'];
  if (allowLive) push.push('--allow-live');
  shopify(push);
  log.info(`Done. Theme ${themeId} updated; her logo, photos, texts and settings were kept. Log: ${log.file}`);
}

main().catch((e) => { log.error(e.message); process.exit(1); });
