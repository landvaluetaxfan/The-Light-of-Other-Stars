/**
 * npm run validate — validates every public record in /data.
 * Exits non-zero on any error so CI and the build fail safely.
 */
import path from 'node:path';
import { loadFromDirectory } from '../src/lib/data/load.ts';
import { collectionNames } from '../src/lib/data/schema.ts';

const root = path.resolve(process.argv[2] ?? 'data');
const result = loadFromDirectory(root);
const { store } = result;
// Report paths relative to the repository (e.g. data/canonical/meta.json), not the machine.
const errors = result.errors.map((e) => e.split(process.cwd() + path.sep).join('').replace(/\\/g, '/'));

if (!store) {
  console.error(`✗ Public data failed validation — ${errors.length} error(s):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  if (process.env.GITHUB_ACTIONS) {
    // Workflow commands become check-run annotations, readable through the GitHub API
    // (getCheckRunErrors), so publishing tools can see exactly why a commit was rejected.
    const esc = (s: string) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    console.log(`::error title=Data validation failed (${errors.length})::${esc(errors.join('\n'))}`);
  }
  process.exit(1);
}

const rows = collectionNames.map((c) => {
  const list = store[c] as { dataset: string }[];
  const canon = list.filter((r) => r.dataset === 'canonical').length;
  return { collection: c, canonical: canon, demonstration: list.length - canon };
});
console.log('✓ Public data valid.');
console.log(`  Simulated date ${store.meta.simulatedDate} · term ${store.meta.currentTermId} · week ${store.meta.currentWeek} (${store.meta.phase})`);
console.table(rows);
