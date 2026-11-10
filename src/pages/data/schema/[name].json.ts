/** JSON Schemas for every record type: /data/schema/<collection>.json */
import type { APIRoute } from 'astro';
import { jsonSchemas } from '../../../lib/data/export.ts';

export function getStaticPaths() {
  return Object.keys(jsonSchemas()).map((name) => ({ params: { name } }));
}

export const GET: APIRoute = ({ params }) =>
  new Response(JSON.stringify(jsonSchemas()[params.name!], null, 2), { headers: { 'Content-Type': 'application/json' } });
