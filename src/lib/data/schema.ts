/**
 * Public data contract — record schemas.
 *
 * Every record published by the World Assembly Information Service is
 * validated against these schemas at build time. Schemas are *strict*: any
 * property not declared here is rejected, which keeps private simulation data
 * (voter weights, moderator briefs, private objectives…) from leaking into the
 * public site by accident.
 *
 * Contract version: see CONTRACT_VERSION. Changes that remove or rename fields
 * require a major version bump and an entry in docs/PUBLIC_DATA_CONTRACT.md.
 */
import { z } from 'zod';

export const CONTRACT_VERSION = '1.0.0';

/* ------------------------------------------------------------------ */
/* Primitive types                                                     */
/* ------------------------------------------------------------------ */

/** Stable record identifier. Demonstration records MUST start with `DEMO-`. */
export const Id = z
  .string()
  .regex(/^(DEMO-)?[A-Z][A-Z0-9]*(-[A-Z0-9]+)*$/, 'IDs are upper-case words joined by hyphens, e.g. B-T1-004');

/** Simulated (in-world) date: YYYY, YYYY-MM or YYYY-MM-DD. */
export const SimDate = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/, 'Simulated dates use YYYY, YYYY-MM or YYYY-MM-DD');

/** Real-world timestamp (ISO 8601) — the player-facing deadline. */
export const RealDate = z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?Z)?$/, 'Real dates use ISO 8601 (UTC)');

export const Hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colours are six-digit hex values');
export const Week = z.number().int().min(1).max(4);
export const Units = z.number().min(0).max(100);
export const Text = z.string().min(1);
export const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/** Every top-level record must declare itself public. */
export const Visibility = z.literal('public');

export const Threshold = z.enum(['simple-majority', 'two-thirds', 'ninety-percent']);
export const ThresholdBasis = z.enum(['seats-voting', 'total-seats']);
export const Channel = z.enum(['endowment', 'assembly', 'deferral', 'reserve']);
export const Reach = z.enum(['near', 'far', 'mixed', 'not-applicable']);

export const ChannelAmounts = z.strictObject({
  endowment: z.number().min(0),
  assembly: z.number().min(0),
  deferral: z.number().min(0),
  reserve: z.number().min(0),
});

export const Refs = z.strictObject({
  bills: z.array(Id).default([]),
  divisions: z.array(Id).default([]),
  institutions: z.array(Id).default([]),
  events: z.array(Id).default([]),
  elections: z.array(Id).default([]),
  documents: z.array(Id).default([]),
  parties: z.array(Id).default([]),
});
export const emptyRefs = () => Refs.parse({});

const base = { id: Id, visibility: Visibility };

/* ------------------------------------------------------------------ */
/* Simulation state                                                    */
/* ------------------------------------------------------------------ */

export const Phase = z.enum(['formation', 'deliberation', 'voting', 'settlement', 'interregnum']);

export const Meta = z.strictObject({
  visibility: Visibility,
  contractVersion: z.string(),
  updatedAt: RealDate,
  simulatedDate: SimDate,
  currentTermId: Id,
  currentWeek: Week,
  phase: Phase,
  pool: z.strictObject({ initialUnits: z.literal(100) }),
  statusNote: Text,
});

export const Term = z.strictObject({
  ...base,
  number: z.number().int().min(1),
  name: Text,
  simStart: SimDate,
  simEnd: SimDate,
  realStart: RealDate.nullable(),
  realEnd: RealDate.nullable(),
  status: z.enum(['scheduled', 'current', 'concluded']),
  assemblySize: z.number().int().min(600),
  constituencySeats: z.literal(300),
  listSeats: z.number().int().min(300),
  partyVariant: z.enum(['six-party', 'four-party']).nullable(),
  notes: z.array(Text).default([]),
});

export const Region = z.strictObject({
  ...base,
  number: z.number().int().min(1).max(12),
  name: Text,
  population2040Billions: z.number().positive(),
  constituencySeats: z.number().int().positive(),
});

