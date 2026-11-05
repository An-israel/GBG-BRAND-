// Copies the self-hosted, open-licence (SIL OFL) font files into theme/assets.
// Only the weights the theme actually uses are copied.
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const files = [
  ['@fontsource/archivo/files/archivo-latin-700-normal.woff2', 'archivo-700.woff2'],
  ['@fontsource/archivo/files/archivo-latin-800-normal.woff2', 'archivo-800.woff2'],
  ['@fontsource/inter/files/inter-latin-400-normal.woff2', 'inter-400.woff2'],
  ['@fontsource/inter/files/inter-latin-500-normal.woff2', 'inter-500.woff2'],
  ['@fontsource/inter/files/inter-latin-600-normal.woff2', 'inter-600.woff2'],
];
for (const [src, dest] of files) {
  copyFileSync(join('node_modules', src), join('theme', 'assets', dest));
  console.log(`copied ${dest}`);
}
