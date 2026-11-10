# Publishing with ChatGPT

A Custom GPT ("Records Clerk") can publish records to the site by committing JSON files straight to this repository. You tell it what happened ("the vote on B-T1-001 closed — here are the blocs' votes"); it writes the files, commits them, and checks that they passed validation. GitHub Actions then rebuilds and deploys the site within a couple of minutes. You never push anything by hand.

Safety comes from the existing pipeline: every commit to `main` is validated, and **an invalid commit is never deployed** — the live site keeps the last valid version until a corrected commit passes. Every change is a normal git commit, so anything can be reviewed or reverted.

## Files in this folder

| File | Use |
| --- | --- |
| `gpt-instructions.md` | Paste into the GPT's **Instructions** field. |
| `github-action.openapi.yaml` | Action 1: commits files and reads CI results through the GitHub API (authenticated). |
| `raw-reader.openapi.yaml` | Action 2: reads any repository file at an exact commit (no authentication). |
| `../PUBLIC_DATA_CONTRACT.md` | Upload as a **Knowledge** file. |

## One-time setup (about 15 minutes)

### 1. Create a GitHub token for the GPT

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Name:** `Records Clerk GPT`. **Expiration:** your choice (90 days is sensible; you will paste a new one when it expires).
3. **Repository access:** *Only select repositories* → `The-Light-of-Other-Stars`.
4. **Repository permissions:**
   * **Contents:** Read and write
   * **Actions:** Read-only
   * (Metadata: Read-only is added automatically.)
5. Generate and copy the token. Keep it private: anyone with it can change the repository.

### 2. Create the GPT

In ChatGPT: **Explore GPTs → Create → Configure**.

1. **Name:** Records Clerk. **Description:** Publishes public records to the World Assembly Information Service.
2. **Instructions:** paste the whole of `gpt-instructions.md`.
3. **Knowledge:** upload `docs/PUBLIC_DATA_CONTRACT.md`.
4. **Capabilities:** Code Interpreter on (useful for checking vote arithmetic); web browsing off.

### 3. Add the two Actions

**Action 1 — GitHub publisher**

1. **Create new action → Authentication → API Key**.
   * **API key:** the token from step 1.
   * **Auth type:** Bearer.
2. **Schema:** paste the contents of `github-action.openapi.yaml`.
3. **Privacy policy:** `https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement`

**Action 2 — File reader**

1. **Create new action → Authentication → None**.
2. **Schema:** paste the contents of `raw-reader.openapi.yaml`.
3. **Privacy policy:** the same GitHub URL.

### 4. Keep it private and test it

* Under **Share**, keep the GPT **Only me** (or invite specific moderators). Anyone who can use it can publish to the site.
* Test with something harmless, for example: *"Read data/canonical/meta.json and tell me the current simulated date."* Then: *"Publish an official notice dated March 2040 announcing that Week 1 nominations are open."* Approve the action prompts. The GPT should report a commit SHA, a passing "Validate and build" check, and the page URL.

## Everyday use

* "Advance to Week 2 — Deliberation."
* "File bill B-T1-001: … (paste the text and particulars)."
* "Open the vote on B-T1-001; it closes 18 Dec 2026 18:00 UTC."
* "Close D-T1-001. Votes: (list each bloc). Calculate and publish the roll call."
* "Record the First Term release: 12%, split 35/30/5/30."

The GPT shows a summary before each commit unless you tell it to publish without confirming.

## If something goes wrong

* **"Validate and build" failed:** the GPT reads the error messages (they are attached to the check run) and publishes a fix. Nothing broken reaches the live site.
* **A wrong but valid change went live:** ask the GPT to correct the record, or revert the commit on GitHub (**Commits → the commit → Revert**, or `git revert <sha>`).
* **Token expired / 401 errors:** create a new token (step 1) and paste it into Action 1's authentication.
* **422 on updateBranch:** someone else committed at the same moment; the GPT retries from the latest state.

## Limits and good practice

* The token can change any file in this repository, not only `data/`. The instructions confine the GPT to `data/`, and every change is visible in the commit history — glance at it occasionally.
* Keep private moderation material (voter weights, briefs, goals) out of this GPT's chats and out of the repository entirely.
* For bulk or structural work (new page types, design changes), use a development session rather than the GPT.