/* ------------------------------------------------------------------ */
/* Parties, members, blocs, composition                                */
/* ------------------------------------------------------------------ */

export const Party = z.strictObject({
  ...base,
  name: Text,
  abbreviation: z.string().regex(/^[A-Z]{2,5}$/),
  labelStatus: z.enum(['provisional', 'adopted']),
  status: z.enum(['founding', 'active', 'dissolved']),
  founding: z.boolean(),
  color: Hex,
  inkColor: Hex,
  seatingOrder: z.number().int(),
  corePosition: Text,
  internalDivision: Text,
  fourPartyVariant: z.strictObject({ mergedIntoId: Id.nullable(), note: Text }),
  summary: Text,
});

export const Member = z.strictObject({
  ...base,
  displayName: Text,
  partyId: Id.nullable(),
  sinceTermId: Id,
  roles: z.array(Text).default([]),
  publicProfile: z.string().default(''),
});

export const Bloc = z.strictObject({
  ...base,
  termId: Id,
  partyId: Id,
  holderId: Id,
  controllerId: Id.nullable().default(null),
  controlNote: z.string().default(''),
  seats: z.number().int().min(1).max(60),
  status: z.enum(['active', 'inactive', 'transferred']),
});

export const Composition = z.strictObject({
  ...base,
  termId: Id,
  source: z.enum(['founding-assignment', 'election']),
  electionId: Id.nullable(),
  asOf: SimDate,
  allocations: z
    .array(
      z.strictObject({
        partyId: Id,
        constituencySeats: z.number().int().min(0),
        listSeats: z.number().int().min(0),
      }),
    )
    .min(1),
});

/* ------------------------------------------------------------------ */
/* Institutions and offices                                            */
/* ------------------------------------------------------------------ */

export const Institution = z.strictObject({
  ...base,
  name: Text,
  shortName: Text,
  kind: z.enum(['legislature', 'council', 'judicial', 'office', 'commission', 'advisory', 'bureau', 'public-sphere']),
  seats: z.number().int().positive().nullable(),
  parentId: Id.nullable(),
  summary: Text,
  composition: Text,
  selection: Text,
  powers: z.array(Text).min(1),
  limits: z.array(Text).default([]),
  sourceRef: Text,
});

export const Office = z.strictObject({
  ...base,
  institutionId: Id,
  title: Text,
  selection: Text,
  tenure: Text,
  relinquishesBloc: z.boolean(),
  publicStance: z.string().default(''),
  holders: z.array(
    z.strictObject({
      termId: Id,
      memberId: Id.nullable(),
      status: z.enum(['vacant', 'pending', 'serving', 'concluded']),
      from: SimDate.nullable(),
      to: SimDate.nullable(),
      note: z.string().default(''),
    }),
  ),
});

/* ------------------------------------------------------------------ */
/* Legislation                                                         */
/* ------------------------------------------------------------------ */

export const BillCategory = z.enum([
  'release-size',
  'channel-split',
  'assembly-project',
  'deferral-allocation',
  'reserve-expenditure',
  'prohibition',
  'charter-amendment',
  'franchise-amendment',
  'council-proposal',
  'administrative',
]);

export const BillStatus = z.enum([
  'filed',
  'scheduled',
  'voting',
  'passed',
  'not-passed',
  'delayed',
  'vetoed',
  'override-carried',
  'override-failed',
  'enacted',
  'voided',
  'withdrawn',
]);

