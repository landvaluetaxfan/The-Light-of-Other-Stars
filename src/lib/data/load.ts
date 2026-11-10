/**
 * Loads public records from /data, validates them, and returns a typed Store.
 *
 *   data/canonical/<collection>.json      — array of records, and/or
 *   data/canonical/<collection>/*.json    — one record (or array) per file
 *   data/demo/…                           — same layout, demonstration records only
 *
 * The site build calls `getStore()`, which throws if any validation error is found,
 * so invalid data can never be published.
 */
import fs from 'node:fs';
import path from 'node:path';
import { collections, collectionNames, Meta, FORBIDDEN_KEYS, type Dataset, type Store, type CollectionName } from './schema.ts';
import { crossValidate } from './validate.ts';

export const DATASET_DIRS: Record<Dataset, string> = { canonical: 'canonical', demonstration: 'demo' };

export interface LoadResult {
  store: Store | null;
  errors: string[];
}

function readJson(file: string, errors: string[]): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${file}: invalid JSON — ${(e as Error).message}`);
    return undefined;
  }
}

/** Recursively reject keys reserved for private simulation state. */
export function scanForbiddenKeys(value: unknown, where: string, errors: string[], trail = ''): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => scanForbiddenKeys(v, where, errors, `${trail}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.includes(k)) errors.push(`${where}: forbidden private-data key "${k}" at ${trail || '(root)'}`);
      scanForbiddenKeys(v, where, errors, trail ? `${trail}.${k}` : k);
    }
  }
}

function fmtIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`).join('; ');
}

export function loadFromDirectory(dataRoot: string): LoadResult {
  const errors: string[] = [];
  const store: Record<string, unknown[]> = {};
  for (const c of collectionNames) store[c] = [];

  // Meta (canonical only)
  const metaFile = path.join(dataRoot, 'canonical', 'meta.json');
  let meta: unknown = undefined;
  if (!fs.existsSync(metaFile)) errors.push(`${metaFile}: missing simulation meta record`);
  else {
    const raw = readJson(metaFile, errors);
    scanForbiddenKeys(raw, metaFile, errors);
    const parsed = Meta.safeParse(raw);
    if (!parsed.success) errors.push(`${metaFile}: ${fmtIssues(parsed.error.issues)}`);
    else meta = parsed.data;
  }

  for (const dataset of Object.keys(DATASET_DIRS) as Dataset[]) {
    const dir = path.join(dataRoot, DATASET_DIRS[dataset]);
    if (!fs.existsSync(dir)) continue;
    const known = new Set<string>([...collectionNames, ...collectionNames.map((c) => `${c}.json`), 'meta.json']);
    for (const entry of fs.readdirSync(dir)) {
      if (!known.has(entry) && !entry.startsWith('.') && entry !== 'README.md') {
        errors.push(`${path.join(dir, entry)}: unknown collection (expected one of ${collectionNames.join(', ')})`);
      }
    }
    if (dataset === 'demonstration' && fs.existsSync(path.join(dir, 'meta.json'))) {
      errors.push(`${dir}: meta.json is only permitted in the canonical dataset`);
    }
    for (const name of collectionNames) {
      const files: string[] = [];
      const single = path.join(dir, `${name}.json`);
      if (fs.existsSync(single)) files.push(single);
      const sub = path.join(dir, name);
      if (fs.existsSync(sub) && fs.statSync(sub).isDirectory()) {
        for (const f of fs.readdirSync(sub).sort()) if (f.endsWith('.json')) files.push(path.join(sub, f));
      }
      for (const file of files) {
        const raw = readJson(file, errors);
        if (raw === undefined) continue;
        scanForbiddenKeys(raw, file, errors);
        const items = Array.isArray(raw) ? raw : [raw];
        items.forEach((item, i) => {
          const schema = collections[name as CollectionName];
          const parsed = schema.safeParse(item);
          const label = `${path.relative(dataRoot, file)}${Array.isArray(raw) ? `[${i}]` : ''}`;
          if (!parsed.success) {
            const id = (item as { id?: string })?.id ?? '?';
            errors.push(`${label} (${id}): ${fmtIssues(parsed.error.issues)}`);
            return;
          }
          store[name].push({ ...(parsed.data as object), dataset });
        });
      }
    }
  }

  if (errors.length || !meta) return { store: null, errors };
  const full = { meta, ...store } as unknown as Store;
  const crossErrors = crossValidate(full, { publicRoot: path.join(dataRoot, '..', 'public') });
  return { store: crossErrors.length ? null : full, errors: crossErrors };
}

let cached: Store | null = null;

/** Build-time accessor used by every page. Throws on invalid data. */
export function getStore(): Store {
  if (cached) return cached;
  const root = path.resolve(process.cwd(), 'data');
  const { store, errors } = loadFromDirectory(root);
  if (!store) {
    throw new Error(`Public data failed validation (${errors.length} error(s)):\n  - ${errors.join('\n  - ')}`);
  }
  cached = store;
  return store;
}
