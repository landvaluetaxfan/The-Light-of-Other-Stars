/** Build-time search index: one entry per public record with its permanent path. */
import type { APIRoute } from 'astro';
import { getStore } from '../lib/data/load.ts';
import { recordIndex } from '../lib/site.ts';
import { plain } from '../lib/richtext.ts';

export const GET: APIRoute = () => {
  const s = getStore();
  const extra = new Map<string, string>();
  const put = (id: string, ...texts: (string | undefined)[]) => extra.set(id, texts.filter(Boolean).map((t) => plain(t!)).join(' '));
  for (const b of s.bills) put(b.id, b.shortTitle, b.summary, b.provisions.map((p) => `${p.heading} ${p.text}`).join(' '), b.tags.join(' '));
  for (const d of s.divisions) put(d.id, d.question, d.billId);
  for (const e of s.events) put(e.id, e.summary, e.body.join(' '));
  for (const d of s.documents) put(d.id, d.summary, d.sections.map((x) => `${x.heading} ${x.paragraphs.join(' ')} ${x.list.join(' ')} ${x.table?.rows.flat().join(' ') ?? ''}`).join(' '));
  for (const i of s.institutions) put(i.id, i.shortName, i.summary, i.powers.join(' '));
  for (const p of s.parties) put(p.id, p.abbreviation, p.summary, p.corePosition, p.internalDivision);
  for (const a of s.articles) put(a.id, a.dek, a.byline.join(' '), a.body.join(' '));
  for (const p of s.publications) put(p.id, p.tagline, p.description);
  for (const o of s.offices) put(o.id, o.publicStance, o.selection);
  for (const m of s.members) put(m.id, m.roles.join(' '));
  const entries = [...recordIndex(s).values()].map((e) => ({
    id: e.id,
    k: e.kind,
    t: e.label,
    p: e.path,
    d: e.dataset === 'demonstration' ? 1 : 0,
    x: (extra.get(e.id) ?? '').slice(0, 4000),
  }));
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json' } });
};
