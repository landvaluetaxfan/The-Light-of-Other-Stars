# Public Data Publishing Contract

**Contract version 1.0.0** · Applies to every record published by the World Assembly Information Service.

This contract defines what an external simulation engine (the "World Engine", or any moderator tool) may write into `data/` so that the website can publish it. It exists to keep two promises:

1. **Every public record is valid, consistent and permanent.** The build fails rather than publish a broken record.
2. **Private simulation state never reaches the public site.** Hidden voter preferences, electorate weights, moderator briefs, confidential Council briefs, private player objectives, running vote tallies and unreleased world events are never written to `data/`.

The machine-readable form of this contract is the set of Zod schemas in `src/lib/data/schema.ts`. JSON Schemas generated from them are written to `schemas/` by `npm run schemas` and published at `/data/schema/<collection>.json`.

---

## 1. The publishing boundary

```
 ┌──────────────── PRIVATE (never in this repository) ────────────────┐
 │ voter-group weights · loyalty · salience · random draws            │
 │ moderator briefs · confidential Council briefs · private goals     │
 │ sealed running tallies · unreleased world events · drafts          │
 └───────────────────────────────┬────────────────────────────────────┘
                                 │  engine exports ONLY public records
                                 ▼
          data/canonical/…   (validated: npm run validate)
                                 │
                                 ▼
                       static site + JSON exports
```

The engine is responsible for deciding *when* a record becomes public. The site enforces *what* a public record may contain:

| Safeguard | How it is enforced |
| --- | --- |
| Unknown fields rejected | All schemas are strict; any undeclared property fails validation. |
| Reserved private keys rejected | Keys such as `private`, `hidden`, `secret`, `moderatorBrief`, `brief`, `goals`, `objectives`, `preferences`, `weights`, `coefficients`, `loyalty`, `salience`, `runningTally`, `unpublished`, `internalNotes`, `draft` fail validation at any depth (`FORBIDDEN_KEYS`). |
| Explicit visibility | Every record must declare `"visibility": "public"`. |
| Sealed tallies | A division whose `status` is `open` or `scheduled` may not carry `ballots` or `result`. |
| No premature events | A canonical bulletin dated after `meta.simulatedDate` fails validation. |
| Certified results only | An election may carry `results` only when `status` is `certified`. |

## 2. Datasets

| Directory | Dataset | Rules |
| --- | --- | --- |
| `data/canonical/` | `canonical` | The authoritative public record. May not reference demonstration records. IDs may not start with `DEMO-`. Contains the only `meta.json`. |
| `data/demo/` | `demonstration` | Illustrative test records. Every ID **must** start with `DEMO-`. Shown with a hatched demonstration band and excluded from all official totals. May reference canonical records. |

To publish a site with no demonstration content, delete `data/demo/` (and the demonstration publication assets in `public/press/`). Nothing else depends on it.

## 3. File layout

Each collection may be supplied as a single array file, as one file per record, or both:

```
data/canonical/meta.json                 single object (simulation state)
data/canonical/<collection>.json         array of records
data/canonical/<collection>/<ID>.json    one record per file (recommended for bills, divisions, documents)
```

Collections: `terms`, `regions`, `parties`, `members`, `blocs`, `compositions`, `institutions`, `offices`, `bills`, `divisions`, `events`, `elections`, `releases`, `allocations`, `documents`, `publications`, `articles`.

Any other file or directory in a dataset folder fails validation.

## 4. Identifiers and permanent URLs

* IDs are upper-case words joined by hyphens: `^(DEMO-)?[A-Z][A-Z0-9]*(-[A-Z0-9]+)*$`.
* IDs are global: no two records (including nested amendments, Council actions and rulings) may share one.
* IDs are permanent. **Never reuse or rename an ID.** To correct a record, edit its fields; to supersede it, publish a new record and reference the old one.

Conventions used so far (recommended, not enforced beyond the pattern):

| Record | Pattern | Example | Permanent URL |
| --- | --- | --- | --- |
| Term | `T<n>` | `T1` | `/archive/T1/` |
| Party | `PTY-<NAME>` | `PTY-COLLECTIVISTS` | `/assembly/parties/PTY-COLLECTIVISTS/` |
| Member | `M-<HANDLE>` | `M-EXAMPLE` | `/assembly/members/M-EXAMPLE/` |
| Bloc | `BL-T<n>-<nn>` | `BL-T1-01` | member page `#BL-T1-01` |
| Institution | `INST-<NAME>` | `INST-COUNCIL` | `/registry/institutions/INST-COUNCIL/` |
| Office | `OFF-<NAME>` | `OFF-CTP-ROW` | institution page `#OFF-CTP-ROW` |
| Bill | `B-T<n>-<nnn>` | `B-T1-004` | `/legislation/B-T1-004/` |
| Amendment | `<bill>-A<n>` | `B-T1-004-A1` | bill page `#B-T1-004-A1` |
| Council action | `<bill>-CA<n>` | `B-T1-004-CA1` | bill page `#…` |
| Ruling | `<bill>-R<n>` | `B-T1-004-R1` | bill page `#…` |
| Division | `D-T<n>-<nnn>` | `D-T1-001` | `/divisions/D-T1-001/` |
| Bulletin | `NT-…`, `EV-…`, `HR-…` | `NT-T1-002` | `/bulletins/NT-T1-002/` |
| Election | `EL-T<n>-<KIND>` | `EL-T2-GENERAL` | `/registry/elections/EL-T2-GENERAL/` |
| Release | `REL-T<n>` | `REL-T1` | `/registry/ledger/#REL-T1` |
| Allocation | `AL-T<n>-<nn>` | `AL-T1-01` | `/registry/ledger/#AL-T1-01` |
| Document | `DOC-<NAME>` | `DOC-CHARTER` | `/registry/documents/DOC-CHARTER/` |
| Publication | `PUB-<NAME>` + `slug` | `PUB-EXAMPLE` | `/press/<slug>/` |
| Article | `ART-…` + `slug` | — | `/press/<pub-slug>/<slug>/` |