export const Bill = z.strictObject({
  ...base,
  termId: Id,
  number: z.number().int().min(1),
  title: Text,
  shortTitle: Text,
  category: BillCategory,
  threshold: Threshold,
  sponsorIds: z.array(Id).min(1),
  cosponsorIds: z.array(Id).default([]),
  filed: z.strictObject({ week: Week, simDate: SimDate, realDate: RealDate.nullable() }),
  status: BillStatus,
  summary: Text,
  provisions: z.array(z.strictObject({ number: Text, heading: z.string().default(''), text: Text })).min(1),
  resource: z
    .strictObject({
      releaseFraction: z.number().min(0.05).max(0.25).optional(),
      channelSplitPercent: ChannelAmounts.optional(),
      units: Units.optional(),
      channel: Channel.optional(),
      reach: Reach.optional(),
      implementingActor: z.string().optional(),
      beneficiaries: z.string().optional(),
      duration: z.string().optional(),
      conditions: z.array(Text).optional(),
    })
    .nullable(),
  amendments: z
    .array(
      z.strictObject({
        id: Id,
        number: z.number().int().min(1),
        sponsorIds: z.array(Id).min(1),
        summary: Text,
        text: Text,
        status: z.enum(['proposed', 'adopted', 'rejected', 'withdrawn']),
        divisionId: Id.nullable(),
      }),
    )
    .default([]),
  history: z
    .array(
      z.strictObject({
        simDate: SimDate,
        week: Week.nullable(),
        realDate: RealDate.nullable(),
        action: Text,
        refId: Id.nullable().default(null),
      }),
    )
    .min(1),
  councilActions: z
    .array(
      z.strictObject({
        id: Id,
        kind: z.enum(['delay', 'veto', 'statement', 'no-action']),
        officeIds: z.array(Id),
        simDate: SimDate,
        week: Week,
        basis: Text,
        text: Text,
      }),
    )
    .default([]),
  rulings: z
    .array(
      z.strictObject({
        id: Id,
        institutionId: Id,
        simDate: SimDate,
        question: Text,
        holding: Text,
      }),
    )
    .default([]),
  divisionIds: z.array(Id).default([]),
  outcome: z.strictObject({ summary: Text, allocationIds: z.array(Id).default([]) }).nullable(),
  refs: Refs.default(emptyRefs),
  tags: z.array(Slug).default([]),
});

/* ------------------------------------------------------------------ */
/* Divisions (roll-call votes)                                         */
/* ------------------------------------------------------------------ */

export const Ballot = z.strictObject({
  blocId: Id,
  seats: z.number().int().min(1).max(60),
  vote: z.enum(['yes', 'no', 'abstain']),
  castBy: z.enum(['holder', 'controller', 'proxy', 'not-cast']),
  proxyMemberId: Id.nullable().default(null),
});

export const Division = z.strictObject({
  ...base,
  termId: Id,
  billId: Id,
  amendmentId: Id.nullable().default(null),
  stage: z.enum(['amendment', 'passage', 'override']),
  question: Text,
  threshold: Threshold,
  basis: ThresholdBasis,
  opens: z.strictObject({ week: Week, simDate: SimDate, realDate: RealDate.nullable() }),
  closes: z.strictObject({ week: Week, simDate: SimDate, realDate: RealDate.nullable() }),
  status: z.enum(['scheduled', 'open', 'closed']),
  ballots: z.array(Ballot).default([]),
  result: z
    .strictObject({
      yes: z.number().int().min(0),
      no: z.number().int().min(0),
      abstain: z.number().int().min(0),
      seatsVoting: z.number().int().min(0),
      totalSeats: z.number().int().min(600),
      required: z.number().int().min(0),
      outcome: z.enum(['carried', 'not-carried']),
    })
    .nullable()
    .default(null),
});

/* ------------------------------------------------------------------ */
/* Bulletins, elections, ledger, documents                             */
/* ------------------------------------------------------------------ */

export const EventKind = z.enum([
  'world-event',
  'official-notice',
  'election-bulletin',
  'research-report',
  'announcement',
  'council-statement',
  'legal-ruling',
  'historical-record',
]);

/** Rich text paragraph. Supports [[RECORD-ID]] / [[RECORD-ID|label]] links and *emphasis*. */
export const Paragraph = Text;

export const Event = z.strictObject({
  ...base,
  kind: EventKind,
  title: Text,
  simDate: SimDate,
  realDate: RealDate.nullable(),
  termId: Id.nullable(),
  week: Week.nullable(),
  issuerId: Id.nullable(),
  issuerLabel: z.string().default(''),
  summary: Text,
  body: z.array(Paragraph).min(1),
  refs: Refs.default(emptyRefs),
  sourceRef: z.string().default(''),
});

