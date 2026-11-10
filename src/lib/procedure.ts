/**
 * Legislative procedure as established by the World Bible v3.4 (§§ 6, 10–12, 14–15).
 * These functions encode — and must never alter — the published thresholds.
 */
import type { ThresholdT, ThresholdBasisT } from './data/schema.ts';

export type BillCategoryT =
  | 'release-size'
  | 'channel-split'
  | 'assembly-project'
  | 'deferral-allocation'
  | 'reserve-expenditure'
  | 'prohibition'
  | 'charter-amendment'
  | 'franchise-amendment'
  | 'council-proposal'
  | 'administrative';

/** Threshold required for final passage of each category of measure. */
export const CATEGORY_THRESHOLD: Record<BillCategoryT, ThresholdT> = {
  'release-size': 'simple-majority',
  'channel-split': 'simple-majority',
  'assembly-project': 'simple-majority',
  'deferral-allocation': 'simple-majority',
  'administrative': 'simple-majority',
  'council-proposal': 'simple-majority',
  'reserve-expenditure': 'two-thirds', // §15: Reserve spending needs a two-thirds vote
  'charter-amendment': 'two-thirds', // §10: Charter amended by two-thirds
  'franchise-amendment': 'two-thirds', // §9–10: two-thirds plus rest-of-world Council consent
  'prohibition': 'ninety-percent', // §10: adding or repealing a ban requires 90% of seats voting
};

/** Bases the Bible permits for each threshold/category. */
export function allowedBases(threshold: ThresholdT, category: BillCategoryT | null): ThresholdBasisT[] {
  if (threshold === 'simple-majority') return ['seats-voting']; // §12: simple majority of seats voting, excluding abstentions
  if (threshold === 'ninety-percent') return ['seats-voting']; // §10: 90% of seats voting
  // Two-thirds: the Bible says "two-thirds of the Assembly" for Charter amendments and
  // "two-thirds Assembly vote" for overrides without fixing the base. Moderators record the
  // basis applied on each division; both are accepted and displayed explicitly.
  if (category === 'charter-amendment' || category === 'franchise-amendment') return ['seats-voting', 'total-seats'];
  return ['seats-voting', 'total-seats'];
}

/** Minimum affirmative seats required for a division to carry. */
export function requiredYes(threshold: ThresholdT, basis: ThresholdBasisT, seatsVoting: number, totalSeats: number): number {
  const base = basis === 'seats-voting' ? seatsVoting : totalSeats;
  if (base === 0) return 1;
  switch (threshold) {
    case 'simple-majority':
      return Math.floor(base / 2) + 1;
    case 'two-thirds':
      return Math.ceil((base * 2) / 3);
    case 'ninety-percent':
      return Math.ceil(base * 0.9);
  }
}

export const THRESHOLD_LABEL: Record<ThresholdT, string> = {
  'simple-majority': 'Simple majority',
  'two-thirds': 'Two-thirds',
  'ninety-percent': 'Ninety per cent',
};

export const BASIS_LABEL: Record<ThresholdBasisT, string> = {
  'seats-voting': 'of seats voting (abstentions excluded)',
  'total-seats': 'of all Assembly seats',
};

export const THRESHOLD_FRACTION: Record<ThresholdT, number> = {
  'simple-majority': 0.5,
  'two-thirds': 2 / 3,
  'ninety-percent': 0.9,
};

/** Release rules (§14). */
export const RELEASE_MIN = 0.05;
export const RELEASE_MAX = 0.25;
export const RELEASE_DEFAULT = 0.1;
/** Default channel division when no split passes (§15): one-third each to Endowment, Assembly, Reserve. */
export const DEFAULT_SPLIT = { endowment: 1 / 3, assembly: 1 / 3, deferral: 0, reserve: 1 / 3 };

export const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function releaseOf(startingPool: number, fraction: number) {
  const released = round4(startingPool * fraction);
  return { released, closing: round4(startingPool - released) };
}

export const WEEKS = [
  { week: 1, name: 'Formation', phase: 'formation', detail: 'Election results; seating of the Assembly; Speaker election and Bureau formation; nominations for Commissioner and Commission on Long-Term Inquiry.' },
  { week: 2, name: 'Deliberation', phase: 'deliberation', detail: 'Filing and debate of bills and proposed prohibitions; caucus bargaining; public briefs and petitions; the Arbiter accepts eligible queries.' },
  { week: 3, name: 'Voting', phase: 'voting', detail: 'Floor votes open for 72 hours with totals sealed. The Council then has a 48-hour window to delay or exercise a protected veto.' },
  { week: 4, name: 'Settlement', phase: 'settlement', detail: 'First 48 hours for delay overrides; resource and goal accounting; simulated events, public scorecard and polling; next election campaign begins.' },
] as const;
