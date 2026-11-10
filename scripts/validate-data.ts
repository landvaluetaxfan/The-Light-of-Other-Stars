/**
 * npm run validate — validates every public record in /data.
 * Exits non-zero on any error so CI and the build fail safely.
 */
import path from 'node:path';
import { loadFromDirectory } from '../src/lib/data/load.ts';
import { collectionNames } from '../src/lib/data/schema.ts';

const root = path.resolve(process.argv[2] ?? 'data');
const { store, errors } = loadFromDirectory(root);

if (!store) {
  console.error(`✗ Public data failed validation — ${errors.length} error(s):\n`);
  for (const e of errors) console.error(`  • ${e}`);
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