export const Election = z.strictObject({
  ...base,
  termId: Id,
  kind: z.enum(['founding-assignment', 'general', 'by-election']),
  simDate: SimDate,
  status: z.enum(['scheduled', 'pending', 'certified']),
  summary: Text,
  method: Text,
  compositionId: Id.nullable(),
  results: z
    .strictObject({
      turnoutPercent: z.number().min(0).max(100).nullable(),
      parties: z.array(
        z.strictObject({
          partyId: Id,
          voteSharePercent: z.number().min(0).max(100).nullable(),
          constituencySeats: z.number().int().min(0),
          listSeats: z.number().int().min(0),
        }),
      ),
    })
    .nullable(),
  notes: z.array(Text).default([]),
});

export const Release = z.strictObject({
  ...base,
  termId: Id,
  status: z.enum(['pending', 'authorized']),
  startingPool: Units,
  fraction: z.number().min(0.05).max(0.25).nullable(),
  releasedUnits: Units.nullable(),
  closingPool: Units.nullable(),
  sizeDecision: z.enum(['voted', 'default']).nullable(),
  sizeBillId: Id.nullable(),
  splitDecision: z.enum(['voted', 'default']).nullable(),
  splitBillId: Id.nullable(),
  channels: ChannelAmounts.nullable(),
  notes: z.array(Text).default([]),
});

export const Stage = z.enum(['allocated', 'committed', 'reached', 'used']);

export const Allocation = z.strictObject({
  ...base,
  releaseId: Id,
  channel: Channel,
  title: Text,
  units: Units,
  billId: Id.nullable(),
  reach: Reach,
  steward: Text,
  stage: Stage,
  stageHistory: z.array(z.strictObject({ stage: Stage, simDate: SimDate })).min(1),
  description: Text,
});

export const Document = z.strictObject({
  ...base,
  kind: z.enum(['treaty', 'charter', 'rules', 'reference', 'guide']),
  title: Text,
  shortTitle: Text,
  edition: Text,
  issuedBy: Text,
  sourceRef: Text,
  summary: Text,
  sections: z
    .array(
      z.strictObject({
        id: Slug,
        number: z.string().default(''),
        heading: Text,
        paragraphs: z.array(Paragraph).default([]),
        list: z.array(Paragraph).default([]),
        ordered: z.boolean().default(false),
        table: z
          .strictObject({ caption: z.string().default(''), columns: z.array(Text).min(1), rows: z.array(z.array(z.string())) })
          .nullable()
          .default(null),
      }),
    )
    .min(1),
});

/* ------------------------------------------------------------------ */
/* Press                                                               */
/* ------------------------------------------------------------------ */

export const DisplayFont = z.enum(['playfair', 'archivo', 'fraunces', 'plex-sans', 'source-serif']);

export const Publication = z.strictObject({
  ...base,
  slug: Slug,
  name: Text,
  kind: z.enum(['newspaper', 'magazine', 'newsletter', 'broadcaster']),
  status: z.enum(['demonstration', 'active', 'ceased']),
  ownerLabel: Text,
  ownerMemberId: Id.nullable(),
  editorLabel: Text,
  founded: SimDate,
  tagline: Text,
  description: Text,
  editorialStance: Text,
  affiliation: z.enum(['independent', 'party-affiliated']),
  affiliatedPartyId: Id.nullable(),
  brand: z.strictObject({
    theme: z.enum(['broadsheet', 'broadcast', 'editorial']),
    logo: z.string().regex(/^press\/[a-z0-9-]+\/[a-z0-9-]+\.svg$/),
    displayFont: DisplayFont,
    bodyFont: DisplayFont,
    colors: z.strictObject({ paper: Hex, ink: Hex, accent: Hex, rule: Hex }),
  }),
  sections: z.array(Text).min(1),
});

