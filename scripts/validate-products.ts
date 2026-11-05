/**
 * Checks every row of a product CSV before import and writes a report staff can act on.
 *
 *   npm run validate -- products.csv [--photos photos] [--report reports/validation.txt]
 *
 * Exit code 1 when there are errors, so it can gate the import.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { readCsv } from './lib/csv.js';
import { createLogger } from './lib/logger.js';
import { formatIssues, validateRows, HEADERS } from './lib/products.js';
import { loadStructure } from './lib/store-structure.js';

const args = parseArgs();
const file = args.positional[0];
if (!file) {
  console.error('Usage: npm run validate -- <products.csv> [--photos photos]');
  process.exit(2);
}
const log = createLogger('validate-products');
const rows = readCsv(file);
const structure = loadStructure();
const photosDir = typeof args.flags.photos === 'string' ? args.flags.photos : (fs.existsSync('photos') ? 'photos' : undefined);

const missing = HEADERS.filter((h) => rows.length && !(h in rows[0]));
if (missing.length) log.warn(`Columns missing from the CSV (empty values assumed): ${missing.join(', ')}`);

const issues = validateRows(rows, { categoryTags: structure.categoryTags, electricalTags: structure.electricalTags, photosDir });
const report = `GBG product check – ${file} – ${new Date().toLocaleString('en-GB')}\n${rows.length} row(s) checked.\n\n${formatIssues(issues)}\n`;
const out = typeof args.flags.report === 'string' ? args.flags.report : path.join('reports', `validation-${path.basename(file, '.csv')}.txt`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, report);
console.log(`\n${report}`);
log.info(`Report written to ${out}`);
process.exit(issues.some((i) => i.level === 'error') ? 1 : 0);