## 5. Dates

* `simDate` — in-world date: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.
* `realDate` — real-world deadline or publication time, ISO 8601 UTC (`2026-12-18T18:00Z`), or `null`.
* The World Bible requires every action to carry both a real deadline and a simulated effective date; supply `realDate` whenever it is known.

## 6. Rich text

Body paragraphs, summaries and document sections accept a deliberately small syntax:

* `[[ID]]` or `[[ID|label]]` — link to any record; validated to exist (and, in canonical text, to be canonical).
* `*emphasis*`, `**strong**`.
* A paragraph starting with `## ` is a sub-heading; `> ` is a quotation.

All other text is escaped. HTML is never interpreted.

## 7. Cross-record rules enforced at build time

**Composition and seats**
* A composition's constituency seats equal the term's `constituencySeats` (300); total seats equal `assemblySize` (600 plus any overhang).
* Blocs hold 1–60 seats; no member may hold or control more than 60 seats in a term (Bible §12).
* Where blocs exist, each party's blocs sum exactly to its allocated seats.

**Measures**
* `threshold` must match the category: simple majority for ordinary measures and release allocations; two-thirds for Charter and franchise amendments and Reserve expenditure; ninety per cent for prohibitions.
* Release-size measures state `releaseFraction` (0.05–0.25) and must be sponsored by the holder of a bloc with at least one-tenth of the Assembly.
* Channel splits state percentages that total 100.
* Assembly projects state units, channel, reach, implementing actor, beneficiaries, duration and conditions (Bible §16).
* A Council delay requires at least four seats.
* Status must be consistent with divisions (e.g. `enacted` requires a carried passage division; `voting` requires an open one).

**Divisions**
* Closed divisions list every seated bloc exactly once, with the bloc's seat weight.
* `yes`, `no`, `abstain` must equal the ballot sums; `seatsVoting = yes + no`; `yes + no + abstain = totalSeats`.
* `required` must equal the threshold applied to the stated basis; `outcome` must follow from the tally:
  * simple majority: `floor(base / 2) + 1`
  * two-thirds: `ceil(2 × base / 3)`
  * ninety per cent: `ceil(0.9 × base)`
  * where `base` is `seatsVoting` (abstentions excluded) or, where the Bible permits, `totalSeats`.
* Simple-majority and ninety-per-cent votes must use `seats-voting`. Override divisions are two-thirds.
* A bloc that did not vote is recorded `castBy: "not-cast"` and `vote: "abstain"`. Proxy ballots name a proxy from the same party.

**Ledger**
* The first release starts at 100 units; each later release starts at the previous closing pool.
* `releasedUnits = startingPool × fraction` and `closingPool = startingPool − releasedUnits` (4 d.p.).
* Channel amounts sum to the release. A default size is 10%; a default split is one-third each to Endowment, Assembly and Reserve, nothing to Deferral. A voted split must match its bill's percentages.
* Allocations may not exceed their channel, and advance only `allocated → committed → reached → used`.

## 8. Publishing workflow for an engine

1. Compute the new public state privately.
2. Write or update records in `data/canonical/` (one file per bill/division recommended).
3. Advance `meta.json` (`simulatedDate`, `currentWeek`, `phase`, `updatedAt`).
4. Run `npm run validate`. Fix every error; never bypass it.
5. Commit and push to `main`. GitHub Actions validates, tests, builds, checks links and deploys.

### Publishing a closed vote

When a 72-hour window closes, change the division from

```json
{ "status": "open", "ballots": [], "result": null }
```

to `"status": "closed"` with the full `ballots` array and `result`. Do not publish partial ballots at any earlier point.

## 9. Versioning

The contract follows semantic versioning (`CONTRACT_VERSION` in `src/lib/data/schema.ts`, mirrored in `meta.contractVersion`). Adding optional fields is a minor change; removing or renaming fields, or tightening a rule that existing data could fail, is a major change and must be recorded here.
