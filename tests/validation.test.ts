import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadFromDirectory, scanForbiddenKeys } from '../src/lib/data/load.ts';
import { crossValidate } from '../src/lib/data/validate.ts';
import { Bloc, Division, Event, type Store } from '../src/lib/data/schema.ts';

const root = path.resolve('data');
const loaded = loadFromDirectory(root);
const fresh = (): Store => structuredClone(loaded.store!);
const errorsOf = (s: Store) => crossValidate(s);
const has = (errors: string[], fragment: string) => assert.ok(errors.some((e) => e.includes(fragment)), `expected an error containing "${fragment}", got:\n${errors.join('\n')}`);

test('the published data set is valid', () => {
  assert.deepEqual(loaded.errors, []);
  assert.ok(loaded.store);
});

test('duplicate IDs are rejected', () => {
  const s = fresh();
  s.events.push({ ...s.events[0] });
  has(errorsOf(s), 'duplicate ID');
});

test('demonstration records must carry the DEMO- prefix, canonical records must not', () => {
  const s = fresh();
  s.events.push({ ...s.events.find((e) => e.dataset === 'canonical')!, id: 'NT-T1-999', dataset: 'demonstration' });
  has(errorsOf(s), 'DEMO- ID prefix');
});

test('canonical records may not reference demonstration records', () => {
  const s = fresh();
  const e = s.events.find((x) => x.dataset === 'canonical')!;
  e.refs.bills.push('DEMO-B-T1-001');
  has(errorsOf(s), 'canonical record may not reference demonstration record');
});

test('missing references are reported', () => {
  const s = fresh();
  s.bills[0].sponsorIds = ['DEMO-M-NOBODY'];
  has(errorsOf(s), 'references missing record DEMO-M-NOBODY');
});

test('inline [[links]] must resolve', () => {
  const s = fresh();
  s.events[0].body.push('See [[B-T9-999]].');
  has(errorsOf(s), 'links to missing record [[B-T9-999]]');
});

test('composition seat totals must match the Assembly', () => {
  const s = fresh();
  s.compositions[0].allocations[0].listSeats += 1;
  has(errorsOf(s), 'seat total 601');
});

test('blocs must account for each party allocation', () => {
  const s = fresh();
  s.blocs.find((b) => b.id === 'DEMO-BL-02')!.seats = 41;
  has(errorsOf(s), 'blocs of PTY-COLLECTIVISTS hold 131 seats');
});

test('blocs are capped at sixty seats by schema', () => {
  const b = { ...structuredClone(loaded.store!.blocs[0]) } as Record<string, unknown>;
  delete b.dataset;
  b.seats = 61;
  assert.equal(Bloc.safeParse(b).success, false);
});

test('no member may control more than sixty seats', () => {
  const s = fresh();
  s.blocs.find((b) => b.id === 'DEMO-BL-02')!.controllerId = 'DEMO-M-ALTAIR';
  has(errorsOf(s), 'no player may control more than 60');
});

test('division tallies must match ballots', () => {
  const s = fresh();
  s.divisions.find((d) => d.id === 'DEMO-D-T1-001')!.result!.yes = 330;
  has(errorsOf(s), 'does not match ballots');
});

test('division outcomes must follow from the threshold', () => {
  const s = fresh();
  s.divisions.find((d) => d.id === 'DEMO-D-T1-007')!.result!.outcome = 'carried';
  has(errorsOf(s), 'inconsistent with the tally');
});

test('a ninety-per-cent vote with 74% support is not carried', () => {
  const d = loaded.store!.divisions.find((x) => x.id === 'DEMO-D-T1-007')!;
  assert.equal(d.threshold, 'ninety-percent');
  assert.equal(d.result!.required, 508);
  assert.equal(d.result!.outcome, 'not-carried');
});

test('open divisions may not publish ballots or results (sealed tallies)', () => {
  const s = fresh();
  const open = s.divisions.find((d) => d.status === 'open')!;
  const closed = s.divisions.find((d) => d.status === 'closed')!;
  open.ballots = structuredClone(closed.ballots);
  has(errorsOf(s), 'may not publish ballots');
});

test('non-voting blocs must be recorded as abstaining', () => {
  const s = fresh();
  const d = s.divisions.find((x) => x.id === 'DEMO-D-T1-007')!;
  d.ballots.find((b) => b.castBy === 'not-cast')!.vote = 'no';
  has(errorsOf(s), 'must be recorded as abstaining');
});

test('override divisions require two-thirds', () => {
  const raw = structuredClone(loaded.store!.divisions.find((x) => x.stage === 'override')!) as Record<string, unknown>;
  delete raw.dataset;
  raw.threshold = 'simple-majority';
  const parsed = Division.parse(raw);
  const s = fresh();
  const i = s.divisions.findIndex((x) => x.id === parsed.id);
  s.divisions[i] = { ...parsed, dataset: 'demonstration' };
  has(errorsOf(s), 'override divisions require a two-thirds threshold');
});

test('bill threshold must match its category', () => {
  const s = fresh();
  s.bills.find((b) => b.category === 'prohibition')!.threshold = 'two-thirds';
  has(errorsOf(s), 'requires threshold ninety-percent');
});

test('release arithmetic is checked', () => {
  const s = fresh();
  s.releases.find((r) => r.id === 'DEMO-REL-T1')!.closingPool = 87;
  has(errorsOf(s), 'closingPool 87');
});

test('channel totals must equal the release', () => {
  const s = fresh();
  s.releases.find((r) => r.id === 'DEMO-REL-T1')!.channels!.endowment = 5;
  has(errorsOf(s), 'channel totals');
});

test('allocations may not exceed their channel', () => {
  const s = fresh();
  s.allocations.find((a) => a.id === 'DEMO-AL-T1-02')!.units = 4;
  has(errorsOf(s), 'assembly allocations total 4');
});

test('canonical bulletins may not be dated after the current simulated date', () => {
  const s = fresh();
  s.events.find((e) => e.dataset === 'canonical')!.simDate = '2041-01';
  has(errorsOf(s), 'unpublished events may not be released');
});

test('private-data keys are rejected at any depth', () => {
  const errors: string[] = [];
  scanForbiddenKeys({ id: 'X', refs: { nested: [{ moderatorBrief: 'secret plan' }] } }, 'fixture', errors);
  scanForbiddenKeys({ id: 'Y', weights: { settlers: 0.4 } }, 'fixture', errors);
  assert.equal(errors.length, 2);
});

test('the data directory loader rejects unknown fields (strict schemas)', () => {
  const raw = structuredClone(loaded.store!.events[0]) as Record<string, unknown>;
  delete raw.dataset;
  raw.voterNotes = 'x';
  assert.equal(Event.safeParse(raw).success, false);
});
