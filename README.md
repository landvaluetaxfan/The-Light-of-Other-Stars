# The Light of Other Stars — World Assembly Information Service

The public information and parliamentary records portal of the **World Assembly for Extrasolar Resources**, for *The Light of Other Stars*, a persistent player-driven political simulation set in 2040 and beyond.

The site is a static [Astro](https://astro.build) build generated from validated JSON records, and is deployed to GitHub Pages by GitHub Actions. It has no backend, no authentication and no voting system: it **publishes** the outcomes of the simulation; it never conducts them.

The World Bible v3.4 and the Policy and Legislative Ideas Guide are authoritative for names, procedures and history. Where the record does not yet exist (the composition of the first Assembly, officeholders, filed bills), the site shows a deliberate empty state rather than inventing one.

---

## Sections

| Section | Path | Contents |
| --- | --- | --- |
| Overview | `/` | Simulated date, term and week, latest bulletins, pending legislation, composition, officeholders, resource pool |
| Assembly | `/assembly/` | 600-seat hemicycle with tabular alternative, party composition, bloc register, officeholders, treaty institutions; party and member records |
| Legislation | `/legislation/` | Filterable bill register; permanent bill records with full text, amendments, divisions, Council and legal actions, history and ledger outcome; drafting guide |
| Divisions | `/divisions/` | Roll calls: every bloc's vote, seat weight, proxies, abstentions, threshold and result; sealed-tally display while voting is open |
| Bulletins | `/bulletins/` | Chronological world events, notices, election bulletins, rulings, research reports, historical records |
| Registry | `/registry/` | Treaty summary, Interim Charter, rules, reference documents, institutions, election history, resource ledger (with release calculator), identifier index |
| Press | `/press/` | Directory of player publications, each with its own masthead, typography and colours |
| Archive | `/archive/` | Term-by-term archive |
| Search | `/search/` | Client-side full-text search over every record |

Machine-readable exports: `/data/canonical.json`, `/data/demonstration.json`, `/data/schema/<collection>.json`, `/search-index.json`.

## Development

Requires Node.js 22.18 or later (Node 24 recommended). TypeScript scripts run with Node's built-in type stripping; there is no separate compile step.

```bash
npm install
npm run dev          # http://localhost:4321/The-Light-of-Other-Stars/
npm run validate     # validate every record in data/
npm test             # validator, threshold and seat-layout tests
npm run check        # Astro + TypeScript type check
npm run build        # validate → build → link check (dist/)
npm run preview      # serve dist/
npm run schemas      # regenerate JSON Schemas in schemas/
```

The build fails if any record is invalid or any internal link or `#fragment` is broken.

To deploy somewhere other than `https://landvaluetaxfan.github.io/The-Light-of-Other-Stars/`, set `SITE_URL` and `BASE_PATH` when building (the link checker reads `BASE_PATH` too).

## Project structure

```
data/
  canonical/            the authoritative public record (meta.json lives here)
  demo/                 demonstration records — every ID starts DEMO-
docs/PUBLIC_DATA_CONTRACT.md   publishing contract for external engines
schemas/                generated JSON Schemas (npm run schemas)
public/press/           publication logos and illustrations (original SVG)
scripts/                validate-data.ts, check-links.ts, export-schemas.ts
src/
  lib/data/schema.ts    record schemas (Zod) — the source of truth for the contract
  lib/data/load.ts      loader + private-data guard
  lib/data/validate.ts  cross-record validation (references, seats, votes, ledger)
  lib/procedure.ts      thresholds and release rules from the World Bible
  lib/hemicycle.ts      parliament seat layout
  lib/site.ts           permanent-URL resolver, formatters, labels
  lib/richtext.ts       safe [[ID]] links and minimal formatting
  components/           reusable Astro components
  layouts/              BaseLayout (portal) and PressLayout (publications)
  pages/                routes
  styles/               global.css (portal design system), press.css
tests/                  node:test suites
```

## Maintaining the data

All public content lives in `data/`. Read **[docs/PUBLIC_DATA_CONTRACT.md](docs/PUBLIC_DATA_CONTRACT.md)** before editing; it documents every rule the validator enforces.

### Canonical and demonstration records

* `data/canonical/` is the record of the simulation. Canonical records may not use the `DEMO-` prefix or link to demonstration records.
* `data/demo/` holds one worked example of each record type, to exercise the site and to serve as templates (for people or for an AI assistant) when writing real records: a hypothetical six-party composition with its blocs, one bill with an amendment, Council delay, Arbiter ruling and override (three divisions), one bulletin, one default-rule release with one allocation, one office holder, and one publication with one article. They are shown with a hatched **Demonstration** band, carry `DEMO-` IDs, and are excluded from every official figure.
* To retire the demonstration set, delete `data/demo/` and `public/press/geneva-ledger/`, then rebuild.

### Never publish private data

Hidden voter preferences, electorate weights, moderator briefs, confidential Council briefs, private player objectives, running vote tallies and unreleased events must never be written to `data/`. Schemas are strict (unknown fields fail), a list of reserved private keys is rejected at any depth, open divisions may not contain ballots, and canonical bulletins cannot be dated after the current simulated date.

### Common tasks

**Advance the calendar.** Edit `data/canonical/meta.json`: `simulatedDate`, `currentWeek`, `phase`, `updatedAt`. When a term ends, set its `status` to `concluded` and the next term's to `current`, and update `currentTermId`.

**Publish the founding composition.** Add members (`members.json`), blocs (`blocs.json`, 1–60 seats each), a composition (`compositions.json`) whose seats total the Assembly size, then set `EL-T1-FOUNDING` to `certified` with `compositionId` and `results`. Record the four- or six-party variant on term `T1`.

**Fill an office.** In `offices.json`, set the term's holder entry to `status: "serving"` with `memberId` and `from`.

**File a bill.** Add `data/canonical/bills/B-T1-001.json` with category, matching threshold, sponsors, provisions and history. Assembly projects must state units, channel, reach, implementing actor, beneficiaries, duration and conditions.

**Open a vote.** Add `data/canonical/divisions/D-T1-001.json` with `status: "open"`, empty `ballots`, `result: null`, and list it in the bill's `divisionIds`; set the bill's `status` to `voting`.

**Close a vote.** Set `status: "closed"`, add one ballot per seated bloc (seat weight, vote, `castBy`, proxy) and the `result`. The validator recomputes the tally, the required figure and the outcome and rejects any disagreement. Update the bill status and history.

**Record a release.** Fill `REL-T1` (`fraction`, `releasedUnits`, `closingPool`, `channels`, decisions and bill IDs) and add `allocations.json` entries; advance allocations through `allocated → committed → reached → used` as the World Engine reports.

**Publish a bulletin.** Append to `events.json` (or add a file under `events/`). Use `[[RECORD-ID]]` to link records.

**Register a publication.** Add a record to `publications.json` (`status: "active"`) with brand theme (`broadsheet`, `broadcast` or `editorial`), fonts, colours and a logo SVG under `public/press/<slug>/`; add articles to `articles.json`. Use original names and designs — do not imitate real news organisations.

After any change: `npm run validate && npm run build`.

## Player guides

Seven orientation guides for prospective players — one per founding party and one on the sixty interest groups — are document records `data/canonical/documents/DOC-GUIDE-*.json`. They appear on the Overview page and in the Registry, and each has a printable PDF in `public/guides/`.

The PDFs are generated, not hand-made. After editing a guide (by hand or through the ChatGPT clerk), regenerate them locally and commit the result; until then the site serves the previous PDF:

```bash
npm run build
npm run guides:pdf
```

`guides:pdf` prints each guide page with a local Chrome or Edge (set `BROWSER` to choose one).

## Publishing with ChatGPT

A Custom GPT can publish records by committing to this repository through the GitHub API, with CI validating every commit before it deploys. Setup files and a step-by-step guide are in [`docs/chatgpt/`](docs/chatgpt/README.md).

## Design system

Retro government software with restrained early-2000s optimism: off-white paper, mineral greys, sage, steel blue and dark teal; compact IBM Plex type with Source Serif for official documents; thin rules, dense tables, subtle bevels and a single glossy masthead gradient. Record identifiers are always visible in monospace. Mobile layouts re-flow rather than shrink: section navigation becomes a two-row button grid, record tables become labelled cards, and record particulars move above the text. Official documents and records have print styles.

The press uses a separate layout and stylesheet so that publications never look like government communications. Each publication declares its theme, fonts and colours in data.

## Deployment

`.github/workflows/deploy.yml` validates, tests, type-checks, builds and link-checks every push and pull request, and deploys `main` to GitHub Pages. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions** once.

## Open questions for moderators

* **Two-thirds base.** The World Bible says Charter amendments need "two-thirds of the Assembly" and overrides a "two-thirds Assembly vote" without fixing whether the base is seats voting or all seats. Each division therefore records its `basis` explicitly, and both are accepted for two-thirds votes. Simple-majority and ninety-per-cent votes are fixed to seats voting, as the Bible states.
* **Party variant.** Whether four or six founding parties are used depends on final participation; all six provisional descriptions are published and term `T1` records the variant as pending.
