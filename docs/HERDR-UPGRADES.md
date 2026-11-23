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
an explicit failure, never an empty successful catalog.

Each native surface compares **every** reviewed original byte-for-byte and records
both original-to-candidate and original-to-Custom hunks. Candidate stock hashes
are marked candidate-only and cannot substitute for an installed executable's
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

`node tools/propose-herdr-upgrade.mjs --probe` performs only source/reachability
checks and writes a preview under `.artifacts/herdr-upgrade/`. Without `--probe`,
it also runs the customization build, focused fixtures and the supported CI subset.
Both modes are no-write with respect to GitHub, branches and installed files.
Optional `--app-version 0.1.17` / `--core-version 0.1.23` select exact source tags;
`--output .artifacts/my-report` selects a separate ignored output directory.
`--refresh app-0.1.17` identifies an existing proposal for a read-only refresh.
Reports bind the merged base, evaluated checkout head, candidate commits and feeds.
A default-branch evaluation is never represented as testing an agent's edited head.

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