export const Article = z.strictObject({
  ...base,
  publicationId: Id,
  slug: Slug,
  headline: Text,
  dek: Text,
  byline: z.array(Text).min(1),
  simDate: SimDate,
  section: Text,
  kind: z.enum(['report', 'analysis', 'opinion', 'interview', 'bulletin']),
  illustration: z
    .strictObject({ src: z.string().regex(/^press\/[a-z0-9-]+\/[a-z0-9-]+\.svg$/), alt: Text, caption: z.string().default(''), credit: Text })
    .nullable(),
  body: z.array(Paragraph).min(1),
  refs: Refs.default(emptyRefs),
});

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export const collections = {
  terms: Term,
  regions: Region,
  parties: Party,
  members: Member,
  blocs: Bloc,
  compositions: Composition,
  institutions: Institution,
  offices: Office,
  bills: Bill,
  divisions: Division,
  events: Event,
  elections: Election,
  releases: Release,
  allocations: Allocation,
  documents: Document,
  publications: Publication,
  articles: Article,
} as const;

export type CollectionName = keyof typeof collections;
export const collectionNames = Object.keys(collections) as CollectionName[];

export type Dataset = 'canonical' | 'demonstration';
type WithDataset<T> = T & { dataset: Dataset };

export type MetaT = z.infer<typeof Meta>;
export type TermT = WithDataset<z.infer<typeof Term>>;
export type RegionT = WithDataset<z.infer<typeof Region>>;
export type PartyT = WithDataset<z.infer<typeof Party>>;
export type MemberT = WithDataset<z.infer<typeof Member>>;
export type BlocT = WithDataset<z.infer<typeof Bloc>>;
export type CompositionT = WithDataset<z.infer<typeof Composition>>;
export type InstitutionT = WithDataset<z.infer<typeof Institution>>;
export type OfficeT = WithDataset<z.infer<typeof Office>>;
export type BillT = WithDataset<z.infer<typeof Bill>>;
export type DivisionT = WithDataset<z.infer<typeof Division>>;
export type BallotT = z.infer<typeof Ballot>;
export type EventT = WithDataset<z.infer<typeof Event>>;
export type ElectionT = WithDataset<z.infer<typeof Election>>;
export type ReleaseT = WithDataset<z.infer<typeof Release>>;
export type AllocationT = WithDataset<z.infer<typeof Allocation>>;
export type DocumentT = WithDataset<z.infer<typeof Document>>;
export type PublicationT = WithDataset<z.infer<typeof Publication>>;
export type ArticleT = WithDataset<z.infer<typeof Article>>;
export type RefsT = z.infer<typeof Refs>;
export type ThresholdT = z.infer<typeof Threshold>;
export type ThresholdBasisT = z.infer<typeof ThresholdBasis>;

export interface Store {
  meta: MetaT;
  terms: TermT[];
  regions: RegionT[];
  parties: PartyT[];
  members: MemberT[];
  blocs: BlocT[];
  compositions: CompositionT[];
  institutions: InstitutionT[];
  offices: OfficeT[];
  bills: BillT[];
  divisions: DivisionT[];
  events: EventT[];
  elections: ElectionT[];
  releases: ReleaseT[];
  allocations: AllocationT[];
  documents: DocumentT[];
  publications: PublicationT[];
  articles: ArticleT[];
}

/**
 * Keys that must never appear anywhere in public data, at any depth.
 * They correspond to private simulation state described in the World Bible
 * (hidden voter preferences, moderator briefs, private goals, sealed tallies).
 */
export const FORBIDDEN_KEYS = [
  'private',
  'hidden',
  'secret',
  'moderator',
  'moderatorBrief',
  'moderatorNotes',
  'confidentialBrief',
  'brief',
  'objectives',
  'privateGoals',
  'goals',
  'voterPreferences',
  'preferences',
  'weights',
  'groupWeights',
  'coefficients',
  'loyalty',
  'salience',
  'turnoutModel',
  'randomSeed',
  'runningTally',
  'unpublished',
  'internalNotes',
  'draft',
];
