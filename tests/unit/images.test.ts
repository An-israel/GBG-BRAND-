import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processImage, safeSku, MAX_SIZE } from '../../scripts/prepare-images.js';

const make = (w: number, h: number, orientation?: number) => {
  let img = sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 30, b: 30 } } }).jpeg();
  if (orientation) img = img.withMetadata({ orientation });
  return img.toBuffer();
};

describe('processImage', () => {
  it('pads the main image to a white square', async () => {
    const out = await processImage(await make(800, 400), { square: true, format: 'jpeg' });
    expect(out.width).toBe(800);
    expect(out.height).toBe(800);
    const { data } = await sharp(out.data).extract({ left: 400, top: 5, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(245); // white padding
  });
  it('limits size to 2048px', async () => {
    const out = await processImage(await make(4000, 3000), { square: false, format: 'jpeg' });
    expect(Math.max(out.width, out.height)).toBe(MAX_SIZE);
  });
  it('auto-orients using EXIF', async () => {
    const out = await processImage(await make(600, 300, 6), { square: false, format: 'jpeg' });
    expect(out.width).toBe(300);
    expect(out.height).toBe(600);
  });
  it('can output WebP', async () => {
    const out = await processImage(await make(300, 300), { square: true, format: 'webp' });
    expect((await sharp(out.data).metadata()).format).toBe('webp');
  });
  it('makes safe file names from SKUs', () => expect(safeSku('GBG/BAG 001')).toBe('gbg-bag-001'));
});
