/**
 * Site-wide helpers: base-path aware URLs, the permanent-URL resolver for every
 * record ID, labels and formatters.
 */
import type { Store, Dataset, BillT, PartyT } from './data/schema.ts';
import { simDateKey } from './data/validate.ts';

const BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');

/** Prefix a site-absolute path ("/legislation/") with the deployment base path. */
export function href(path: string): string {
  if (/^(https?:|mailto:|#)/.test(path)) return path;
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function asset(path: string): string {
  return href(`/${path.replace(/^\//, '')}`);
}

export const SITE_TITLE = 'World Assembly for Extrasolar Resources — Information Service';

export interface IndexEntry {
  id: string;
  kind: string;
  label: string;
  path: string; // site-absolute (without base)
  dataset: Dataset;
}

const cache = new WeakMap<Store, Map<string, IndexEntry>>();

/** Map every record ID (including nested ones) to its permanent location. */
export function recordIndex(s: Store): Map<string, IndexEntry> {
  const hit = cache.get(s);
  if (hit) return hit;
  const m = new Map<string, IndexEntry>();
  const add = (id: string, kind: string, label: string, path: string, dataset: Dataset) => m.set(id, { id, kind, label, path, dataset });
  for (const t of s.terms) add(t.id, 'Term', `${t.name} (${t.simStart.slice(0, 4)}–${t.simEnd.slice(0, 4)})`, `/archive/${t.id}/`, t.dataset);
  for (const r of s.regions) add(r.id, 'Electoral region', r.name, `/registry/documents/DOC-ELECTORAL/#regions`, r.dataset);
  for (const p of s.parties) add(p.id, 'Party', p.name, `/assembly/parties/${p.id}/`, p.dataset);
  for (const mb of s.members) add(mb.id, 'Member', mb.displayName, `/assembly/members/${mb.id}/`, mb.dataset);
  for (const b of s.blocs) {
    const holder = s.members.find((x) => x.id === b.holderId);
    add(b.id, 'Bloc', `${holder?.displayName ?? b.holderId} bloc (${b.seats})`, `/assembly/members/${b.holderId}/#${b.id}`, b.dataset);
  }
  for (const c of s.compositions) add(c.id, 'Composition', `Composition of ${c.termId}`, c.dataset === 'demonstration' ? '/assembly/demonstration/' : '/assembly/', c.dataset);
  for (const i of s.institutions) add(i.id, 'Institution', i.name, `/registry/institutions/${i.id}/`, i.dataset);
  for (const o of s.offices) add(o.id, 'Office', o.title, `/registry/institutions/${o.institutionId}/#${o.id}`, o.dataset);
  for (const b of s.bills) {
    add(b.id, 'Bill', b.title, `/legislation/${b.id}/`, b.dataset);
    for (const a of b.amendments) add(a.id, 'Amendment', `Amendment ${a.number} to ${b.shortTitle}`, `/legislation/${b.id}/#${a.id}`, b.dataset);
    for (const c of b.councilActions) add(c.id, 'Council action', `Council ${c.kind} on ${b.shortTitle}`, `/legislation/${b.id}/#${c.id}`, b.dataset);
    for (const r of b.rulings) add(r.id, 'Ruling', `Ruling on ${b.shortTitle}`, `/legislation/${b.id}/#${r.id}`, b.dataset);
  }
  for (const d of s.divisions) add(d.id, 'Division', d.question, `/divisions/${d.id}/`, d.dataset);
  for (const e of s.events) add(e.id, 'Bulletin', e.title, `/bulletins/${e.id}/`, e.dataset);
  for (const el of s.elections) add(el.id, 'Election', electionLabel(el.kind, el.termId), `/registry/elections/${el.id}/`, el.dataset);
  for (const r of s.releases) add(r.id, 'Release', `Release for ${r.termId}`, `/registry/ledger/#${r.id}`, r.dataset);
  for (const a of s.allocations) add(a.id, 'Allocation', a.title, `/registry/ledger/#${a.id}`, a.dataset);
  for (const d of s.documents) add(d.id, 'Document', d.title, `/registry/documents/${d.id}/`, d.dataset);
  for (const p of s.publications) add(p.id, 'Publication', p.name, `/press/${p.slug}/`, p.dataset);
  for (const a of s.articles) {
    const pub = s.publications.find((p) => p.id === a.publicationId);
    add(a.id, 'Article', a.headline, `/press/${pub?.slug}/${a.slug}/`, a.dataset);
  }
  cache.set(s, m);
  return m;
}

export function urlFor(s: Store, id: string): string {
  const e = recordIndex(s).get(id);
  if (!e) throw new Error(`No permanent URL for record ${id}`);
  return href(e.path);
}

export function electionLabel(kind: string, termId: string) {
  return kind === 'founding-assignment' ? `Founding assignment, ${termId}` : kind === 'general' ? `General election for ${termId}` : `By-election, ${termId}`;
}

/* ---------- formatting ---------- */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2040-03" → "March 2040"; "2040-03-14" → "14 March 2040"; "2040" → "2040". */
export function fmtSim(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  if (!m) return y;
  const month = MONTHS[Number(m) - 1];
  return day ? `${Number(day)} ${month} ${y}` : `${month} ${y}`;
}

export function fmtReal(d: string | null | undefined): string {
  if (!d) return '—';
  const [date, time] = d.split('T');
  const [y, m, day] = date.split('-');
  const base = `${Number(day)} ${MONTHS[Number(m) - 1].slice(0, 3)} ${y}`;
  return time ? `${base}, ${time.replace('Z', '')} UTC` : base;
}

export const fmtUnits = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toFixed(4));
export const fmtPct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
export const fmtInt = (n: number) => n.toLocaleString('en-GB');
export const romanTerm = (n: number) => ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] ?? String(n);

export const sortBySimDesc = <T extends { simDate: string; id: string }>(list: T[]) =>
  [...list].sort((a, b) => simDateKey(b.simDate).localeCompare(simDateKey(a.simDate)) || b.id.localeCompare(a.id));

/* ---------- labels ---------- */

export const BILL_STATUS: Record<BillT['status'], { label: string; tone: string }> = {
  filed: { label: 'Filed', tone: 'neutral' },
  scheduled: { label: 'Scheduled', tone: 'neutral' },
  voting: { label: 'Voting open — tally sealed', tone: 'amber' },
  passed: { label: 'Passed', tone: 'ok' },
  'not-passed': { label: 'Not passed', tone: 'bad' },
  delayed: { label: 'Delayed by Council', tone: 'amber' },
  vetoed: { label: 'Vetoed', tone: 'bad' },
  'override-carried': { label: 'Delay overridden', tone: 'ok' },
  'override-failed': { label: 'Override failed', tone: 'bad' },
  enacted: { label: 'Enacted', tone: 'ok' },
  voided: { label: 'Voided', tone: 'bad' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
};

export const BILL_CATEGORY: Record<BillT['category'], string> = {
  'release-size': 'Release size',
  'channel-split': 'Channel split',
  'assembly-project': 'Assembly project',
  'deferral-allocation': 'Deferral allocation',
  'reserve-expenditure': 'Reserve expenditure',
  prohibition: 'Prohibition',
  'charter-amendment': 'Charter amendment',
  'franchise-amendment': 'Franchise amendment',
  'council-proposal': 'Council proposal',
  administrative: 'Administrative',
};

export const EVENT_KIND: Record<string, string> = {
  'world-event': 'World event',
  'official-notice': 'Official notice',
  'election-bulletin': 'Election bulletin',
  'research-report': 'Research report',
  announcement: 'Announcement',
  'council-statement': 'Council statement',
  'legal-ruling': 'Legal ruling',
  'historical-record': 'Historical record',
};

export const CHANNEL_LABEL = { endowment: 'Endowment', assembly: 'Assembly', deferral: 'Deferral', reserve: 'Reserve' } as const;
export const CHANNEL_COLOR = { endowment: '#B8862B', assembly: '#2A6470', deferral: '#6B4E9B', reserve: '#3E7A47' } as const;
export const STAGE_LABEL = { allocated: 'Allocated', committed: 'Committed', reached: 'Reached', used: 'Used' } as const;
export const REACH_LABEL = { near: 'Near (within the Milky Way)', far: 'Far (beyond the Milky Way)', mixed: 'Mixed', 'not-applicable': 'Not applicable' } as const;

export const VOTE_COLOR = { yes: '#2E6B57', no: '#A3412F', abstain: '#A7AFB2' } as const;

export function partiesInSeatingOrder(s: Store): PartyT[] {
  return s.parties.filter((p) => p.status !== 'dissolved').sort((a, b) => a.seatingOrder - b.seatingOrder);
}

export function displayName(s: Store, id: string): string {
  return recordIndex(s).get(id)?.label ?? id;
}
