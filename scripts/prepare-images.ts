/**
 * Prepares product photos for upload.
 *
 *   npm run images -- [--in photos] [--out prepared-images] [--webp] [--concurrency 3] [--csv products.csv]
 *
 * Input:  photos/<SKU>/<any names>.jpg|png|heic   (sorted by name: the first is the main image)
 * Output: prepared-images/<SKU>/<sku>-1.jpg, <sku>-2.jpg …
 *   - auto-orient from EXIF
 *   - main image: padded to a square on pure white
 *   - longest side max 2048px, JPEG (mozjpeg) or WebP
 *   - alt-text drafts written to prepared-images/alt-text-review.csv (flagged for review)
 * Folders are processed in small batches so memory stays flat (backpressure).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
// iPhone photos are HEIC (HEVC). sharp's bundled libvips can't decode HEVC, so they are
// converted with heic-convert (pure JavaScript, no system libraries) first.
import heicConvert from 'heic-convert';
import { parseArgs } from './lib/args.js';
import { createLogger } from './lib/logger.js';
import { readCsv, writeCsv } from './lib/csv.js';
import { COL, draftAltText } from './lib/products.js';

export const MAX_SIZE = 2048;
/** Below this (longest side, px) a photo looks blurry when zoomed – staff get a warning. */
export const MIN_GOOD_SIZE = 800;

/** True for HEIC/HEIF files (by content, not just the file name). */
export function isHeic(buf: Buffer): boolean {
  const brand = buf.subarray(4, 12).toString('latin1');
  return brand.startsWith('ftyp') && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(buf.subarray(8, 12).toString('latin1'));
}

/** Natural order: IMG_9 before IMG_10, photo2 before photo10. */
export const naturalSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif|tiff?)$/i;

export interface PrepareOptions {
  square: boolean;
  format: 'jpeg' | 'webp';
  maxSize?: number;
}

/** Process one image buffer. Exported for unit tests. */
export async function processImage(input: Buffer, opts: PrepareOptions): Promise<{ data: Buffer; width: number; height: number; sourceWidth: number; sourceHeight: number }> {
  const max = opts.maxSize ?? MAX_SIZE;
  if (isHeic(input) && !isAvif(input)) {
    input = Buffer.from(await heicConvert({ buffer: input, format: 'JPEG', quality: 0.95 }));
  }
  let img = sharp(input, { failOn: 'none' }).rotate(); // rotate() with no args = auto-orient from EXIF
  const oriented = await img.toBuffer({ resolveWithObject: true });
  img = sharp(oriented.data);
  if (opts.square) {
    // Fit the whole item inside a white square – never crop the product away.
    const side = Math.min(Math.max(oriented.info.width, oriented.info.height), max);
    img = img.resize(side, side, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } });
  } else {
    img = img.resize(max, max, { fit: 'inside', withoutEnlargement: true });
  }
  img = img.flatten({ background: '#ffffff' });
  const out = opts.format === 'webp' ? img.webp({ quality: 82 }) : img.jpeg({ quality: 82, mozjpeg: true, progressive: true });
  const { data, info } = await out.toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, sourceWidth: oriented.info.width, sourceHeight: oriented.info.height };
}

const isAvif = (buf: Buffer) => /^(avif|avis)/.test(buf.subarray(8, 12).toString('latin1'));

export function safeSku(sku: string): string {
  return sku.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

async function main() {
  const args = parseArgs();
  const inDir = String(args.flags.in || 'photos');
  const outDir = String(args.flags.out || 'prepared-images');
  const format = args.flags.webp ? 'webp' : 'jpeg';
  const concurrency = Math.max(1, Number(args.flags.concurrency || 3));
  const log = createLogger('prepare-images');

  if (!fs.existsSync(inDir)) {
    log.error(`Input folder "${inDir}" not found. Put each item's photos in ${inDir}/<SKU>/.`);
    process.exit(1);
  }
  const titles = new Map<string, string>();
  const colours = new Map<string, string>();
  if (typeof args.flags.csv === 'string') {
    let current = '';
    let currentColour = '';
    for (const r of readCsv(args.flags.csv)) {
      if (r[COL.title]) { current = r[COL.title]; currentColour = r[COL.colour] || ''; }
      if (r[COL.sku]) { titles.set(r[COL.sku], r[COL.title] || current); colours.set(r[COL.sku], r[COL.colour] || currentColour); }
    }
  }

  const skus = fs.readdirSync(inDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  log.info(`${skus.length} SKU folder(s) found in ${inDir}${args.dryRun ? ' (dry run – nothing written)' : ''}`);
  const altRows: Record<string, string>[] = [];
  let done = 0;
  let failed = 0;

  for (let i = 0; i < skus.length; i += concurrency) {
    const batch = skus.slice(i, i + concurrency);
    await Promise.all(batch.map(async (sku) => {
      const files = fs.readdirSync(path.join(inDir, sku)).filter((f) => IMAGE_EXT.test(f)).sort(naturalSort);
      if (!files.length) { log.warn(`${sku}: no images`); return; }
      const dest = path.join(outDir, sku);
      if (!args.dryRun) fs.mkdirSync(dest, { recursive: true });
      for (const [idx, f] of files.entries()) {
        const name = `${safeSku(sku)}-${idx + 1}.${format === 'webp' ? 'webp' : 'jpg'}`;
        try {
          let check = '';
          if (!args.dryRun) {
            const res = await processImage(fs.readFileSync(path.join(inDir, sku, f)), { square: idx === 0, format });
            fs.writeFileSync(path.join(dest, name), res.data);
            const longest = Math.max(res.sourceWidth, res.sourceHeight);
            if (longest < MIN_GOOD_SIZE) {
              check = `Small photo (${res.sourceWidth} x ${res.sourceHeight} px) – will look blurry; retake at ${MIN_GOOD_SIZE}px+ if possible`;
              log.warn(`${sku}/${f}: ${check}`);
            }
          }
          altRows.push({ SKU: sku, Source: f, File: path.join(dest, name), 'Draft alt text': draftAltText(titles.get(sku) || sku, idx, colours.get(sku)), 'Reviewed (yes/no)': 'no', Check: check });
          done++;
        } catch (err: any) {
          failed++;
          log.error(`${sku}/${f}: ${err.message}`);
        }
      }
    }));
    log.info(`Progress: ${Math.min(i + concurrency, skus.length)}/${skus.length} folders`);
  }
  if (!args.dryRun && altRows.length) {
    writeCsv(path.join(outDir, 'alt-text-review.csv'), altRows);
    log.info(`Alt text drafts for review: ${path.join(outDir, 'alt-text-review.csv')}`);
  }
  log.info(`Done: ${done} image(s) prepared, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
