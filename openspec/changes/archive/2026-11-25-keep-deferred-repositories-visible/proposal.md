# Proposal

## Why

A quietly deferred first GitHub read currently hides an admitted coordinator repository while other repositories' rows and partial Open/Closed counts look complete. Keep that repository visible with standard Loading feedback, distinguish incomplete counts, and retain enough sanitized read evidence to identify a future refusal.

## What Changes

- Keep a verified, admitted repository's section while its task PR facts remain unknown, including queued, in-flight and quietly deferred first reads; render the existing working bulb and Loading inside the section.
- Keep unknown Open/Closed totals in the existing loading presentation (visible 0 before the first complete total), never publish successfully loaded subsets as complete totals, and preserve warm last-good rows and counts.
- Reuse the existing cooldown retry and section/scroll identities so successful retries fill the same section without a blank intermediate frame or scroll reset.
- Retain bounded, sanitized per-repository runtime read diagnostics for phase, quiet refusal and retry deadline, without diagnostic UI.
- Cover mixed-repository refusal/recovery, ordinary-panel parity, folding/reveal limits and warm retention; capture 130% disposable-instance visual proof after implementation approval.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Extend selected-tab repository visibility to unresolved admitted PRs, clarify incomplete-count and atomic-loading reveal semantics, and add non-UI repository read diagnostics.

## Impact

- Git panel only: `src/plugins/git/mod/aggregate.js`, `main.js`, `task-reveal.js`, and the shared read boundary in `pulls.js` (plus a Git-local diagnostic helper if needed).
- Focused Git/fleet regression fixtures, relevant README/development detail, and disposable native proof tooling if required.
- No new dependency, request fan-out, retry policy, rate-limit text/style, placeholder PR, whole-repository coordinator total, render-time measurement/notification or watchdog change.
- No changes to the CI monitor, plugin settings/declarations, production installation, live sessions, Crew records or other tasks' files.
