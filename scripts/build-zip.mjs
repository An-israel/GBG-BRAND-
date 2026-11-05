// Packages theme/ into dist/gbg-bargain-shop-theme-v<version>.zip for
// Shopify admin → Online Store → Themes → Add theme → Upload zip file.
import fs from 'node:fs';
import path from 'node:path';
import { ZipArchive } from 'archiver';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
fs.mkdirSync('dist', { recursive: true });
const out = path.join('dist', `gbg-bargain-shop-theme-v${pkg.version}.zip`);
const output = fs.createWriteStream(out);
const archive = new ZipArchive({ zlib: { level: 9 } });
archive.pipe(output);
for (const dir of ['assets', 'blocks', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates']) {
  const full = path.join('theme', dir);
  if (fs.existsSync(full) && fs.readdirSync(full).length) archive.directory(full, dir);
}
await archive.finalize();
output.on('close', () => console.log(`${out} (${(archive.pointer() / 1024).toFixed(0)} KB)`));
