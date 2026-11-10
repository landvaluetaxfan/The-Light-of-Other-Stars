/**
 * Post-build link checker. Crawls every HTML file in dist/ and verifies that
 * each internal href/src resolves to a built file, and that each #fragment
 * resolves to an element id on the target page. Exits non-zero on failure.
 */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const base = (process.env.BASE_PATH ?? '/The-Light-of-Other-Stars').replace(/\/$/, '');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d: fs.Dirent) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}

const files = walk(dist);
const html = files.filter((f) => f.endsWith('.html'));
const idCache = new Map<string, Set<string>>();
const idsOf = (file: string) => {
  if (!idCache.has(file)) {
    const src = fs.readFileSync(file, 'utf8');
    idCache.set(file, new Set([...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file)!;
};

function resolve(urlPath: string): string | null {
  if (!urlPath.startsWith(base + '/') && urlPath !== base) return null;
  let rel = decodeURIComponent(urlPath.slice(base.length)) || '/';
  const candidates = rel.endsWith('/') ? [path.join(dist, rel, 'index.html')] : [path.join(dist, rel), path.join(dist, rel, 'index.html'), path.join(dist, `${rel}.html`)];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? '';
}

const errors: string[] = [];
let checked = 0;
for (const file of html) {
  const src = fs.readFileSync(file, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  const pagePath = '/' + path.relative(dist, file).split(path.sep).join('/');
  for (const m of src.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const raw = m[1].replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|data:|javascript:)/.test(raw)) continue;
    checked++;
    const [beforeHash, frag] = raw.split('#');
    const p = beforeHash.split('?')[0];
    let target: string | null;
    if (p === '') target = file; // same-page fragment
    else if (p.startsWith('/')) {
      target = resolve(p);
      if (target === null) { errors.push(`${pagePath}: link outside base path → ${raw}`); continue; }
    } else { errors.push(`${pagePath}: relative link not allowed → ${raw}`); continue; }
    if (!target) { errors.push(`${pagePath}: broken link → ${raw}`); continue; }
    if (frag && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(frag))) errors.push(`${pagePath}: missing fragment #${frag} in ${raw}`);
  }
}

if (errors.length) {
  console.error(`✗ Link check failed: ${errors.length} problem(s) in ${html.length} pages\n`);
  for (const e of [...new Set(errors)]) console.error(`  • ${e}`);
  process.exit(1);
}
console.log(`✓ Link check passed: ${checked} internal links across ${html.length} pages.`);
