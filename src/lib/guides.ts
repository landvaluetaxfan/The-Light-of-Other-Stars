/**
 * Player guides: document records with IDs DOC-GUIDE-*. Each may have a printed PDF in
 * public/guides/<id>.pdf, produced by `npm run guides:pdf`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { href } from './site.ts';
import type { Store } from './data/schema.ts';

/** The original player handbook, published as-is (public/docs/). */
export const WORLD_BIBLE = {
  title: 'World Bible v3.4',
  description: 'The complete player handbook: the setting, the treaty, the rules and the public electorate.',
  url: href('/docs/world-bible-v3-4.pdf'),
  size: '1.3 MB',
} as const;

export const GUIDE_PREFIX = 'DOC-GUIDE-';

/** The public URL of a guide's PDF, or null if none has been generated. */
export function guidePdf(id: string): string | null {
  if (!id.startsWith(GUIDE_PREFIX)) return null;
  const file = `${id.toLowerCase()}.pdf`;
  return fs.existsSync(path.resolve('public/guides', file)) ? href(`/guides/${file}`) : null;
}

/** Party guides in seating order, followed by any other guides (e.g. the interest groups). */
export function playerGuides(s: Store) {
  const guides = s.documents.filter((d) => d.dataset === 'canonical' && d.id.startsWith(GUIDE_PREFIX));
  const parties = [...s.parties].sort((a, b) => a.seatingOrder - b.seatingOrder);
  const partyOf = (id: string) => parties.find((p) => `${GUIDE_PREFIX}${p.id.replace(/^PTY-/, '')}` === id);
  const rank = (id: string) => { const p = partyOf(id); return p ? p.seatingOrder : 1000; };
  return guides
    .sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id))
    .map((d) => ({ doc: d, party: partyOf(d.id) ?? null, pdf: guidePdf(d.id), url: href(`/registry/documents/${d.id}/`) }));
}
