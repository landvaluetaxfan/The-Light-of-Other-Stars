/**
 * Cross-record validation. Schema validation (load.ts) checks the shape of each
 * record; this module checks that records agree with each other and with the
 * rules of the World Bible.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Store, Dataset, RefsT } from './schema.ts';
import { CATEGORY_THRESHOLD, allowedBases, requiredYes, releaseOf, round4, RELEASE_DEFAULT, type BillCategoryT } from '../procedure.ts';

interface Options {
  /** Directory holding static assets (for publication logos and illustrations). */
  publicRoot?: string;
}

type AnyRecord = { id: string; dataset: Dataset };

const EPS = 0.00005;
const close = (a: number, b: number) => Math.abs(a - b) < EPS + 1e-9;

/** Extract [[ID]] / [[ID|label]] references from rich text. */
export function inlineRefs(text: string): string[] {
  return [...text.matchAll(/\[\[([A-Z0-9-]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1]);
}

export function simDateKey(d: string): string {
  // Normalise YYYY / YYYY-MM to sortable YYYY-MM-DD (start of period).
  const [y, m = '01', day = '01'] = d.split('-');
  return `${y}-${m}-${day}`;
}

export function crossValidate(s: Store, opts: Options = {}): string[] {
  const errors: string[] = [];
  const err = (id: string, msg: string) => errors.push(`${id}: ${msg}`);

  /* ---------- identity ---------- */
  const byId = new Map<string, { kind: string; rec: AnyRecord }>();
  const register = (kind: string, rec: AnyRecord) => {
    if (byId.has(rec.id)) err(rec.id, `duplicate ID (already used by a ${byId.get(rec.id)!.kind} record)`);
    else byId.set(rec.id, { kind, rec });
    const isDemoId = rec.id.startsWith('DEMO-');
    if (rec.dataset === 'demonstration' && !isDemoId) err(rec.id, 'demonstration records must use the DEMO- ID prefix');
    if (rec.dataset === 'canonical' && isDemoId) err(rec.id, 'canonical records may not use the DEMO- ID prefix');
  };
  const collectionsToRegister: [string, AnyRecord[]][] = [
    ['term', s.terms], ['region', s.regions], ['party', s.parties], ['member', s.members], ['bloc', s.blocs],
    ['composition', s.compositions], ['institution', s.institutions], ['office', s.offices], ['bill', s.bills],
    ['division', s.divisions], ['event', s.events], ['election', s.elections], ['release', s.releases],
    ['allocation', s.allocations], ['document', s.documents], ['publication', s.publications], ['article', s.articles],
  ];
  for (const [kind, list] of collectionsToRegister) for (const r of list) register(kind, r);
  // Nested IDs (amendments, council actions, rulings) share the global namespace.
  for (const b of s.bills) {
    for (const a of b.amendments) register('amendment', { id: a.id, dataset: b.dataset });
    for (const c of b.councilActions) register('council-action', { id: c.id, dataset: b.dataset });
    for (const r of b.rulings) register('ruling', { id: r.id, dataset: b.dataset });
  }
  // Publication slugs and article slugs.
  const slugs = new Set<string>();
  for (const p of s.publications) {
    if (slugs.has(p.slug)) err(p.id, `duplicate publication slug "${p.slug}"`);
    slugs.add(p.slug);
  }
  const artSlugs = new Set<string>();
  for (const a of s.articles) {
    const k = `${a.publicationId}/${a.slug}`;
    if (artSlugs.has(k)) err(a.id, `duplicate article slug "${a.slug}" in ${a.publicationId}`);
    artSlugs.add(k);
  }

  /** Check a reference: exists, has the right kind, and canonical never points at demonstration. */
  const ref = (from: AnyRecord, id: string | null | undefined, kinds: string | string[], field: string) => {
    if (id === null || id === undefined) return;
    const target = byId.get(id);
    const ks = Array.isArray(kinds) ? kinds : [kinds];
    if (!target) return err(from.id, `${field} references missing record ${id}`);
    if (!ks.includes(target.kind)) return err(from.id, `${field} references ${id}, which is a ${target.kind} (expected ${ks.join(' or ')})`);
    if (from.dataset === 'canonical' && target.rec.dataset === 'demonstration')
      err(from.id, `${field}: canonical record may not reference demonstration record ${id}`);
  };
  const refsBlock = (from: AnyRecord, refs: RefsT, field = 'refs') => {
    refs.bills.forEach((id) => ref(from, id, 'bill', `${field}.bills`));
    refs.divisions.forEach((id) => ref(from, id, 'division', `${field}.divisions`));
    refs.institutions.forEach((id) => ref(from, id, ['institution', 'office'], `${field}.institutions`));
    refs.events.forEach((id) => ref(from, id, 'event', `${field}.events`));
    refs.elections.forEach((id) => ref(from, id, 'election', `${field}.elections`));
    refs.documents.forEach((id) => ref(from, id, 'document', `${field}.documents`));
    refs.parties.forEach((id) => ref(from, id, 'party', `${field}.parties`));
  };
  const textRefs = (from: AnyRecord, texts: string[], field: string) => {
    for (const t of texts) for (const id of inlineRefs(t)) {
      const base = id;
      if (!byId.has(base)) err(from.id, `${field} links to missing record [[${id}]]`);
      else if (from.dataset === 'canonical' && byId.get(base)!.rec.dataset === 'demonstration')
        err(from.id, `${field}: canonical text may not link to demonstration record ${id}`);
    }
  };

  /* ---------- meta ---------- */
  const term = (id: string) => s.terms.find((t) => t.id === id);
  if (!term(s.meta.currentTermId)) errors.push(`meta: currentTermId ${s.meta.currentTermId} does not exist`);
  else if (term(s.meta.currentTermId)!.dataset !== 'canonical') errors.push('meta: current term must be canonical');
  const currentTerms = s.terms.filter((t) => t.status === 'current' && t.dataset === 'canonical');
  if (currentTerms.length !== 1) errors.push(`meta: exactly one canonical term must be "current" (found ${currentTerms.length})`);
  else if (currentTerms[0].id !== s.meta.currentTermId) errors.push('meta: currentTermId does not match the term marked current');
  const nowKey = simDateKey(s.meta.simulatedDate);

  /* ---------- terms & regions ---------- */
  for (const t of s.terms) {
    if (t.assemblySize !== t.constituencySeats + t.listSeats) err(t.id, `assemblySize ${t.assemblySize} ≠ constituency ${t.constituencySeats} + list ${t.listSeats}`);
    if (simDateKey(t.simEnd) < simDateKey(t.simStart)) err(t.id, 'simEnd precedes simStart');
  }
  const canonRegions = s.regions.filter((r) => r.dataset === 'canonical');
  if (canonRegions.length) {
    if (canonRegions.length !== 12) errors.push(`regions: the Bible defines twelve electoral regions (found ${canonRegions.length})`);
    const seats = canonRegions.reduce((a, r) => a + r.constituencySeats, 0);
    if (seats !== 300) errors.push(`regions: constituency seats total ${seats}, expected 300`);
  }

  /* ---------- parties, members, blocs ---------- */
  for (const p of s.parties) ref(p, p.fourPartyVariant.mergedIntoId, 'party', 'fourPartyVariant.mergedIntoId');
  for (const m of s.members) {
    ref(m, m.partyId, 'party', 'partyId');
    ref(m, m.sinceTermId, 'term', 'sinceTermId');
  }
  const controlled = new Map<string, number>(); // `${term}|${member}` → seats
  for (const b of s.blocs) {
    ref(b, b.termId, 'term', 'termId');
    ref(b, b.partyId, 'party', 'partyId');
    ref(b, b.holderId, 'member', 'holderId');
    ref(b, b.controllerId, 'member', 'controllerId');
    const holder = s.members.find((m) => m.id === b.holderId);
    if (holder && holder.partyId !== b.partyId) err(b.id, `holder ${b.holderId} belongs to ${holder.partyId}, not ${b.partyId}`);
    const who = b.controllerId ?? b.holderId;
    const k = `${b.termId}|${who}`;
    controlled.set(k, (controlled.get(k) ?? 0) + b.seats);
  }
  for (const [k, seats] of controlled) if (seats > 60) errors.push(`${k.split('|')[1]}: controls ${seats} seats in ${k.split('|')[0]}; no player may control more than 60 (§12)`);

  /* ---------- compositions ---------- */
  const compKeys = new Set<string>();
  for (const c of s.compositions) {
    ref(c, c.termId, 'term', 'termId');
    ref(c, c.electionId, 'election', 'electionId');
    const k = `${c.termId}|${c.dataset}`;
    if (compKeys.has(k)) err(c.id, `more than one ${c.dataset} composition for ${c.termId}`);
    compKeys.add(k);
    const t = term(c.termId);
    const seenParty = new Set<string>();
    let cons = 0, list = 0;
    for (const a of c.allocations) {
      ref(c, a.partyId, 'party', 'allocations.partyId');
      if (seenParty.has(a.partyId)) err(c.id, `party ${a.partyId} listed twice`);
      seenParty.add(a.partyId);
      cons += a.constituencySeats;
      list += a.listSeats;
    }
    if (t) {
      if (cons !== t.constituencySeats) err(c.id, `constituency seats total ${cons}, expected ${t.constituencySeats}`);
      if (cons + list !== t.assemblySize) err(c.id, `seat total ${cons + list} ≠ Assembly size ${t.assemblySize} for ${t.id}`);
    }
    // Blocs of the same dataset must account for each party's seats exactly.
    const blocs = s.blocs.filter((b) => b.termId === c.termId && b.dataset === c.dataset);
    if (blocs.length) {
      for (const a of c.allocations) {
        const sum = blocs.filter((b) => b.partyId === a.partyId).reduce((x, b) => x + b.seats, 0);
        if (sum !== a.constituencySeats + a.listSeats) err(c.id, `blocs of ${a.partyId} hold ${sum} seats; composition allocates ${a.constituencySeats + a.listSeats}`);
      }
      for (const b of blocs) if (!seenParty.has(b.partyId)) err(b.id, `party ${b.partyId} has no seats in ${c.id}`);
    }
  }

  /* ---------- institutions & offices ---------- */
  for (const i of s.institutions) ref(i, i.parentId, 'institution', 'parentId');
  for (const o of s.offices) {
    ref(o, o.institutionId, 'institution', 'institutionId');
    for (const h of o.holders) {
      ref(o, h.termId, 'term', 'holders.termId');
      ref(o, h.memberId, 'member', 'holders.memberId');
      if (h.status === 'serving' && !h.memberId) err(o.id, 'a serving holder must name a member');
      if ((h.status === 'vacant' || h.status === 'pending') && h.memberId) err(o.id, `holder status "${h.status}" cannot name a member`);
      if (o.dataset === 'canonical' && h.memberId) {
        const m = s.members.find((x) => x.id === h.memberId);
        if (m?.dataset === 'demonstration') err(o.id, 'canonical office lists a demonstration holder');
      }
    }
  }
  for (const inst of s.institutions) {
    if (inst.seats) {
      const seatsOffices = s.offices.filter((o) => o.institutionId === inst.id && o.dataset === 'canonical');
      if (inst.id === 'INST-COUNCIL' && seatsOffices.length !== inst.seats) err(inst.id, `Council has ${inst.seats} seats but ${seatsOffices.length} seat offices`);
    }
  }

  /* ---------- bills ---------- */
  const billNumbers = new Set<string>();
  for (const b of s.bills) {
    ref(b, b.termId, 'term', 'termId');
    const nk = `${b.dataset}|${b.termId}|${b.number}`;
    if (billNumbers.has(nk)) err(b.id, `duplicate bill number ${b.number} in ${b.termId}`);
    billNumbers.add(nk);
    b.sponsorIds.forEach((id) => ref(b, id, ['member', 'office', 'institution'], 'sponsorIds'));
    b.cosponsorIds.forEach((id) => ref(b, id, ['member', 'office', 'institution'], 'cosponsorIds'));
    const expected = CATEGORY_THRESHOLD[b.category as BillCategoryT];
    if (b.threshold !== expected) err(b.id, `category ${b.category} requires threshold ${expected}, found ${b.threshold}`);
    for (const a of b.amendments) {
      a.sponsorIds.forEach((id) => ref(b, id, 'member', `amendment ${a.id}.sponsorIds`));
      ref(b, a.divisionId, 'division', `amendment ${a.id}.divisionId`);
    }
    for (const h of b.history) ref(b, h.refId, ['division', 'event', 'council-action', 'ruling', 'amendment', 'allocation', 'release'], 'history.refId');
    for (const c of b.councilActions) {
      c.officeIds.forEach((id) => ref(b, id, 'office', `councilAction ${c.id}.officeIds`));
      if (c.kind === 'delay' && c.officeIds.length < 4) err(b.id, `council delay ${c.id} requires at least four Council votes (§6), has ${c.officeIds.length}`);
    }
    for (const r of b.rulings) ref(b, r.institutionId, 'institution', `ruling ${r.id}.institutionId`);
    b.divisionIds.forEach((id) => ref(b, id, 'division', 'divisionIds'));
    b.outcome?.allocationIds.forEach((id) => ref(b, id, 'allocation', 'outcome.allocationIds'));
    refsBlock(b, b.refs);
    textRefs(b, [b.summary, ...b.provisions.map((p) => p.text), ...b.history.map((h) => h.action)], 'text');
    // Resource fields
    if (b.category === 'release-size' && b.resource?.releaseFraction === undefined) err(b.id, 'release-size measures must state resource.releaseFraction');
    if (b.category === 'release-size') {
      // §14: any bloc holding at least a tenth of the Assembly may propose a release size.
      const t = term(b.termId);
      const termBlocs = s.blocs.filter((x) => x.termId === b.termId && x.dataset === b.dataset);
      if (t && termBlocs.length && !termBlocs.some((x) => b.sponsorIds.includes(x.holderId) && x.seats * 10 >= t.assemblySize))
        err(b.id, 'release-size proposals must be sponsored by the holder of a bloc with at least one-tenth of the Assembly (§14)');
    }
    if (b.category === 'channel-split') {
      const sp = b.resource?.channelSplitPercent;
      if (!sp) err(b.id, 'channel-split measures must state resource.channelSplitPercent');
      else if (!close(sp.endowment + sp.assembly + sp.deferral + sp.reserve, 100)) err(b.id, 'channel split percentages must total 100');
    }
    if (b.category === 'assembly-project') {
      const r = b.resource;
      const missing = ['units', 'channel', 'reach', 'implementingActor', 'beneficiaries', 'duration', 'conditions'].filter((f) => r?.[f as keyof typeof r] === undefined);
      if (missing.length) err(b.id, `Assembly projects must specify ${missing.join(', ')} (§16)`);
    }
    // Status consistency with divisions
    const divs = s.divisions.filter((d) => d.billId === b.id);
    const passage = divs.filter((d) => d.stage === 'passage');
    const carriedPassage = passage.some((d) => d.result?.outcome === 'carried');
    if (['passed', 'delayed', 'vetoed', 'override-carried', 'override-failed', 'enacted'].includes(b.status) && !carriedPassage)
      err(b.id, `status "${b.status}" requires a carried passage division`);
    if (b.status === 'not-passed' && !passage.some((d) => d.result?.outcome === 'not-carried')) err(b.id, 'status "not-passed" requires a not-carried passage division');
    if (b.status === 'voting' && !passage.some((d) => d.status === 'open')) err(b.id, 'status "voting" requires an open passage division');
    if (b.status === 'override-carried' && !divs.some((d) => d.stage === 'override' && d.result?.outcome === 'carried')) err(b.id, 'status "override-carried" requires a carried override division');
    for (const d of divs) if (!b.divisionIds.includes(d.id)) err(b.id, `division ${d.id} is not listed in divisionIds`);
  }

  /* ---------- divisions ---------- */
  for (const d of s.divisions) {
    ref(d, d.termId, 'term', 'termId');
    ref(d, d.billId, 'bill', 'billId');
    ref(d, d.amendmentId, 'amendment', 'amendmentId');
    const bill = s.bills.find((b) => b.id === d.billId);
    if (d.stage === 'amendment' && !d.amendmentId) err(d.id, 'amendment divisions must name amendmentId');
    if (d.stage === 'override' && d.threshold !== 'two-thirds') err(d.id, 'override divisions require a two-thirds threshold (§6)');
    if (d.stage === 'passage' && bill && d.threshold !== bill.threshold) err(d.id, `passage threshold ${d.threshold} ≠ bill threshold ${bill.threshold}`);
    if (d.stage === 'amendment' && d.threshold !== 'simple-majority') err(d.id, 'amendment divisions use a simple majority');
    const cat = d.stage === 'override' ? null : ((bill?.category ?? null) as BillCategoryT | null);
    if (!allowedBases(d.threshold, cat).includes(d.basis)) err(d.id, `basis "${d.basis}" is not permitted for a ${d.threshold} vote`);
    if (d.status !== 'closed') {
      // Sealed-tally convention: nothing about an open or scheduled vote may be published.
      if (d.ballots.length) err(d.id, `${d.status} division may not publish ballots (tallies are sealed until the window closes)`);
      if (d.result) err(d.id, `${d.status} division may not publish a result`);
      continue;
    }
    if (!d.result) { err(d.id, 'closed division must publish its result'); continue; }
    const t = term(d.termId);
    const blocs = s.blocs.filter((b) => b.termId === d.termId && b.dataset === d.dataset && b.status !== 'transferred');
    const seen = new Set<string>();
    let yes = 0, no = 0, abstain = 0;
    for (const bl of d.ballots) {
      ref(d, bl.blocId, 'bloc', 'ballots.blocId');
      ref(d, bl.proxyMemberId, 'member', 'ballots.proxyMemberId');
      if (seen.has(bl.blocId)) err(d.id, `bloc ${bl.blocId} recorded twice`);
      seen.add(bl.blocId);
      const bloc = s.blocs.find((b) => b.id === bl.blocId);
      if (bloc && bloc.seats !== bl.seats) err(d.id, `ballot for ${bl.blocId} records ${bl.seats} seats; bloc holds ${bloc.seats}`);
      if (bloc && bloc.termId !== d.termId) err(d.id, `bloc ${bl.blocId} is not seated in ${d.termId}`);
      if (bl.castBy === 'not-cast' && bl.vote !== 'abstain') err(d.id, `bloc ${bl.blocId} did not vote and must be recorded as abstaining (§12)`);
      if (bl.castBy === 'proxy') {
        if (!bl.proxyMemberId) err(d.id, `proxy ballot for ${bl.blocId} must name proxyMemberId`);
        const proxy = s.members.find((m) => m.id === bl.proxyMemberId);
        if (bloc && proxy && proxy.partyId !== bloc.partyId) err(d.id, `proxy ${proxy.id} is not a member of ${bloc.partyId} (party proxy required)`);
      } else if (bl.proxyMemberId) err(d.id, `ballot for ${bl.blocId} names a proxy but castBy is "${bl.castBy}"`);
      if (bl.castBy === 'controller' && !bloc?.controllerId) err(d.id, `ballot for ${bl.blocId} cast by controller, but the bloc has no controller`);
      if (bl.vote === 'yes') yes += bl.seats; else if (bl.vote === 'no') no += bl.seats; else abstain += bl.seats;
    }
    if (blocs.length) for (const b of blocs) if (!seen.has(b.id)) err(d.id, `roll call omits seated bloc ${b.id}`);
    const r = d.result;
    if (r.yes !== yes || r.no !== no || r.abstain !== abstain) err(d.id, `result ${r.yes}/${r.no}/${r.abstain} does not match ballots ${yes}/${no}/${abstain}`);
    if (r.seatsVoting !== yes + no) err(d.id, `seatsVoting ${r.seatsVoting} ≠ yes + no (${yes + no})`);
    if (t && r.totalSeats !== t.assemblySize) err(d.id, `totalSeats ${r.totalSeats} ≠ Assembly size ${t.assemblySize}`);
    if (r.yes + r.no + r.abstain !== r.totalSeats) err(d.id, `yes + no + abstain (${r.yes + r.no + r.abstain}) ≠ totalSeats ${r.totalSeats}`);
    const req = requiredYes(d.threshold, d.basis, r.seatsVoting, r.totalSeats);
    if (r.required !== req) err(d.id, `required ${r.required}, but ${d.threshold} ${d.basis} gives ${req}`);
    const outcome = r.yes >= req ? 'carried' : 'not-carried';
    if (r.outcome !== outcome) err(d.id, `outcome "${r.outcome}" is inconsistent with the tally (should be "${outcome}")`);
  }

  /* ---------- events ---------- */
  for (const e of s.events) {
    ref(e, e.termId, 'term', 'termId');
    ref(e, e.issuerId, ['institution', 'office'], 'issuerId');
    refsBlock(e, e.refs);
    textRefs(e, [e.summary, ...e.body], 'body');
    if (e.dataset === 'canonical' && simDateKey(e.simDate) > nowKey)
      err(e.id, `canonical bulletin dated ${e.simDate} is after the current simulated date ${s.meta.simulatedDate}; unpublished events may not be released`);
  }

  /* ---------- elections ---------- */
  for (const el of s.elections) {
    ref(el, el.termId, 'term', 'termId');
    ref(el, el.compositionId, 'composition', 'compositionId');
    if (el.status === 'certified' && !el.results) err(el.id, 'certified elections must publish results');
    if (el.status !== 'certified' && el.results) err(el.id, 'results may only be published once certified');
    if (el.results) {
      const t = term(el.termId);
      let cons = 0, list = 0, share = 0, hasShare = false;
      for (const p of el.results.parties) {
        ref(el, p.partyId, 'party', 'results.partyId');
        cons += p.constituencySeats; list += p.listSeats;
        if (p.voteSharePercent !== null) { share += p.voteSharePercent; hasShare = true; }
      }
      if (t && cons + list !== t.assemblySize) err(el.id, `seat total ${cons + list} ≠ Assembly size ${t.assemblySize}`);
      if (t && cons !== t.constituencySeats) err(el.id, `constituency seats ${cons} ≠ ${t.constituencySeats}`);
      if (hasShare && share > 100.05) err(el.id, `vote shares total ${share.toFixed(2)}% (> 100%)`);
      const comp = s.compositions.find((c) => c.id === el.compositionId);
      if (comp) for (const p of el.results.parties) {
        const a = comp.allocations.find((x) => x.partyId === p.partyId);
        if (!a || a.constituencySeats !== p.constituencySeats || a.listSeats !== p.listSeats) err(el.id, `result for ${p.partyId} does not match composition ${comp.id}`);
      }
    }
  }

  /* ---------- resource ledger ---------- */
  for (const ds of ['canonical', 'demonstration'] as Dataset[]) {
    const rels = s.releases.filter((r) => r.dataset === ds).sort((a, b) => (term(a.termId)?.number ?? 0) - (term(b.termId)?.number ?? 0));
    let expectedStart: number = s.meta.pool.initialUnits;
    const termsSeen = new Set<string>();
    for (const r of rels) {
      ref(r, r.termId, 'term', 'termId');
      ref(r, r.sizeBillId, 'bill', 'sizeBillId');
      ref(r, r.splitBillId, 'bill', 'splitBillId');
      if (termsSeen.has(r.termId)) err(r.id, `more than one release for ${r.termId}`);
      termsSeen.add(r.termId);
      if (!close(r.startingPool, expectedStart)) err(r.id, `startingPool ${r.startingPool} ≠ previous closing pool ${expectedStart}`);
      if (r.status === 'pending') {
        if (r.fraction !== null || r.releasedUnits !== null || r.closingPool !== null || r.channels !== null)
          err(r.id, 'pending releases may not state fraction, released units, closing pool or channels');
        break; // later releases cannot exist after a pending one
      }
      if (r.fraction === null || r.releasedUnits === null || r.closingPool === null || !r.channels || !r.sizeDecision || !r.splitDecision) {
        err(r.id, 'authorized releases must state fraction, releasedUnits, closingPool, channels and both decisions');
        continue;
      }
      if (r.sizeDecision === 'default' && !close(r.fraction, RELEASE_DEFAULT)) err(r.id, 'default release size must be 10% (§14)');
      if (r.sizeDecision === 'voted' && !r.sizeBillId) err(r.id, 'voted release size must cite sizeBillId');
      if (r.splitDecision === 'voted' && !r.splitBillId) err(r.id, 'voted channel split must cite splitBillId');
      const { released, closing } = releaseOf(r.startingPool, r.fraction);
      if (!close(r.releasedUnits, released)) err(r.id, `releasedUnits ${r.releasedUnits} ≠ startingPool × fraction (${released})`);
      if (!close(r.closingPool, closing)) err(r.id, `closingPool ${r.closingPool} ≠ startingPool − released (${closing})`);
      const ch = r.channels;
      const chSum = round4(ch.endowment + ch.assembly + ch.deferral + ch.reserve);
      if (!close(chSum, r.releasedUnits)) err(r.id, `channel totals ${chSum} ≠ released units ${r.releasedUnits}`);
      if (r.splitDecision === 'default') {
        const third = round4(r.releasedUnits / 3);
        if (ch.deferral !== 0) err(r.id, 'default split gives nothing to Deferral (§15)');
        for (const k of ['endowment', 'assembly', 'reserve'] as const) if (Math.abs(ch[k] - third) > 0.0002) err(r.id, `default split gives one-third (${third}) to ${k}`);
      }
      if (r.splitDecision === 'voted' && r.splitBillId) {
        const sb = s.bills.find((b) => b.id === r.splitBillId);
        const sp = sb?.resource?.channelSplitPercent;
        if (sp) for (const k of ['endowment', 'assembly', 'deferral', 'reserve'] as const) {
          const want = round4((r.releasedUnits * sp[k]) / 100);
          if (Math.abs(ch[k] - want) > 0.0002) err(r.id, `${k} channel ${ch[k]} ≠ ${sp[k]}% of release (${want})`);
        }
      }
      if (r.sizeDecision === 'voted' && r.sizeBillId) {
        const sb = s.bills.find((b) => b.id === r.sizeBillId);
        if (sb?.resource?.releaseFraction !== undefined && !close(sb.resource.releaseFraction, r.fraction)) err(r.id, `fraction ${r.fraction} ≠ fraction in ${sb.id}`);
      }
      // Allocations within each channel may not exceed the channel.
      for (const k of ['endowment', 'assembly', 'deferral', 'reserve'] as const) {
        const used = round4(s.allocations.filter((a) => a.releaseId === r.id && a.channel === k).reduce((x, a) => x + a.units, 0));
        if (used - ch[k] > 0.0002) err(r.id, `${k} allocations total ${used}, exceeding the channel's ${ch[k]} units`);
      }
      expectedStart = r.closingPool;
    }
  }
  const order = ['allocated', 'committed', 'reached', 'used'];
  for (const a of s.allocations) {
    ref(a, a.releaseId, 'release', 'releaseId');
    ref(a, a.billId, 'bill', 'billId');
    const rel = s.releases.find((r) => r.id === a.releaseId);
    if (rel && rel.status !== 'authorized') err(a.id, `allocation against release ${rel.id}, which is not authorized`);
    const last = a.stageHistory[a.stageHistory.length - 1];
    if (last.stage !== a.stage) err(a.id, `stage "${a.stage}" does not match final stageHistory entry "${last.stage}"`);
    for (let i = 1; i < a.stageHistory.length; i++)
      if (order.indexOf(a.stageHistory[i].stage) <= order.indexOf(a.stageHistory[i - 1].stage)) err(a.id, 'stageHistory must advance allocated → committed → reached → used');
  }

  /* ---------- documents ---------- */
  for (const d of s.documents) {
    const ids = new Set<string>();
    for (const sec of d.sections) {
      if (ids.has(sec.id)) err(d.id, `duplicate section id ${sec.id}`);
      ids.add(sec.id);
      textRefs(d, [...sec.paragraphs, ...sec.list], `section ${sec.id}`);
    }
  }

  /* ---------- press ---------- */
  const assetExists = (p: string) => !opts.publicRoot || fs.existsSync(path.join(opts.publicRoot, p));
  for (const p of s.publications) {
    ref(p, p.ownerMemberId, 'member', 'ownerMemberId');
    ref(p, p.affiliatedPartyId, 'party', 'affiliatedPartyId');
    if (p.affiliation === 'party-affiliated' && !p.affiliatedPartyId) err(p.id, 'party-affiliated publications must name affiliatedPartyId');
    if (p.dataset === 'demonstration' && p.status !== 'demonstration') err(p.id, 'demonstration publications must have status "demonstration"');
    if (p.dataset === 'canonical' && p.status === 'demonstration') err(p.id, 'canonical publications may not have status "demonstration"');
    if (!assetExists(p.brand.logo)) err(p.id, `logo file public/${p.brand.logo} not found`);
  }
  for (const a of s.articles) {
    ref(a, a.publicationId, 'publication', 'publicationId');
    const pub = s.publications.find((p) => p.id === a.publicationId);
    if (pub && pub.dataset !== a.dataset) err(a.id, 'articles must belong to the same dataset as their publication');
    if (a.illustration && !assetExists(a.illustration.src)) err(a.id, `illustration public/${a.illustration.src} not found`);
    refsBlock(a, a.refs);
    textRefs(a, a.body, 'body');
  }

  return errors;
}
