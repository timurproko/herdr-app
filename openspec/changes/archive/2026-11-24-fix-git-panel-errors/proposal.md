# Proposal

## Why

The running coordinator Git panel retains its last frame after a render interruption, and its crew repository history reports a GitHub access refusal despite a successful explicit-repository manual read. Both faults need evidence-backed fixes without changing or restarting the live installation.

## What Changes

- Reproduce the Closed coordinator renderer with two repository sections, a section read notice, merged and closed-unmerged rows, and both historical and live-agent rows; identify the actual failing path and the merged change that introduced it before fixing it.
- Trace the exact installed history-read command and its inherited environment and working directory for crew and herdr-app, reproduce the refusal through read-only Core execution, and distinguish routing errors from genuinely inaccessible recorded PRs.
- Make per-repository GitHub reads explicit to account-routing wrappers, with no empty GH_REPO; preserve explicit credentials and never switch accounts.
- Retain truthful, section-scoped access notices identifying the refused repository and known account context without exposing credentials or inventing an account identity.
- Add packaged-renderer and command-routing regressions, then run the requested CI suite without overlapping another suite and report final-head check status.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Explicit repository routing for Git reads and actionable repository/account access refusals; reinforce complete coordinator rendering under history failures.

## Impact

Likely implementation boundaries are `src/plugins/git/mod/main.js`, `aggregate.js`, `pulls.js`, the existing Git read transport, and their packaged fixtures in `tests/`. Exact source edits depend on reproduction, not the screenshot's suspected causes. No native changes, deployment, live preference writes, process restarts, GitHub account changes, MyConfigs edits, or changes to PR #42 / fleet-attach-broken are included. This is a plan-only submission; implementation and runtime validation follow approval.
