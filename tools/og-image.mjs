// Builds theme/assets/og-default.png – the branded default social preview (1200 x 630).
// Rendered with the theme's own fonts and colours. Re-run after a logo/colour change:
//   node tools/og-image.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const font = (f) => `data:font/woff2;base64,${fs.readFileSync(path.join('theme/assets', f)).toString('base64')}`;
const html = `<!doctype html><html><head><style>
@font-face { font-family: Archivo; font-weight: 800; src: url(${font('archivo-800.woff2')}); }
@font-face { font-family: Archivo; font-weight: 700; src: url(${font('archivo-700.woff2')}); }
@font-face { font-family: Inter; font-weight: 500; src: url(${font('inter-500.woff2')}); }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #0B1F3A; color: #fff; font-family: Inter; position: relative; overflow: hidden; }
.stripe { position: absolute; left: 0; right: 0; bottom: 0; height: 26px; background: repeating-linear-gradient(-45deg, #FFD60A 0 18px, #0B1F3A 18px 36px); }
.rule { position: absolute; left: 0; right: 0; top: 0; height: 10px; background: #C9A227; }
.wrap { position: absolute; left: 90px; top: 92px; right: 90px; }
.logo { display: flex; align-items: center; gap: 18px; margin-bottom: 54px; }
.mark { background: #C9A227; color: #0B1F3A; font: 800 58px/1 Archivo; padding: 12px 16px; border-radius: 8px; }
.word { font: 700 46px/1 Archivo; }
h1 { font: 800 104px/0.98 Archivo; letter-spacing: -2.5px; }
p { margin-top: 30px; font-size: 32px; color: #DCE3EE; }
.tag { position: absolute; right: 90px; top: 112px; background: #FFD60A; color: #0B1F3A; font: 800 40px Archivo; padding: 14px 26px 14px 44px;
  clip-path: polygon(22px 0, 100% 0, 100% 100%, 22px 100%, 0 50%); border-radius: 0 8px 8px 0; transform: rotate(4deg); }
.tag::before { content: ''; position: absolute; left: 18px; top: 50%; width: 12px; height: 12px; margin-top: -6px; border-radius: 50%; background: #0B1F3A; }
</style></head><body>
<div class="rule"></div>
<div class="wrap">
  <div class="logo"><span class="mark">GBG</span><span class="word">Bargain Shop</span></div>
  <h1>Big bargains.<br>Small prices.</h1>
  <p>Shop online or visit us in Liverpool · Stanley Meat Market, L13</p>
</div>
<div class="tag">Liverpool</div>
<div class="stripe"></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const out = 'theme/assets/og-default.png';
await page.screenshot({ path: out });
await browser.close();
console.log(`${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
