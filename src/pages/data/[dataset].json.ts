/** Machine-readable exports: /data/canonical.json and /data/demonstration.json */
import type { APIRoute } from 'astro';
import { getStore } from '../../lib/data/load.ts';
import { datasetExport } from '../../lib/data/export.ts';
import type { Dataset } from '../../lib/data/schema.ts';

export function getStaticPaths() {
  return [{ params: { dataset: 'canonical' } }, { params: { dataset: 'demonstration' } }];
}

export const GET: APIRoute = ({ params }) =>
  new Response(JSON.stringify(datasetExport(getStore(), params.dataset as Dataset), null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
