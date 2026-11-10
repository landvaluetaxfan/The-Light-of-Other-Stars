import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requiredYes, releaseOf, CATEGORY_THRESHOLD, allowedBases } from '../src/lib/procedure.ts';
import { hemicycleLayout, assignSeats } from '../src/lib/hemicycle.ts';

test('simple majority of seats voting excludes abstentions', () => {
  // 546 seats voting → 274 needed; a 273–273 tie fails.
  assert.equal(requiredYes('simple-majority', 'seats-voting', 546, 600), 274);
  assert.equal(requiredYes('simple-majority', 'seats-voting', 600, 600), 301);
  assert.equal(requiredYes('simple-majority', 'seats-voting', 551, 600), 276);
});

test('two-thirds and ninety-per-cent thresholds round up', () => {
  assert.equal(requiredYes('two-thirds', 'seats-voting', 600, 600), 400);
  assert.equal(requiredYes('two-thirds', 'seats-voting', 599, 600), 400);
  assert.equal(requiredYes('two-thirds', 'total-seats', 450, 600), 400);
  assert.equal(requiredYes('ninety-percent', 'seats-voting', 564, 600), 508);
  assert.equal(requiredYes('ninety-percent', 'seats-voting', 600, 600), 540);
});

test('thresholds follow the World Bible', () => {
  assert.equal(CATEGORY_THRESHOLD['prohibition'], 'ninety-percent');
  assert.equal(CATEGORY_THRESHOLD['charter-amendment'], 'two-thirds');
  assert.equal(CATEGORY_THRESHOLD['reserve-expenditure'], 'two-thirds');
  assert.equal(CATEGORY_THRESHOLD['release-size'], 'simple-majority');
  assert.deepEqual(allowedBases('simple-majority', 'assembly-project'), ['seats-voting']);
  assert.deepEqual(allowedBases('ninety-percent', 'prohibition'), ['seats-voting']);
});

test('release accounting: R × p released, R × (1 − p) remains', () => {
  assert.deepEqual(releaseOf(100, 0.12), { released: 12, closing: 88 });
  assert.deepEqual(releaseOf(88, 0.1), { released: 8.8, closing: 79.2 });
  assert.deepEqual(releaseOf(79.2, 0.25), { released: 19.8, closing: 59.4 });
});

test('hemicycle places exactly the requested number of seats', () => {
  for (const n of [7, 100, 600, 612]) {
    const l = hemicycleLayout(n);
    assert.equal(l.seats.length, n);
    for (const p of l.seats) assert.ok(p.y <= l.height && p.x >= 0 && p.x <= l.width);
  }
});

test('seats are assigned contiguously and the remainder is left unassigned', () => {
  const l = hemicycleLayout(600);
  const groups = assignSeats(l, [
    { key: 'a', label: 'A', color: '#000', count: 132 },
    { key: 'b', label: 'B', color: '#111', count: 100 },
  ]);
  assert.equal(groups[0].seats.length, 132);
  assert.equal(groups[1].seats.length, 100);
  assert.equal(groups[2].seg, null);
  assert.equal(groups[2].seats.length, 368);
  // Ordered left to right: the first seat is further left than the last.
  assert.ok(l.seats[0].x < l.seats[599].x);
});
