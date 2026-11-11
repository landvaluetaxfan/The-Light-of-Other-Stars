/**
 * npm run guides:pdf — prints every player guide (documents with IDs DOC-GUIDE-*) to
 * public/guides/<id>.pdf using a local headless Chrome or Edge.
 *
 * Run `npm run build` first; the PDFs are printed from the built site in dist/ and are
 * committed, so the next build publishes them. Re-run after editing a guide.
 * Set BROWSER=/path/to/chrome to choose the browser explicitly.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { getStore } from '../src/lib/data/load.ts';

const BASE = (process.env.BASE_PATH ?? '/The-Light-of-Other-Stars').replace(/\/$/, '');
const DIST = path.resolve('dist');
const OUT = path.resolve('public/guides');

const candidates = [
  process.env.BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean) as string[];
const browser = candidates.find((p) => fs.existsSync(p));
if (!browser) throw new Error('No Chrome or Edge found; set BROWSER to its path.');
if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/ is missing; run npm run build first.');

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (!p.startsWith(BASE + '/')) { res.writeHead(404).end(); return; }
  p = p.slice(BASE.length);
  let file = path.join(DIST, p);
  if (p.endsWith('/')) file = path.join(file, 'index.html');
  if (!file.startsWith(DIST) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const port = (server.address() as { port: number }).port;

const guides = getStore().documents.filter((d) => d.id.startsWith('DOC-GUIDE-'));
fs.mkdirSync(OUT, { recursive: true });
const profile = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TEMP ?? '/tmp'), 'guide-pdf-'));
try {
  for (const g of guides) {
    const out = path.join(OUT, `${g.id.toLowerCase()}.pdf`);
    const url = `http://127.0.0.1:${port}${BASE}/registry/documents/${g.id}/?print=1`;
    fs.rmSync(out, { force: true });
    await new Promise<void>((resolve, reject) => {
      // Asynchronous, so this process can keep serving the page while the browser prints it.
      const args = ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, '--no-pdf-header-footer', '--virtual-time-budget=4000', `--print-to-pdf=${out}`, url];
      execFile(browser, args, (err) => (err && !fs.existsSync(out) ? reject(err) : resolve()));
    });
    console.log(`✓ ${path.relative(process.cwd(), out)}  (${Math.round(fs.statSync(out).size / 1024)} KB)`);
  }
} finally {
  server.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
