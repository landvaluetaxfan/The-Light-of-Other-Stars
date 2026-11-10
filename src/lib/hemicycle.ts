/**
 * Parliament (hemicycle) seat layout.
 *
 * Seats are placed on concentric semicircular rows whose seat counts are
 * proportional to their radius, then ordered by angle (left to right) so that
 * consecutive seats form contiguous wedges for each party or vote.
 */
export interface SeatPos {
  x: number;
  y: number;
}

export interface HemicycleLayout {
  width: number;
  height: number;
  seatR: number;
  seats: SeatPos[]; // ordered left → right
  rows: number;
}

export function hemicycleLayout(total: number, opts: { width?: number; inner?: number } = {}): HemicycleLayout {
  const width = opts.width ?? 1000;
  const inner = opts.inner ?? 0.36;
  const outerR = width / 2 - 14;
  const cx = width / 2;
  const cy = outerR + 14;
  // rows such that radial spacing ≈ arc spacing
  let rows = Math.max(3, Math.ceil((1 + Math.sqrt(1 + (4 * total) / (Math.PI * (1 + inner) / (2 * (1 - inner))))) / 2));
  rows = Math.min(rows, 24);
  const radii = Array.from({ length: rows }, (_, i) => inner + ((1 - inner) * i) / Math.max(1, rows - 1));
  const sumR = radii.reduce((a, r) => a + r, 0);
  const counts = radii.map((r) => Math.max(1, Math.floor((total * r) / sumR)));
  let diff = total - counts.reduce((a, c) => a + c, 0);
  for (let i = rows - 1; diff > 0; i = (i - 1 + rows) % rows, diff--) counts[i]++;
  for (let i = 0; diff < 0; i = (i + 1) % rows) if (counts[i] > 1) { counts[i]--; diff++; }

  type S = SeatPos & { a: number; r: number };
  const seats: S[] = [];
  radii.forEach((r, i) => {
    const n = counts[i];
    for (let j = 0; j < n; j++) {
      const a = n === 1 ? Math.PI / 2 : Math.PI - (j * Math.PI) / (n - 1);
      seats.push({ x: cx + Math.cos(a) * r * outerR, y: cy - Math.sin(a) * r * outerR, a, r });
    }
  });
  seats.sort((p, q) => q.a - p.a || p.r - q.r);
  const radial = ((1 - inner) * outerR) / Math.max(1, rows - 1);
  const arc = (Math.PI * inner * outerR) / Math.max(1, counts[0] - 1);
  const seatR = Math.max(2, Math.min(radial, arc) * 0.42);
  return { width, height: cy + 6, seatR, seats: seats.map(({ x, y }) => ({ x: +x.toFixed(2), y: +y.toFixed(2) })), rows };
}

export interface Segment {
  key: string;
  label: string;
  color: string;
  count: number;
  hatch?: boolean;
}

/** Assign ordered seats to segments; unassigned remainder is returned with key null. */
export function assignSeats(layout: HemicycleLayout, segments: Segment[]) {
  const out: { seg: Segment | null; seats: SeatPos[] }[] = [];
  let k = 0;
  for (const seg of segments) {
    out.push({ seg, seats: layout.seats.slice(k, k + seg.count) });
    k += seg.count;
  }
  if (k < layout.seats.length) out.push({ seg: null, seats: layout.seats.slice(k) });
  return out;
}
