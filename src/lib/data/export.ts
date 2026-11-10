/** Shared helpers for publishing the public data set and its JSON Schemas. */
import { z } from 'zod';
import { collections, collectionNames, Meta, CONTRACT_VERSION, type Store, type Dataset } from './schema.ts';

export function datasetExport(s: Store, dataset: Dataset) {
  const records: Record<string, unknown[]> = {};
  for (const c of collectionNames) {
    records[c] = (s[c] as { dataset: Dataset }[])
      .filter((r) => r.dataset === dataset)
      .map(({ dataset: _d, ...rest }) => rest);
  }
  return {
    contractVersion: CONTRACT_VERSION,
    dataset,
    notice:
      dataset === 'demonstration'
        ? 'Demonstration records: illustrative test data. Not part of the canonical public record.'
        : 'Canonical public records of the World Assembly Information Service.',
    meta: dataset === 'canonical' ? s.meta : undefined,
    records,
  };
}

export function jsonSchemas(): Record<string, unknown> {
  const out: Record<string, unknown> = { meta: z.toJSONSchema(Meta, { io: 'input' }) };
  for (const c of collectionNames) out[c] = z.toJSONSchema(collections[c], { io: 'input' });
  return out;
}
