// Static server for the offline preview (used by Playwright when PREVIEW_URL is not set).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const port = Number(process.env.PORT || 4321);
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  if (!path.extname(p)) p += '.html';
  const file = path.join(outDir, p);
  if (!file.startsWith(outDir) || !fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end('<h1>Not found</h1>'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`preview on http://localhost:${port}`));
