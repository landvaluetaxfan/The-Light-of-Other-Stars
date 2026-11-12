/**
 * Marks for the sixty public voter groups: one flat, brightly coloured symbol each.
 * markSvg(name) returns inline SVG for a group by its public name (as used in the
 * DOC-GUIDE-INTEREST-GROUPS tables), or null if there is none.
 */
const W = '#fff';
const f = (n) => +n.toFixed(2);
const P = (cx, cy, r, a) => `${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`;
const deg = (d) => (d * Math.PI) / 180;
const hexPath = (cx, cy, r) => 'M' + [0, 1, 2, 3, 4, 5].map((i) => P(cx, cy, r, deg(60 * i + 30))).join(' L') + 'Z';

const settlers = [
  // Sphere cut by two parallel slices; each piece eases further outward.
  ['Frontier Pioneers', '#9B4DFF', (c, id) => {
    const n = [Math.SQRT1_2, -Math.SQRT1_2], t = [Math.SQRT1_2, Math.SQRT1_2];
    const half = (k) => { const o = [60 + n[0] * k, 60 + n[1] * k], L = 200; const a = [o[0] - t[0] * L, o[1] - t[1] * L], b = [o[0] + t[0] * L, o[1] + t[1] * L]; return `M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])} L${f(b[0] + n[0] * L)},${f(b[1] + n[1] * L)} L${f(a[0] + n[0] * L)},${f(a[1] + n[1] * L)} Z`; };
    const circ = `<circle cx="60" cy="60" r="44" fill="${c}"/>`;
    const sh = (d) => `translate(${f(n[0] * d)} ${f(n[1] * d)})`;
    return `<defs>
      <mask id="${id}a"><rect x="-100" y="-100" width="320" height="320" fill="#fff"/><path d="${half(6)}" fill="#000"/></mask>
      <mask id="${id}b"><path d="${half(12)}" fill="#fff"/><path d="${half(25)}" fill="#000"/></mask>
      <mask id="${id}c"><path d="${half(31)}" fill="#fff"/></mask></defs>
      <g transform="${sh(-2)}"><g mask="url(#${id}a)">${circ}</g></g>
      <g transform="${sh(1)}"><g mask="url(#${id}b)">${circ}</g></g>
      <g transform="${sh(6)}"><g mask="url(#${id}c)">${circ}</g></g>`;
  }],

  // A ringed body releasing a geometric trail.
  ['Probe Lobbyists', '#0095FF', (c) => {
    let s = `<circle cx="40" cy="80" r="26" fill="${c}"/><circle cx="40" cy="80" r="9" fill="${W}"/>`;
    const a = deg(-48);
    let d = 26 + 5, r = 10;
    for (let i = 0; i < 6; i++) { d += r; s += `<circle cx="${f(40 + d * Math.cos(a))}" cy="${f(80 + d * Math.sin(a))}" r="${f(r)}" fill="${c}"/>`; d += r + 5; r *= 0.74; }
    return s;
  }],

  // A small, contented dwelling.
  ['Homestead Migrants', '#FFAA00', (c) => `
    <path d="M24,106 V58 A36,36 0 0 1 96,58 V106 Z" fill="${c}"/>
    <circle cx="47" cy="66" r="5.5" fill="${W}"/><circle cx="73" cy="66" r="5.5" fill="${W}"/>
    <path d="M47,82 A16,16 0 0 0 73,82" stroke="${W}" stroke-width="6" stroke-linecap="round" fill="none"/>`],

  // A hexagonal lattice, cells shrinking smoothly toward the edge.
  ['Industrial Expanders', '#FF5F00', (c) => {
    let s = ''; const h = 12;
    for (let row = -6; row <= 6; row++) for (let col = -6; col <= 6; col++) {
      const x = 60 + (col + (row & 1) * 0.5) * h, y = 60 + row * h * 0.866, d = Math.hypot(x - 60, y - 60);
      const r = 6.9 * (1 - Math.pow(d / 56, 1.7));
      if (r > 1.3) s += `<path d="${hexPath(x, y, r)}" fill="${c}"/>`;
    }
    return s;
  }],

  // A ringed world; a single settled point rides the ring.
  ['Planetary Colonists', '#00BFA5', (c) => {
    const rx = 54, ry = 14, m = deg(62);
    const mx = 60 + rx * Math.cos(m), my = 60 + ry * Math.sin(m);
    return `<g transform="rotate(-20 60 60)">
      <path d="M6,60 A${rx},${ry} 0 0 1 114,60" fill="none" stroke="${c}" stroke-width="7"/>
      <circle cx="60" cy="60" r="31" fill="${c}"/>
      <path d="M6,60 A${rx},${ry} 0 0 0 114,60" fill="none" stroke="${W}" stroke-width="15"/>
      <path d="M6,60 A${rx},${ry} 0 0 0 114,60" fill="none" stroke="${c}" stroke-width="7"/>
      <circle cx="${f(mx)}" cy="${f(my)}" r="11" fill="${W}"/><circle cx="${f(mx)}" cy="${f(my)}" r="7" fill="${c}"/>
    </g>`;
  }],

  // A measured burst of tapered rays; one reaches far beyond the rest.
  ['Risk Acceptors', '#FF2A1F', (c) => {
    const lens = [58, 38, 46, 36, 44, 38, 48, 36, 42, 38, 46, 36];
    const n = lens.length, cx = 58, cy = 62; let d = '';
    lens.forEach((L, i) => {
      const a = deg(-60 + (360 / n) * i), w = deg(360 / n / 2);
      d += `${i ? 'L' : 'M'}${P(cx, cy, 25, a - w)} L${P(cx, cy, L, a)} L${P(cx, cy, 25, a + w)} `;
    });
    return `<path d="${d}Z" fill="${c}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="10" fill="${W}"/>`;
  }],

  // Growth rings laid down off-centre, generation after generation.
  ['Legacy Builders', '#00C043', (c) => [48, 41, 34, 27, 20, 13, 6].map((R, k) => {
    const o = 48 - R; return `<circle cx="${f(60 - o * 0.28)}" cy="${f(60 + o * 0.2)}" r="${R}" fill="${k % 2 ? W : c}"/>`;
  }).join('')],

  // A first-place rosette.
  ['Claim-First Loyalists', '#FF1F8F', (c) => {
    let s = '';
    for (let i = 0; i < 18; i++) s += `<circle cx="${P(60, 60, 41, deg(i * 20)).split(',')[0]}" cy="${P(60, 60, 41, deg(i * 20)).split(',')[1]}" r="8" fill="${c}"/>`;
    return s + `<circle cx="60" cy="60" r="42" fill="${c}"/><circle cx="60" cy="60" r="32" fill="none" stroke="${W}" stroke-width="3"/>
      <path d="M55,46 L64,40 L66,40 L66,80 L58,80 L58,52 L55,54 Z" fill="${W}"/>`;
  }],

  // A gauge: measured progress, the final stages still to come.
  ['Speed Pragmatists', '#00C2D1', (c) => {
    const cx = 60, cy = 80, r1 = 30, r2 = 52, n = 7, g = deg(2.2); let s = '';
    const op = [1, 1, 1, 1, 0.5, 0.28, 0.14];
    for (let i = 0; i < n; i++) {
      const a1 = Math.PI + (Math.PI * i) / n + g, a2 = Math.PI + (Math.PI * (i + 1)) / n - g;
      s += `<path d="M${P(cx, cy, r1, a1)} L${P(cx, cy, r2, a1)} A${r2},${r2} 0 0 1 ${P(cx, cy, r2, a2)} L${P(cx, cy, r1, a2)} A${r1},${r1} 0 0 0 ${P(cx, cy, r1, a1)} Z" fill="${c}" opacity="${op[i]}"/>`;
    }
    const na = Math.PI + Math.PI * (4 / 7);
    s += `<path d="M${P(cx, cy, 5, na + Math.PI / 2)} L${P(cx, cy, 44, na)} L${P(cx, cy, 5, na - Math.PI / 2)} Z" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="9" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="${W}"/>`;
    return s;
  }],

  // A seed head; three seeds drift away along their own rays.
  ['Rapid Distributors', '#FFA000', (c) => {
    const cx = 54, cy = 66; let s = `<circle cx="${cx}" cy="${cy}" r="10" fill="${c}"/>`;
    for (let i = 0; i < 12; i++) {
      const a = deg(i * 30 - 90), drift = { 1: 9, 2: 18, 3: 9 }[i] || 0;
      const r0 = 15 + drift, r1 = 32 + drift;
      s += `<path d="M${P(cx, cy, r0, a)} L${P(cx, cy, r1, a)}" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`;
      s += `<circle cx="${P(cx, cy, r1 + 5, a).split(',')[0]}" cy="${P(cx, cy, r1 + 5, a).split(',')[1]}" r="5.4" fill="${c}"/>`;
    }
    return s;
  }],
];

