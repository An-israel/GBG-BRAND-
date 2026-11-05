// Runs Shopify Theme Check (same engine as `shopify theme check`) and fails on errors.
import { themeCheckRun } from '@shopify/theme-check-node';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'theme');
const { offenses } = await themeCheckRun(root, undefined, () => {});
const sev = ['error', 'warning', 'info'];
let errors = 0;
for (const o of offenses) {
  const level = sev[o.severity] ?? String(o.severity);
  if (o.severity === 0) errors++;
  const file = path.relative(root, o.uri.replace('file://', ''));
  console.log(`${level.padEnd(7)} ${o.check.padEnd(28)} ${file}:${(o.start?.line ?? 0) + 1}  ${o.message}`);
}
console.log(`\n${offenses.length} offenses, ${errors} errors`);
process.exit(errors ? 1 : 0);
