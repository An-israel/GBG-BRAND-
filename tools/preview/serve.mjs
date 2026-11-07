// Static server for the offline preview (used by Playwright and Lighthouse CI when PREVIEW_URL is not set).
// Compresses text files with gzip like Shopify's CDN does, so speed measurements are realistic.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const compressible = new Set(['.html', '.css', '.js', '.svg']);
const port = Number(process.env.PORT || 4321);
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  if (!path.extname(p)) p += '.html';
  const file = path.join(outDir, p);
  if (!file.startsWith(outDir) || !fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end('<h1>Not found</h1>'); return; }
  const ext = path.extname(file);
  const headers = { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000' };
  if (compressible.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
    fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
  } else {
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  }
}).listen(port, () => console.log(`preview on http://localhost:${port}`));
