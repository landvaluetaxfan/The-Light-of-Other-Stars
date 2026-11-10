/**
 * npm run schemas — writes JSON Schemas for every public record type to /schemas,
 * for use by an external simulation engine that generates records for this site.
 */
import fs from 'node:fs';
import path from 'node:path';
import { jsonSchemas } from '../src/lib/data/export.ts';
import { CONTRACT_VERSION } from '../src/lib/data/schema.ts';

const dir = path.resolve('schemas');
fs.mkdirSync(dir, { recursive: true });
const all = jsonSchemas();
for (const [name, schema] of Object.entries(all)) {
  fs.writeFileSync(path.join(dir, `${name}.schema.json`), JSON.stringify({ $comment: `Public data contract v${CONTRACT_VERSION} — generated from src/lib/data/schema.ts; do not edit by hand.`, ...(schema as object) }, null, 2) + '\n');
}
console.log(`Wrote ${Object.keys(all).length} schemas to ${path.relative(process.cwd(), dir)}/ (contract v${CONTRACT_VERSION}).`);
