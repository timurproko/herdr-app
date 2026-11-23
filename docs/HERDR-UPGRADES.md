# Herdr migration proposals

Herdr App and herdr-core release independently. The migration tooling compares the
public native-updater feeds with Custom's merged review evidence; it does not
change native updates or the capability-based runtime gate.

## Sources and review boundaries

- `https://releases.herdr.dev/app/latest.json`: App version, Core minimum and
  platform archive SHA-256 values.
- `https://releases.herdr.dev/core/latest.json`: Core version, generation and
  platform archive SHA-256 values.
- Public `herdrdev/herdr-app` and `herdrdev/herdr-core` version tags resolve to
  immutable source commits. GitHub's App `/releases/latest` returns 404; GitHub
  Releases are not required. Anonymous API requests can hit rate limits; the
  workflow uses its existing read token only for fixed-origin GitHub API reads.

Planning observed App 0.1.17 / Core 0.1.22 feeds and immutable public source from
this machine. This is **not proof of network access from this repository's Actions
runner**. Publication stays disabled until a successful hosted no-write probe is
explicitly authorized. No new secret is required.

Review evidence is deliberately separate: `HOST_CONTRACT`/`HOST_PROFILES` record
public capabilities, the document adapter records App/Core document reviews,
`tools/contracts/` pins immutable source, `upstream/baselines/` records reviewed
stock-byte coverage, and native registry originals gate each optional patch.
One category's success does not grant another category's permission. Core source
hashes in `tools/contracts/herdr-core-reviewed.json` transcribe the existing
`docs/TAB-MOVE-CORE-0.1.22-REVIEW.md` review, not a new approval.

No automatic source adoption, native binary execution, deployment, Core connection,
process restart or live session test is part of this tooling. Newer capable hosts
continue working; unknown native bytes skip optional patches with advisories.
Palette styling/routing and feedback presentation can degrade pending migration.
An older owned feedback patch can be retained but is not thereby certified.

## What the compatibility report proves

Evaluation reads complete Git trees, verifies reviewed tree/blob pins, and fetches
hash-verified source blobs. Primary unified diffs contain only consumed SDK
exports and referenced types, command argument contracts, reviewed document
sources and every registry-native surface. A separate full-tree change inventory
warns about dependency, submodule, mode and scope changes outside those paths.
Command source must match the understood declaration grammar; a partial parse is
an explicit failure, never an empty successful catalog. Every consumed SDK
overload and merged declaration is preserved, including referenced types from
earlier declarations; removing one overload still creates a review delta even
when another overload leaves the function name available.

For an exact Core override, generation evidence must name the selected version.
If `core/latest.json` describes a different release, its generation is not reused:
the selected release's generation is reported unavailable and its generation
check is blocked, not falsely reported as a generation mismatch.

Each native surface compares **every** reviewed original byte-for-byte and records
both original-to-candidate and original-to-Custom hunks, using each original's
`mainByOriginal` replacement where configured. The corrected 0.1.17 feedback and
palette originals from #26, their LF/Windows CRLF byte formats, and the matching
`provenance.json` records are included. Provenance digests/lengths are checked
against the registered originals; prior binary verification is retained as
recorded evidence, not misrepresented as a new inspection of the current host.
Candidate stock hashes are marked candidate-only and cannot substitute for an installed executable's
reviewed embedded-stock provenance. Missing source, missing baseline coverage,
unknown document versions and native proof stay visible independently.

Every ordered step records passed, failed, blocked or skipped, its operation,
prerequisites, detail and complete bounded log. Independent checks continue after
failure. The tools run only this checkout's customization build and fixture/CI
suites, with credential-free child environments. They do not execute downloaded
source or a native release binary. Source API/command checks are **static**, not a
live `herdr-app commands` invocation. Synthetic tab-move tests do not establish
native CAS persistence, multi-client continuity or pixels. Those checks need a
separately authorized disposable native host.

## Local preview and agent handoff

Migration tooling uses Node 24 (the hosted test runtime); the customization build
minimum remains unchanged. `node tools/propose-herdr-upgrade.mjs --probe` performs only source/reachability
checks and writes a preview under `.artifacts/herdr-upgrade/`. Without `--probe`,
it also runs the customization build, focused fixtures and the supported CI subset.
Both modes are no-write with respect to GitHub, branches and installed files.
Optional `--app-version 0.1.17` / `--core-version 0.1.23` select exact source tags;
`--output .artifacts/my-report` selects a separate ignored output directory.
`--refresh app-0.1.17` identifies an existing proposal for a read-only refresh.
Reports bind the merged base, evaluated checkout head, candidate commits and feeds.
A default-branch evaluation is never represented as testing an agent's edited head.
The trusted evaluator reads the evaluated checkout's compatibility module and
document profile only in a credential-free, bounded subprocess. It validates the
returned contract, API/command aliases and version facts, then uses those facts
for the evaluated branch's host verdict. Trusted baseline mappings remain separate
in `baseline-compatibility.json`; `candidate-compatibility.json` includes the
actual evaluated adapter hashes. An agent's committed alias repair therefore
changes the refresh verdict without erasing historical upstream deltas. A failed
or malformed snapshot blocks dependent checks rather than substituting base
profiles. Writer code and credentials never load the proposal's adapters.
Dirty local previews are labelled and cannot be published. The publisher also
refuses stale or dirty evaluation identities.

