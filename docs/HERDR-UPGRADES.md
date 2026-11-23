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