/* ---- shared helpers for the other five families ---- */
const xy = (cx, cy, r, a) => [cx + r * Math.cos(deg(a)), cy + r * Math.sin(deg(a))];
const pt = (p) => `${f(p[0])},${f(p[1])}`;
function band(cx, cy, r1, r2, a1, a2) {
  const large = a2 - a1 > 180 ? 1 : 0;
  if (r1 <= 0) return `M${cx},${cy} L${pt(xy(cx, cy, r2, a1))} A${r2},${r2} 0 ${large} 1 ${pt(xy(cx, cy, r2, a2))} Z`;
  return `M${pt(xy(cx, cy, r1, a1))} L${pt(xy(cx, cy, r2, a1))} A${r2},${r2} 0 ${large} 1 ${pt(xy(cx, cy, r2, a2))} L${pt(xy(cx, cy, r1, a2))} A${r1},${r1} 0 ${large} 0 ${pt(xy(cx, cy, r1, a1))} Z`;
}
function vesica(p, q, b) {
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  return `M${pt(p)} Q${f(mx + nx * b)},${f(my + ny * b)} ${pt(q)} Q${f(mx - nx * b)},${f(my - ny * b)} ${pt(p)} Z`;
}
const disc = (cx, cy, r, c, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${c}" ${extra}/>`;
const ring = (cx, cy, r, w, c) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
const line = (a, b, w, c, cap = 'round') => `<path d="M${pt(a)} L${pt(b)}" stroke="${c}" stroke-width="${w}" stroke-linecap="${cap}"/>`;
const star4 = (cx, cy, R, r) => 'M' + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => pt(xy(cx, cy, i % 2 ? r : R, -90 + i * 45))).join(' L') + 'Z';