Open the proposal's committed `upstream/migrations/<identity>/report.md`. It
contains each verdict, exact native and consumed-contract hunks, missing evidence
and a checklist naming files, reasons and check commands. The generated body and
OpenSpec scaffold remain untouched after publication; later runs add reports as
comments/artifacts. The evidence-only scaffold assumes no product behavior change.
Any actual behavioral migration needs a revised plan and appropriate spec deltas,
not an invented version-permission requirement.

After approving the proposal, ask an agent: “Continue PR <url> on its existing
branch <branch> and change <change>; read its migration report and carry out the
file-specific tasks. Preserve capability and patch safety; do not create a second
PR or merge.” The report provides the actual identifiers and continuation text.
The shared change-delivery skill remains the delivery authority.

For Crew, use `crew spawn <task-id> --project herdr-app --kind ship "<approved
continuation instruction>"`, or `crew tell <existing-task-id> "The plan is approved;
implement PR <url> on its existing branch."` for a worker already assigned to it.
Crew creates a separate task branch: continue the existing proposal using supported
task/worktree attachment, not by overwriting it from that unrelated branch. Report
an attachment blocker rather than creating another migration PR. No Crew extension,
automatic worker launch or terminal-input injection is needed.

## Hosted activation: publication is off by default

After this change is merged into the repository default branch:

1. Open **Actions → Herdr upstream sync → Run workflow** on the default branch.
   Choose **mode: probe** and leave App version, Core version and refresh empty.
   This run does not mint the delivery writer token, create a label, push a branch
   or open/comment/reopen a PR. Read its summary and retained artifact.
2. Require that run to finish successfully, including **Hosted no-write probe →
   Record successful no-write probe**. It proves hosted access to both feeds,
   immutable tags/trees, SDK/command/native blobs and the Core schema. Compatibility
   warnings or skipped native checks are not hidden by probe success.
3. Copy the numeric run ID from `/actions/runs/<id>`. In **Settings → Secrets and
   variables → Actions → Variables**, set `HERDR_UPGRADE_PROBE_RUN_ID` to that ID.
   This is a public run identifier, not a secret.
4. Reconcile any already-running migration work (#26's reviewed 0.1.17 native
   patches are already included), then set `HERDR_UPGRADE_PROPOSALS_ENABLED` to exactly `true`.
   Only now can the nightly schedule publish. For an immediate proposal, manually
   run the same default-branch workflow with **mode: publish**. Existing delivery
   App ID/key and their Contents/Pull requests write permissions are reused; no
   additional credential is needed.

Both the gate and the writer verify the successful manual default-branch probe,
its job/step result and unchanged migration workflow/tool revision against the
current default branch. Setting the enable variable alone is insufficient.
Changes to that revision require a fresh no-write probe and a new recorded run ID.
A branch that advances during evaluation is refused; rerun rather than publishing
stale results. A probe on a refresh branch or with explicit version overrides is
diagnostic only and cannot activate publication. No live probe or proposal was
started by the implementation task itself.

## Skip, freeze and reruns

The first activated publisher creates **🤖 Skip** in **this repository only** if
missing: U+1F916, one ordinary space, then `Skip`, colour `6e7781`, description
“Closing a Herdr migration proposal with this label skips that version.” It leaves
an existing label's metadata alone. This is not part of MyWorkflows' shared label
manifest, which remains limited to shared review labels. No-write runs never
create labels. Permission failures are explicit; permissions are not broadened.

To skip, apply that label and close the unmerged migration proposal. Its exact
component versions remain suppressed, not certified compatible. Later versions
remain eligible. Closure without the label also never creates a duplicate PR;
explicit manual reconsideration reopens the same PR, and asks for maintainer
branch restoration first if shared delivery deleted it. Use **mode: publish** with
an exact App/Core version override to reconsider a skipped proposal. Ordinary
manual publishing without an exact override still honors skipped proposals.

`HERDR_UPGRADE_FREEZE_UNTIL` accepts `YYYY-MM-DD` (UTC midnight) or an explicit UTC
`YYYY-MM-DDTHH:MM:SSZ` timestamp. An active freeze silences scheduled evaluation and
writes; malformed nonempty values fail closed. Manual runs visibly bypass the
schedule freeze, but never bypass hosted-probe activation. To stop publication,
set `HERDR_UPGRADE_PROPOSALS_ENABLED` to `false` or delete it; freezing also stops
the schedule. Nothing changes installed customizations or native updates.

One proposal covers a new App, a new Core, or both when neither component already
has a proposal. Existing proposals are found across all states with pagination.
If App is already represented and Core advances, only a Core proposal is added.
A newer same-component proposal comments on older open work; independent component
work is cross-linked, not falsely declared obsolete. Nothing automatically closes,
merges, marks ready, replaces a branch or rewrites a delivery checklist. Every
publishing rerun reconciles marker-deduplicated notices for existing open proposals,
so a transient failure after PR creation or while posting a notice is repaired
on retry without opening another proposal.

For a report of the agent's actual edited head, manually choose **mode: publish**
and enter its identity (for example `app-0.1.17`) in **refresh**, leaving version
overrides empty. This evaluates that branch without changing it and comments on
its existing open proposal. Refresh refuses a head that changed during evaluation.
Default scheduled reruns describe the merged base, not the agent's edited head;
their dated report comments state the exact evaluated SHAs. Unknown orphan branches
are preserved. Interrupted initial branch creation is recovered only for the exact
base and generated-only initial commit; uncertain GitHub writes fail visibly.
