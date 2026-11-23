# Proposal

## Why

Herdr App and Core can update before Custom's compatibility evidence has been reviewed, leaving the person to discover degraded customizations afterwards. A scheduled migration proposal should identify the release delta, do safe evidence collection and checks, and give an agent a precise migration task without changing update eligibility.

## What Changes

- Add scheduled and manual public-release discovery for App and Core, compared independently with existing reviewed profiles, pinned source contracts, stock baselines and native patch originals.
- Generate one draft migration proposal per candidate App/Core identity, including scoped upstream diffs, every check's passed/failed/blocked/skipped result, candidate evidence and file-specific migration actions.
- Carry over a1's report-first, continue-after-failure, skip/freeze, idempotency and agent-owned-branch protections; use Herdr's release feeds and source tags instead of npm pins and vendored-source merges.
- Add a proposed `🤖 Herdr upgrade skipped` control label, a scheduled freeze variable, supersession comments and an explicit agent/Crew handoff. The shared label manifest belongs to `timurproko/MyWorkflows`; this task will not edit that repository or apply live labels/variables.
- Preserve #21's capability gate, advisory source audits and reviewed-byte native patch skips. Do not perform the separate 0.1.17 patch rebase or adopt #23's structural transforms.

## Capabilities

### New Capabilities

- `herdr-release-migrations`: release discovery, candidate compatibility evidence and controlled draft migration proposals.

### Modified Capabilities

None. Existing customization-lifecycle runtime/update requirements remain unchanged.

## Impact

Proposed additions: `.github/workflows/herdr-upstream-sync.yml`, `tools/propose-herdr-upgrade.mjs`, `tools/herdr-upgrade-report.mjs`, focused tooling helpers/contracts and `tests/herdr-upgrade-*.test.mjs`. Reuse or narrowly extract pure checks from `tools/check-host-api.mjs` and `tools/check-tab-move.mjs`; do not change runtime permission policy. Add candidate evidence under `upstream/migrations/` and proposal-specific OpenSpec artifacts only in future robot proposals. Document sources, limits, controls and agent handoff in the README and `docs/HERDR-UPGRADES.md`, with test coverage described in `docs/TESTING.md`.

No new credential is needed beyond the delivery App ID/key and built-in GitHub token. This PR initially contains planning artifacts only; approval is required before implementation. No live migration proposal is opened by this task.