const stewards = [
  // A held centre inside a sanctuary boundary.
  ['Preserve Keepers', '#00C043', (c) => disc(60, 60, 19, c) + [5, 95, 185, 275].map((a) => `<path d="${band(60, 60, 31, 44, a, a + 80)}" fill="${c}"/>`).join('')],

  // A small world kept close beside a larger one.
  ['Near-Space Settlers', '#0095FF', (c) => disc(52, 64, 36, c) + disc(98, 34, 16, W) + disc(98, 34, 10.5, c)],

  // A leaf, veined.
  ['Wilderness Advocates', '#00BFA5', (c) => `<g transform="rotate(38 60 60)"><path d="M60,8 Q106,60 60,112 Q14,60 60,8 Z" fill="${c}"/>
    ${line([60, 26], [60, 98], 4, W)}${[46, 62, 78].map((y) => line([60, y], [44, y - 12], 3.4, W) + line([60, y], [76, y - 12], 3.4, W)).join('')}</g>`],

  // Concentric rings of cells, like something seen under a lens.
  ['Ecological Guardians', '#FF1F8F', (c) => {
    let s = disc(60, 60, 9, c);
    [[19, 8, 4.8], [31, 14, 4.4], [42, 20, 3.7], [52, 26, 2.8]].forEach(([R, n, r], k) => { for (let i = 0; i < n; i++) { const p = xy(60, 60, R, (360 / n) * i + k * 7); s += disc(p[0], p[1], r, c); } });
    return s;
  }],

  // Two neighbours; the ground they share is held apart.
  ['Cautious Neighbors', '#FFAA00', (c, id) => `<defs><clipPath id="${id}a"><circle cx="44" cy="60" r="32"/></clipPath><clipPath id="${id}b"><circle cx="44" cy="60" r="26"/></clipPath></defs>
    ${disc(44, 60, 32, c)}${disc(76, 60, 32, c)}<g clip-path="url(#${id}a)">${disc(76, 60, 32, W)}</g><g clip-path="url(#${id}b)">${disc(76, 60, 26, c)}</g>`],

  // A colonnade under a pediment.
  ['Heritage Protectors', '#FF5F00', (c) => `<path d="M10,36 L60,10 L110,36 Z" fill="${c}"/><rect x="14" y="40" width="92" height="66" fill="${c}"/>
    ${line([14, 44], [106, 44], 3, W, 'butt')}${[33, 60, 87].map((x) => `<path d="M${x - 9},106 V64 A9,9 0 0 1 ${x + 9},64 V106 Z" fill="${W}"/>`).join('')}`],

  // An open eye.
  ['Observers’ Bloc', '#9B4DFF', (c) => `<path d="M6,60 Q60,4 114,60 Q60,116 6,60 Z" fill="${c}"/>${disc(60, 60, 23, W)}${disc(60, 60, 14, c)}${disc(65.5, 54.5, 4.2, W)}`],

  // The lightest touch upon a wide boundary.
  ['Minimal-Footprint Colonists', '#00C2D1', (c) => ring(60, 60, 44, 7, c) + disc(60, 89, 10, c)],

  // Arcs nested within arcs, handed down.
  ['Intergenerational Stewards', '#FF2A1F', (c) => [[42, 52], [28, 38], [14, 24]].map(([a, b]) => `<path d="${band(60, 86, a, b, 180, 360)}" fill="${c}"/>`).join('') + `<path d="${band(60, 86, 0, 8, 180, 360)}" fill="${c}"/><rect x="6" y="90" width="108" height="7" rx="3.5" fill="${c}"/>`],

  // A slow spiral, widening only as it goes.
  ['Slow Settlers', '#FFA000', (c) => {
    let d = '';
    for (let t = 0; t <= 12.4; t += 0.08) { const r = 3 + 3.45 * t; d += `${d ? 'L' : 'M'}${f(60 + r * Math.cos(t))},${f(60 + r * Math.sin(t))}`; }
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`;
  }],
];

const holders = [
  // Eight equal shares.
  ['Equal-Share Traders', '#FF2E63', (c) => disc(60, 60, 46, c) + [0, 45, 90, 135].map((a) => line(xy(60, 60, 48, a), xy(60, 60, 48, a + 180), 4, W, 'butt')).join('') + disc(60, 60, 7, W)],

  // A circle of exchange.
  ['Open-Exchange Holders', '#0095FF', (c) => [0, 180].map((o) => `<path d="${band(60, 60, 30, 44, 200 + o, 318 + o)}" fill="${c}"/><path d="M${pt(xy(60, 60, 51, 318 + o))} L${pt(xy(60, 60, 37, 342 + o))} L${pt(xy(60, 60, 23, 318 + o))} Z" fill="${c}"/>`).join('')],

  // Lines of descent.
  ['Kin Holders', '#00C043', (c) => {
    const n1 = [60, 22], n2 = [[34, 60], [86, 60]], n3 = [[20, 98], [48, 98], [72, 98], [100, 98]];
    return line(n1, n2[0], 5, c) + line(n1, n2[1], 5, c) + line(n2[0], n3[0], 4.5, c) + line(n2[0], n3[1], 4.5, c) + line(n2[1], n3[2], 4.5, c) + line(n2[1], n3[3], 4.5, c)
      + disc(...n1, 11, c) + n2.map((p) => disc(...p, 9.5, c)).join('') + n3.map((p) => disc(...p, 8, c)).join('');
  }],

  // A cut stone.
  ['Share Speculators', '#9B4DFF', (c) => `<path d="M30,26 L90,26 L112,50 L60,108 L8,50 Z" fill="${c}"/>
    <path d="M8,50 H112 M30,26 L42,50 L60,26 L78,50 L90,26 M42,50 L60,108 L78,50" fill="none" stroke="${W}" stroke-width="3.4" stroke-linejoin="round"/>`],

  // Members joined around one circle.
  ['Community Holders', '#FFAA00', (c) => ring(60, 60, 38, 6, c) + [...Array(8)].map((_, i) => { const p = xy(60, 60, 38, i * 45 - 90); return disc(...p, 10.5, c); }).join('')],

  // A ring with its own notch: something keyed to one holder.
  ['Private Ventures', '#FF5F00', (c) => disc(60, 60, 44, c) + `<rect x="82" y="51" width="30" height="18" fill="${W}"/>` + disc(60, 60, 9, W) + `<rect x="86" y="55" width="10" height="10" fill="${c}"/>`],

  // A whole that has given a piece of itself away.
  ['Pledge Givers', '#FF1F8F', (c) => disc(52, 66, 40, c) + disc(86, 32, 21, W) + disc(98, 20, 10, c)],

  // An hourglass, part run.
  ['Waiting-Period Holders', '#00BFA5', (c) => `<rect x="22" y="10" width="76" height="9" rx="4.5" fill="${c}"/><rect x="22" y="101" width="76" height="9" rx="4.5" fill="${c}"/>
    <path d="M30,22 H90 L64,60 L90,98 H30 L56,60 Z" fill="${c}"/><path d="M36,27 H84 L72,44 H48 Z" fill="${W}"/><path d="M60,64 L60,84" stroke="${W}" stroke-width="2.4" stroke-dasharray="2 3"/>`],

  // A whole that would rather stay in two.
  ['Anti-Pooling Holders', '#00C2D1', (c) => `<path d="M52,16 A44,44 0 0 0 52,104 Z" fill="${c}"/><path d="M68,16 A44,44 0 0 1 68,104 Z" fill="${c}"/>`],

  // A kit of parts, ready to build with.
  ['Direct-Use Holders', '#FF2A1F', (c) => `<rect x="12" y="12" width="44" height="44" rx="3" fill="${c}"/><path d="M64,56 V12 A44,44 0 0 1 108,56 Z" fill="${c}"/>
    <path d="M12,64 H56 A22,22 0 0 1 12,64 Z" fill="${c}" transform="translate(0 22)"/>${disc(86, 86, 22, c)}`],
];

const builders = [
  // Arches carrying arches: works built to be shared.
  ['Public Works Builders', '#FFAA00', (c) => `<rect x="6" y="34" width="108" height="10" rx="2" fill="${c}"/><rect x="6" y="60" width="108" height="12" rx="2" fill="${c}"/>`
    + [19.5, 46.5, 73.5, 100.5].map((x) => `<path d="${band(x, 60, 7, 13.5, 180, 360)}" fill="${c}"/>`).join('')
    + [33, 87].map((x) => `<path d="${band(x, 100, 13, 27, 180, 360)}" fill="${c}"/>`).join('')],

  // A form giving off its findings.
  ['Research Funders', '#0095FF', (c) => `<path d="M60,48 L104,108 H16 Z" fill="${c}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>` + disc(60, 33, 8, c) + disc(70, 17, 5.5, c) + disc(80, 6, 3.4, c) + disc(60, 88, 9, W)],

  // A shared horizon.
  ['Shared-Sky Advocates', '#FF2E63', (c, id) => `<defs><clipPath id="${id}"><circle cx="60" cy="60" r="46"/></clipPath></defs>${disc(60, 60, 46, c)}
    <g clip-path="url(#${id})">${[[64, 2], [73, 3], [81.5, 4], [89.5, 5], [97, 6]].map(([y, w]) => line([10, y], [110, y], w, W, 'butt')).join('')}</g>`],

  // A guiding star.
  ['Moral Project Funders', '#9B4DFF', (c) => `<path d="${star4(60, 60, 54, 13)}" fill="${c}"/><path d="${star4(60, 60, 12, 4)}" fill="${W}"/>`],

  // A vault dial.
  ['Long-Term Trustees', '#00BFA5', (c) => `<rect x="12" y="12" width="96" height="96" rx="16" fill="${c}"/>${disc(60, 60, 33, W)}${disc(60, 60, 26, c)}
    ${[-90, 30, 150].map((a) => line(xy(60, 60, 7, a), xy(60, 60, 20, a), 5, W)).join('')}${disc(60, 60, 6, W)}`],

  // Seats in a hemicycle.
  ['Civic Councils', '#FF5F00', (c) => [[24, 5], [36, 7], [48, 9]].map(([R, n]) => [...Array(n)].map((_, i) => { const p = xy(60, 86, R, 180 + (180 / (n - 1)) * i); return disc(...p, 5.4, c); }).join('')).join('') + disc(60, 86, 7, c)],

  // Twelve equal regions.
  ['Regional Commons', '#00C043', (c) => [...Array(12)].map((_, i) => `<rect x="${7 + (i % 4) * 28}" y="${21 + Math.floor(i / 4) * 28}" width="22" height="22" rx="5" fill="${c}"/>`).join('')],

  // A planned network.
  ['Infrastructure Planners', '#FF1F8F', (c) => {
    const g = [24, 60, 96], n = (i, j) => [g[i], g[j]];
    const links = [[[0, 0], [1, 0]], [[1, 0], [2, 0]], [[1, 0], [1, 1]], [[0, 1], [1, 1]], [[1, 1], [2, 1]], [[2, 1], [2, 2]], [[0, 1], [0, 2]], [[0, 2], [1, 2]], [[2, 0], [2, 1]]];
    return links.map(([a, b]) => line(n(...a), n(...b), 6, c)).join('') + g.flatMap((x) => g.map((y) => disc(x, y, 9.5, c) + disc(x, y, 3.6, W))).join('');
  }],

  // Two links, each holding the other.
  ['Mutual Benefit Pools', '#00C2D1', (c) => `${ring(43, 60, 29, 9, c)}${ring(77, 60, 29, 9, c)}
    <path d="M${pt(xy(43, 60, 29, -78))} A29,29 0 0 1 ${pt(xy(43, 60, 29, -30))}" fill="none" stroke="${W}" stroke-width="16"/>
    <path d="M${pt(xy(43, 60, 29, -82))} A29,29 0 0 1 ${pt(xy(43, 60, 29, -26))}" fill="none" stroke="${c}" stroke-width="9"/>`],

  // A dome over its members.
  ['Assembly Loyalists', '#FFA000', (c) => `<path d="${band(60, 52, 0, 42, 180, 360)}" fill="${c}"/>` + [24, 42, 60, 78, 96].map((x) => `<rect x="${x - 5.5}" y="58" width="11" height="44" rx="5.5" fill="${c}"/>`).join('') + `<rect x="12" y="104" width="96" height="8" rx="4" fill="${c}"/>`],
];

const inclusionists = [
  // A sprout, not yet grown.
  ['Later-Generation Advocates', '#00C043', (c) => `${line([60, 106], [60, 58], 7, c)}<path d="${vesica([60, 66], [18, 42], 15)}" fill="${c}"/><path d="${vesica([60, 56], [102, 26], 16)}" fill="${c}"/>
    <rect x="36" y="104" width="48" height="7" rx="3.5" fill="${c}"/>`],

  // A person made of pixels.
  ['Digital Rights Advocates', '#0095FF', (c) => {
    const holes = new Set(['-2,-1', '2,-1', '-2,1', '-1,2', '0,2', '1,2', '2,1']); let s = '';
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { if (Math.hypot(i, j) > 4.3 || holes.has(`${i},${j}`)) continue; s += `<rect x="${55 + i * 12}" y="${55 + j * 12}" width="10" height="10" rx="1.5" fill="${c}"/>`; }
    return s;
  }],

  // One, and its copy.
  ['Emulation Families', '#9B4DFF', (c) => disc(45, 60, 31, c) + ring(75, 60, 28, 13, W) + ring(75, 60, 28, 6.5, c)],

  // A quiet presence, minded by someone nearby.
  ['Agent Operators', '#00BFA5', (c) => `<rect x="14" y="22" width="80" height="80" rx="26" fill="${c}"/>` + disc(40, 58, 8, W) + disc(68, 58, 8, W) + ring(102, 22, 9, 6, c)],

  // A sun only now rising.
  ['Youth Cohort', '#FFAA00', (c) => `<path d="${band(60, 88, 0, 27, 180, 360)}" fill="${c}"/>${[...Array(9)].map((_, i) => line(xy(60, 88, 35, 180 + i * 22.5), xy(60, 88, 49, 180 + i * 22.5), 6, c)).join('')}
    <rect x="8" y="94" width="104" height="7" rx="3.5" fill="${c}"/>`],

  // A voice that counts.
  ['Universal Franchise', '#FF2E63', (c) => `<rect x="10" y="14" width="100" height="74" rx="24" fill="${c}"/><path d="M30,82 L24,108 L54,86 Z" fill="${c}"/>
    <path d="M38,52 L54,67 L84,37" fill="none" stroke="${W}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`],

  // A flower: life of every kind.
  ['Sentience Advocates', '#FF1F8F', (c) => [...Array(6)].map((_, i) => { const a = i * 60 - 90; return `<path d="${vesica(xy(60, 60, 6, a), xy(60, 60, 52, a), 15)}" fill="${c}"/><path d="${vesica(xy(60, 60, 28, a), xy(60, 60, 42, a), 3.6)}" fill="${W}"/>`; }).join('') + disc(60, 60, 9, W) + disc(60, 60, 5, c)],

  // Copies fading, then a limit.
  ['Copy-Limit Reformers', '#FF5F00', (c) => disc(80, 60, 25, c, 'opacity=".2"') + disc(58, 60, 25, c, 'opacity=".5"') + disc(36, 60, 25, c) + `<rect x="106" y="30" width="7" height="60" rx="3.5" fill="${c}"/>`],

  // Three chambers forming one body.
  ['Representation Reformers', '#00C2D1', (c) => {
    const v = (a) => xy(60, 60, 50, a);
    const rh = (a) => `M60,60 L${pt(v(a))} L${pt(v(a + 60))} L${pt(v(a + 120))} Z`;
    return `<path d="${rh(-150)}" fill="${c}"/><path d="${rh(-30)}" fill="${c}" opacity=".62"/><path d="${rh(90)}" fill="${c}" opacity=".32"/>`
      + [-30, 90, 210].map((a) => line([60, 60], v(a), 3.4, W, 'butt')).join('');
  }],

  // A whole opening only a little.
  ['Cautious Inclusionists', '#FF2A1F', (c) => disc(60, 60, 46, c) + `<path d="M60,60 L${pt(xy(60, 60, 50, -32))} L${pt(xy(60, 60, 50, -14))} Z" fill="${W}"/>` + disc(60, 60, 5, W)],
];

const deferrers = [
  // A form and its reflection.
  ['Reflection First', '#0095FF', (c, id) => {
    let dots = '';
    for (let y = 70; y <= 118; y += 6) for (let x = 36; x <= 84; x += 6) { const d = Math.hypot(x - 60, y - 94); if (d > 24) continue; const r = 2.6 * (1 - (y - 70) / 56); if (r > 0.5) dots += disc(x + ((y / 6) % 2 ? 3 : 0), y, r, c); }
    return disc(60, 34, 24, c) + `<rect x="12" y="62" width="96" height="4" rx="2" fill="${c}"/>` + dots;
  }],

  // Seven in council (the Assembly's own emblem).
  ['Council Delegators', '#9B4DFF', (c) => ring(60, 60, 22, 4.5, c) + [...Array(6)].map((_, i) => { const p = xy(60, 60, 22, i * 60); return ring(...p, 22, 4.5, c); }).join('') + ring(60, 60, 44, 4.5, c)],

  // A balance, level.
  ['Moral Realists', '#00C043', (c) => `${disc(60, 22, 6, c)}<rect x="57" y="26" width="6" height="74" fill="${c}"/><rect x="36" y="100" width="48" height="8" rx="4" fill="${c}"/>
    <rect x="14" y="28" width="92" height="6" rx="3" fill="${c}"/>${[22, 98].map((x) => line([x, 34], [x - 13, 66], 2.6, c) + line([x, 34], [x + 13, 66], 2.6, c) + `<path d="M${x - 17},66 A17,17 0 0 0 ${x + 17},66 Z" fill="${c}"/>`).join('')}`],

  // Attention narrowing onto a spark.
  ['Research Patrons', '#FF5F00', (c) => ring(60, 60, 47, 4, c) + ring(60, 60, 35, 7, c) + disc(60, 60, 22, c) + `<path d="${star4(60, 60, 14, 4)}" fill="${W}"/>`],

  // A pause.
  ['Wait-and-See Centrists', '#00BFA5', (c) => disc(60, 60, 46, c) + `<rect x="42" y="36" width="12" height="48" rx="6" fill="${W}"/><rect x="66" y="36" width="12" height="48" rx="6" fill="${W}"/>`],

  // Two voices in conversation.
  ['Philosophers’ Bloc', '#FFAA00', (c) => `${disc(44, 48, 32, c)}<path d="M24,70 L14,96 L42,78 Z" fill="${c}"/>${disc(80, 74, 31, W)}${ring(80, 74, 23.5, 7, c)}<path d="M92,93 L106,110 L80,99 Z" fill="${c}"/>`],

  // Sighted, centred, checked.
  ['Verification Hawks', '#FF2E63', (c) => ring(60, 60, 38, 8, c) + [0, 90, 180, 270].map((a) => line(xy(60, 60, 24, a), xy(60, 60, 54, a), 7, c)).join('') + disc(60, 60, 9, c)],

  // Procedure laid down layer by layer.
  ['Slow Constitutionalists', '#00C2D1', (c) => [0, 1, 2, 3, 4].map((i) => `<rect x="${12 + i * 5}" y="${18 + i * 18}" width="${96 - i * 10}" height="12" rx="6" fill="${c}" opacity="${1 - i * 0.14}"/>`).join('')],

  // One heavy stroke, meeting the line.
  ['Arbiter Reliants', '#FF1F8F', (c) => `<rect x="26" y="34" width="66" height="26" rx="13" transform="rotate(-24 59 47)" fill="${c}"/><rect x="10" y="92" width="100" height="8" rx="4" fill="${c}"/>
    ${[[-150, 82], [-90, 78], [-30, 82]].map(([a]) => line(xy(64, 84, 7, a), xy(64, 84, 15, a), 4, c)).join('')}`],

  // A spread of unequal bets.
  ['Uncertainty Hedgers', '#FFA000', (c) => [[-90, 60], [60, 170], [170, 270]].map(([a1, a2]) => { const m = (a1 + a2) / 2, o = xy(0, 0, 4, m); return `<path d="${band(60 + o[0], 60 + o[1], 0, 44, a1 + 1, a2 - 1)}" fill="${c}"/>`; }).join('')],
];

const FAMILIES = [['Settlers', settlers], ['Stewards', stewards], ['Holders', holders], ['Builders', builders], ['Inclusionists', inclusionists], ['Deferrers', deferrers]];
const BY_NAME = new Map();
for (const [family, list] of FAMILIES) for (const [name, colour, draw] of list) BY_NAME.set(name, { family, colour, draw });

let uid = 0;
/** Inline SVG for a group's mark, or null. */
export function markSvg(name, { size = 28, title = true } = {}) {
  const m = BY_NAME.get(name);
  if (!m) return null;
  const id = `mk${uid++}`;
  return `<svg class="mark" viewBox="-4 -4 128 128" width="${size}" height="${size}" role="img" aria-label="${name}">${title ? `<title>${name}</title>` : ''}${m.draw(m.colour, id)}</svg>`;
}
/** Group names in each family, in order. */
export const markFamilies = FAMILIES.map(([family, list]) => ({ family, names: list.map(([name]) => name) }));
